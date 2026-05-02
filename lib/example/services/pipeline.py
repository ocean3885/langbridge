from typing import List
from services.db import supabase
from services.analyzer import analyze_spanish_sentence
from services.tts import generate_and_upload_tts
from services.generator import generate_word_info, generate_words_distractor_deepseek

async def process_and_store_sentence(
    sentence_text: str, 
    translation: str, 
    bundle_id: str, 
    start_index: int = 0, 
    lang_code: str = "es"
) -> tuple[int, int]:
    """
    1. 문장을 TTS 변환 및 저장 (sentences 테이블)
    2. 문장과 기존 번들 연결 (bundle_items)
    3. 문장을 형태소 분석
    4. 각 토큰(word)을 words 테이블에 저장 및 번들 연결 (bundle_items)
    5. 문장과 단어를 word_sentence_map으로 매핑
    
    반환값: (sentence_id, next_index)
    """
    print(f"[{sentence_text}] 처리 시작 (Bundle ID: {bundle_id}, Start Index: {start_index})...")

    # 1. 문장 TTS 생성 및 sentences 테이블 저장
    sentence_audio_url = generate_and_upload_tts(sentence_text, folder="sentences", lang=lang_code)
    
    sentence_res = supabase.table("sentences").insert({
        "sentence": sentence_text,
        "translation": translation,
        "audio_url": sentence_audio_url
    }).execute()
    
    sentence_id = sentence_res.data[0]["id"]
    print(f"  - 문장 저장 완료 (ID: {sentence_id})")

    # 1.1 번들 아이템에 문장 추가
    current_index = start_index
    supabase.table("bundle_items").insert({
        "bundle_id": bundle_id,
        "sentence_id": sentence_id,
        "order_index": current_index
    }).execute()
    current_index += 1

    # 2. 문장 분석
    analyzed_tokens = analyze_spanish_sentence(sentence_text)
    
    # 3 & 4. 단어 처리 및 매핑
    for token in analyzed_tokens:
        # 구두점 등 불필요한 토큰 건너뛰기
        if not token.lemma.strip():
            continue
            
        # 불용어(Stop word) 저장 제외
        if token.is_stop:
            print(f"  - 불용어 건너뜀: {token.text}")
            continue
            
        word_lemma = token.lemma.lower()
        
        # 3. DB에 단어가 존재하는지 확인
        word_query = supabase.table("words").select("id").eq("word", word_lemma).eq("lang_code", lang_code).execute()
        
        if word_query.data:
            # 이미 존재하는 단어
            word_id = word_query.data[0]["id"]
            print(f"  - 단어 '{word_lemma}' (이미 존재, ID: {word_id})")
        else:
            # 존재하지 않는 새로운 단어 -> LLM 정보 추출 & TTS 생성 후 삽입
            print(f"  - 단어 '{word_lemma}' LLM 정보 추출 중...")
            llm_info = await generate_word_info(word_lemma)

            # 유효하지 않은 단어(할루시네이션 등) 필터링
            if llm_info.get("error") == "invalid_word" or not llm_info.get("meaning"):
                print(f"  - ⚠️ 유효하지 않은 단어로 판명되어 건너끕니다: {word_lemma}")
                continue
            
            word_audio_url = generate_and_upload_tts(word_lemma, folder="words", lang=lang_code)
            
            word_res = supabase.table("words").insert({
                "word": word_lemma,
                "lang_code": lang_code,
                "pos": llm_info.get("pos", [token.pos] if token.pos else []),
                "meaning": llm_info.get("meaning", {}), 
                "gender": llm_info.get("gender"),
                "declensions": llm_info.get("declensions", {}),
                "conjugations": llm_info.get("conjugations", {}),
                "audio_url": word_audio_url
            }).execute()
            
            word_id = word_res.data[0]["id"]
            print(f"  - 단어 '{word_lemma}' (신규 저장, ID: {word_id})")
            
        # 4. word_sentence_map 연결 정보 저장
        supabase.table("word_sentence_map").insert({
            "word_id": word_id,
            "sentence_id": sentence_id,
            "used_as": token.text,
            "pos_key": token.pos,
            "grammar_info": token.morph
        }).execute()

        # 5. 번들 아이템에 단어 추가
        supabase.table("bundle_items").insert({
            "bundle_id": bundle_id,
            "word_id": word_id,
            "order_index": current_index
        }).execute()
        current_index += 1
        
    print(f"[{sentence_text}] 처리 완료! (Next Index: {current_index})\n")
    return sentence_id, current_index


async def process_distractors(limit: int = 100):
    """
    오답 단어(Distractors)가 없는 단어들을 찾아 LLM으로 생성하고 저장합니다.
    RPC를 사용하여 성능을 최적화하고 Batch Insert를 적용합니다.
    """
    print(f"오답 단어 생성 프로세스 시작 (Limit: {limit})...")
    
    # 1. RPC를 통해 오답 단어가 없는 단어만 조회
    try:
        words_response = supabase.rpc("get_words_without_distractors", {"limit_count": limit}).execute()
    except Exception as e:
        print(f"RPC 호출 실패: {e}")
        return

    if not words_response.data:
        print("모든 단어에 오답 단어가 이미 존재합니다.")
        return

    for item in words_response.data:
        word_id = item['id']
        word_text = item['word']
        
        print(f"  - '{word_text}' (ID: {word_id}) 오답 단어 생성 중...")
        
        # 2. 제너레이터 실행 (Async)
        distractors = await generate_words_distractor_deepseek(word_text)
        
        if not distractors:
            print(f"    ⚠️ '{word_text}'에 대한 오답 단어 생성 실패")
            continue
            
        # 3. DB Batch Insert (한 단어에 대한 모든 오답을 한 번에 삽입)
        insert_data = []
        for d in distractors:
            insert_data.append({
                "word_id": word_id,
                "distractor": d.get("word"),
                "meaning_ko": d.get("meaning")
            })
            
        if insert_data:
            try:
                supabase.table("words_distractor").insert(insert_data).execute()
                print(f"    ✅ '{word_text}' 오답 단어 {len(insert_data)}개 저장 완료")
            except Exception as e:
                print(f"    ❌ '{word_text}' 저장 실패: {e}")

    print("오답 단어 생성 프로세스 완료.")