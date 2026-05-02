import google.generativeai as genai
import json
import os
import httpx
from dotenv import load_dotenv
from config import settings

load_dotenv(dotenv_path=".env.local")

genai.configure(api_key=settings.gemini_api_key)
model = genai.GenerativeModel(
    model_name='gemini-2.5-flash',
    system_instruction="당신은 스페인어 교육 전문가입니다. 모든 응답은 약속된 JSON 구조와 콤팩트 키값을 엄격히 준수해야 합니다."
)

async def generate_word_info(word: str) -> dict:
    """
    단어의 품사, 뜻, 성별, 시제/성수 변화 등 상세 문법 정보를 Gemini API를 통해 가져옵니다.
    """
    prompt = f"""
1. 역할 정의 (Persona)
당신은 전문 스페인어 언어학자이자 교육용 콘텐츠 데이터 설계자입니다. 사용자가 스페인어 단어(Topic)를 제시하면, 이를 기반으로 스페인어 학습을 위한 상세 단어 데이터를 생성합니다. 당신의 출력물은 FastAPI 서버를 거쳐 관계형 데이터베이스(Supabase)에 저장되므로, 데이터의 무결성과 형식 준수가 무엇보다 중요합니다.

현재 분석할 단어(Topic): '{word}'

2. 출력 규칙 (Strict Output Rules)
형식: 반드시 순수한 JSON 코드 블록 하나만 출력하세요. 인사말이나 부연 설명은 절대 금지합니다.
언어: 단어 뜻은 한국어로 작성합니다.
무결성: 모든 동사는 지정된 6개 시제 변화를 반드시 포함해야 하며, 명사/형용사는 4가지 성수 변화를 포함해야 합니다.

3. 데이터 구조 가이드라인 (Data Structure)
다음 JSON 구조를 엄격히 따르세요:
word: 스페인어 원형(Lemma)을 적습니다.
pos: 리스트 형식으로 품사를 지정합니다 (예: ["VERB"], ["NOUN", "ADJ"]).
meaning: 품사를 키로 하는 사전형 정의를 제공합니다.
gender: 성별을 나타냅니다. 남성은 "m", 여성은 "f", 공통은 "mf", 해당 없으면 null을 사용합니다.
conjugations: 동사(VERB)인 경우에만 포함합니다. pres, pret, impf, futr, cond, perf 6개 키와 각 시제 내부의 s1, s2, s3, p1, p2, p3 키를 누락 없이 작성합니다.
declensions: 명사나 형용사인 경우에만 포함합니다. ms, mp, fs, fp 키를 사용합니다.

4. 제약 사항 (Constraints)
만약 제시된 단어가 스페인어가 아니거나, 존재하지 않는 무의미한 단어인 경우 모든 필드를 null로 채우거나 {{"error": "invalid_word"}}와 같은 약속된 에러 구조를 반환하세요.
지어내지 마세요(Do not hallucinate). 모르는 단어라면 솔직하게 데이터가 없음을 나타내야 합니다.
존재하지 않는 키를 만들지 마세요.
JSON 문법(쉼표, 중괄호 등) 오류가 없어야 합니다.
    """
    
    try:
        import json
        response = await model.generate_content_async(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        word_data = json.loads(text.strip())
        return word_data
    except Exception as e:
        print(f"단어 정보 생성 실패 ({word}): {e}")
        # 실패 시 기본 구조 반환
        return {
            "word": word,
            "pos": [],
            "meaning": {},
            "gender": None,
            "conjugations": {},
            "declensions": {}
        }



DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

if not DEEPSEEK_API_KEY:
    print("Warning: DEEPSEEK_API_KEY is not set in environment variables.")

async def generate_words_distractor_deepseek(word: str) -> list:
    """
    제시된 단어와 의미가 유사하거나 스펠링이 유사하여 헷갈릴 수 있는 오답 단어(Distractors)를 생성합니다.
    """
    prompt = f"""
당신은 스페인어 교육 전문가입니다. 학습자가 제시된 단어 '{word}'의 뜻을 맞히는 4지선다형 퀴즈를 풀 때, 헷갈릴 만한 오답 단어(Distractors) 6개를 생성해야 합니다.

오답 단어 선정 기준:
1. '{word}'와 철자가 유사하여 시각적으로 혼동을 주는 단어 2개
2. '{word}'와 의미가 비슷하여 개념적으로 혼동을 주는 단어(유의어) 2개
3. '{word}'와 같은 범주에 속하지만 뜻이 다른 단어 2개

출력 형식:
반드시 다음 구조의 JSON 리스트 형식으로만 출력하세요. (총 6개)
[
  {{"word": "오답단어1", "meaning": "오답단어1의 뜻"}},
  {{"word": "오답단어2", "meaning": "오답단어2의 뜻"}},
  {{"word": "오답단어3", "meaning": "오답단어3의 뜻"}},
  {{"word": "오답단어4", "meaning": "오답단어4의 뜻"}},
  {{"word": "오답단어5", "meaning": "오답단어5의 뜻"}},
  {{"word": "오답단어6", "meaning": "오답단어6의 뜻"}}
]

주의사항:
- 뜻은 반드시 한국어로 작성하세요.
- 인사말이나 설명 없이 오직 JSON 데이터만 반환하세요.
"""

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "당신은 스페인어 교육 전문가입니다. 오답 단어 생성 시 학습자의 혼동을 유발할 수 있는 정교한 단어를 선택하세요."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(DEEPSEEK_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # DeepSeek이 JSON 객체로 감싸서 줄 수 있으므로 리스트 추출 시도
            data = json.loads(content)
            if isinstance(data, dict):
                # 만약 {"distractors": [...]} 형태 등으로 오면 리스트만 추출
                for val in data.values():
                    if isinstance(val, list):
                        return val
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"오답 단어 생성 실패 ({word}): {e}")
        return []

async def generate_word_info_deepseek(word: str) -> dict:
    """
    DEEPSEEK API를 사용하여 단어 정보를 생성합니다. (기존 generator.py의 prompt 활용)
    """
    prompt = f"""
1. 역할 정의 (Persona)
당신은 전문 스페인어 언어학자이자 교육용 콘텐츠 데이터 설계자입니다. 사용자가 스페인어 단어(Topic)를 제시하면, 이를 기반으로 스페인어 학습을 위한 상세 단어 데이터를 생성합니다. 당신의 출력물은 FastAPI 서버를 거쳐 관계형 데이터베이스(Supabase)에 저장되므로, 데이터의 무결성과 형식 준수가 무엇보다 중요합니다.

현재 분석할 단어(Topic): '{word}'

2. 출력 규칙 (Strict Output Rules)
형식: 반드시 순수한 JSON 코드 블록 하나만 출력하세요. 인사말이나 부연 설명은 절대 금지합니다.
언어: 단어 뜻은 한국어로 작성합니다.
무결성: 모든 동사는 지정된 6개 시제 변화를 반드시 포함해야 하며, 명사/형용사는 4가지 성수 변화를 포함해야 합니다.

3. 데이터 구조 가이드라인 (Data Structure)
다음 JSON 구조를 엄격히 따르세요:
word: 반드시 스페인어 사전적 원형(Lemma)을 적습니다. (예: 'fui' 입력 시 'ir', 'casas' 입력 시 'casa')
pos: 리스트 형식으로 품사를 지정합니다 (예: ["VERB"], ["NOUN", "ADJ"]).
meaning: 품사를 키로 하는 사전형 정의를 제공합니다.
gender: 성별을 나타냅니다. 남성은 "m", 여성은 "f", 공통은 "mf", 해당 없으면 null을 사용합니다.
conjugations: 동사(VERB)인 경우에만 포함합니다. pres, pret, impf, futr, cond, perf 6개 키와 각 시제 내부의 s1, s2, s3, p1, p2, p3 키를 누락 없이 작성합니다.
declensions: 명사나 형용사인 경우에만 포함합니다. ms, mp, fs, fp 키를 사용합니다.

4. 제약 사항 (Constraints)
사용자가 어떤 활용형을 입력하더라도 'word' 필드에는 반드시 그 단어의 사전적 기본형을 반환해야 합니다.
만약 제시된 단어가 스페인어가 아니거나, 존재하지 않는 무의미한 단어인 경우 모든 필드를 null로 채우거나 {{"error": "invalid_word"}}와 같은 약속된 에러 구조를 반환하세요.
지어내지 마세요(Do not hallucinate). 모르는 단어라면 솔직하게 데이터가 없음을 나타내야 합니다.
존재하지 않는 키를 만들지 마세요.
JSON 문법(쉼표, 중괄호 등) 오류가 없어야 합니다.
    """

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "당신은 스페인어 교육 전문가입니다. 모든 응답은 약속된 JSON 구조와 콤팩트 키값을 엄격히 준수해야 합니다."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(DEEPSEEK_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            content = result['choices'][0]['message']['content']
            return json.loads(content)
    except Exception as e:
        print(f"Error for {word}: {e}")
        return {"error": str(e)}