from fastapi import FastAPI, HTTPException, BackgroundTasks
from schemas.models import StoreSentencesRequest
from services.pipeline import process_and_store_sentence, process_distractors

app = FastAPI(
    title="LingoGen API",
    description="LLM 기반 스페인어 학습 자료 자동 생성 및 파이프라인 API",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"message": "Welcome to LingoGen API"}

@app.post("/store-sentences")
async def store_sentences(request: StoreSentencesRequest):
    """
    여러 문장을 전달받아 하나의 번들로 묶고 순차적으로 파이프라인을 실행합니다.
    """
    from services.db import supabase
    from services.pipeline import process_and_store_sentence
    
    # 1. 모든 문장을 담을 공통 번들 생성
    # 첫 번째 문장의 일부를 제목으로 사용합니다.
    default_title = f"Bundle: {request.items[0].sentence[:20]}..." if request.items else "New Learning Bundle"
    bundle_res = supabase.table("bundle").insert({
        "title": default_title,
        "description": f"총 {len(request.items)}개의 문장이 포함된 자동 생성 번들",
        "is_published": False
    }).execute()
    bundle_id = bundle_res.data[0]["id"]
    
    results = []
    current_index = 0  # 번들 내 아이템 순서를 관리하기 위한 카운터
    
    for item in request.items:
        try:
            # 파이프라인 실행 시 bundle_id와 현재 인덱스 전달
            sentence_id, next_index = await process_and_store_sentence(
                item.sentence, 
                item.translation, 
                bundle_id=bundle_id, 
                start_index=current_index
            )
            
            results.append({
                "sentence": item.sentence,
                "status": "success",
                "sentence_id": sentence_id
            })
            
            # 다음 문장은 이전 인덱스 이후부터 시작하도록 업데이트
            current_index = next_index
            
        except Exception as e:
            results.append({
                "sentence": item.sentence,
                "status": "error",
                "message": str(e)
            })
    
    return {
        "bundle_id": bundle_id,
        "results": results
    }


@app.get("/sync-distractors")
async def sync_distractors(background_tasks: BackgroundTasks):
    # 백그라운드에서 실행되도록 설정
    background_tasks.add_task(process_distractors)
    return {"message": "Distractor generation started in background."}