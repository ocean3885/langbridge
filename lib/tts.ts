import { createAdminClient } from './supabase/admin';
import { getStorageBucket } from './supabase/storage';
import { ACTIVE_LANGUAGE } from './utils';

/**
 * Google Cloud Text-to-Speech를 사용하여 음성을 생성하고 Supabase Storage에 업로드합니다.
 * @param text 음성으로 변환할 텍스트
 * @param folder 저장할 스토리지 폴더 (기본값: 'sentences')
 * @param lang 언어 코드 (기본값: ACTIVE_LANGUAGE)
 * @returns 업로드된 파일의 공개 URL 또는 null
 */
export async function generateTTS(
  text: string,
  folder: string = 'sentences',
  lang: string = ACTIVE_LANGUAGE
): Promise<string | null> {
  if (!text) return null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return null;
    }

    // 1. Google TTS API 호출 (REST 방식)
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: lang,
            // 스페인어인 경우 표준 여성 목소리 사용 (예: es-ES-Standard-A)
            name: lang.includes('es') ? (lang === 'es' ? 'es-ES-Standard-A' : `${lang}-Standard-A`) : undefined
          },
          audioConfig: { audioEncoding: 'MP3' }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google TTS API 오류: ${JSON.stringify(errorData)}`);
    }

    const { audioContent } = await response.json();
    const audioBuffer = Buffer.from(audioContent, 'base64');

    // 2. Supabase 스토리지 업로드
    const supabase = createAdminClient();
    const bucketName = getStorageBucket();
    const fileName = `${folder}/${crypto.randomUUID()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Supabase 업로드 오류: ${uploadError.message}`);
    }

    // 3. 공개 URL 반환
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('TTS 생성 또는 업로드 중 오류 발생:', error);
    return null;
  }
}
