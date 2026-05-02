import spacy
from typing import List
from schemas.models import AnalyzedToken, AnalysisResponse

# 이미 설치된 es_core_news_lg 모델 로드
try:
    nlp = spacy.load("es_core_news_lg")
except OSError:
    # 혹시 모를 로드 실패를 대비해 경고만 출력 (사용자 확인 기반)
    print("WARNING: es_core_news_lg 모델을 로드할 수 없습니다. 설치 여부를 다시 확인해주세요.")
    nlp = None

# spaCy 모델의 특정 오류(예: estár, ír)를 보정하기 위한 매핑 테이블
LEMMA_CORRECTIONS = {
    "estár": "estar",
    "ír": "ir"
}

def analyze_spanish_sentence(sentence: str) -> List[AnalyzedToken]:
    """
    단일 문장을 분석합니다.
    """
    if not nlp:
        raise RuntimeError("spaCy 모델이 로드되지 않았습니다.")
    
    # [수정] 문장 시작이 대문자인 경우 고유명사(PROPN)로 오인하는 문제를 방지하기 위해 
    # 첫 글자만 소문자로 변환하여 분석합니다. (단, 전체가 대문자인 경우는 제외)
    processed_sentence = sentence
    if sentence and sentence[0].isupper() and not sentence.isupper():
        processed_sentence = sentence[0].lower() + sentence[1:]
        
    doc = nlp(processed_sentence)
    analyzed_tokens = []
    
    for i, token in enumerate(doc):
        if token.is_punct or token.is_space:
            continue
            
        # [수정] 특정 동사 원형의 악센트 오류(예: estár -> estar) 보정
        lemma = token.lemma_
        if lemma in LEMMA_CORRECTIONS:
            lemma = LEMMA_CORRECTIONS[lemma]
            
        # [수정] 첫 글자를 소문자로 변환해 분석했으므로, 결과물(text)은 원문의 케이스를 유지하도록 복원
        token_text = token.text
        if i == 0 and sentence and sentence[0].isupper() and not sentence.isupper():
            token_text = sentence[0] + token_text[1:]

        analyzed_tokens.append(
            AnalyzedToken(
                text=token_text,
                lemma=lemma,
                pos=token.pos_,
                morph=token.morph.to_dict(),
                is_stop=token.is_stop
            )
        )
    return analyzed_tokens

def analyze_sentences(sentences: List[str]) -> List[AnalysisResponse]:
    """
    문장 리스트를 받아서 각 문장별 분석 결과를 반환합니다.
    """
    results = []
    for s in sentences:
        tokens = analyze_spanish_sentence(s)
        results.append(AnalysisResponse(sentence=s, tokens=tokens))
    return results
