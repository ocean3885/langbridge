import os
import uuid
import tempfile
from gtts import gTTS
from services.db import supabase

# 버킷 이름 (기본값 audio)
# Supabase에 'audio'라는 공개 스토리지 버킷이 생성되어 있어야 합니다.
STORAGE_BUCKET = "langbridge"

def generate_and_upload_tts(text: str, folder: str = "general", lang: str = "es") -> str:
    """
    텍스트를 음성으로 변환(TTS)하고 Supabase 스토리지에 업로드한 후 공개 URL을 반환합니다.
    """
    if not text:
        return None

    # 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as fp:
        temp_path = fp.name

    try:
        # TTS 생성
        tts = gTTS(text=text, lang=lang)
        tts.save(temp_path)

        # 파일명 생성 (예: sentences/uuid.mp3)
        file_name = f"{folder}/{uuid.uuid4()}.mp3"

        # Supabase 스토리지 업로드
        with open(temp_path, "rb") as f:
            res = supabase.storage.from_(STORAGE_BUCKET).upload(
                file_name, 
                f, 
                file_options={"content-type": "audio/mpeg"}
            )
        
        # 공개 URL 반환
        public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(file_name)
        return public_url
    except Exception as e:
        print(f"TTS 생성 또는 업로드 중 오류 발생: {e}")
        return None
    finally:
        # 임시 파일 삭제
        if os.path.exists(temp_path):
            os.remove(temp_path)
