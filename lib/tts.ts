'use server';

import { createAdminClient } from './supabase/admin';
import { getStorageBucket } from './supabase/storage';
import { ACTIVE_LANGUAGE } from './utils';

function createAudioFileName(folder: string, text: string) {
  const id = crypto.randomUUID();

  if (folder !== 'words') {
    const sentenceFolder = folder === 'sentences' ? 'sentences/standalone' : folder;
    return `${sentenceFolder}/${id}.mp3`;
  }

  const wordPrefix = text
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const firstChar = wordPrefix.charAt(0);
  const subFolder = /^[a-z]$/.test(firstChar)
    ? firstChar
    : /^[0-9]$/.test(firstChar)
      ? '0-9'
      : 'misc';

  return `${folder}/${subFolder}/${wordPrefix || 'word'}-${id}.mp3`;
}

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
  lang: string = ACTIVE_LANGUAGE,
  speakingRate: number = 0.8,
  options?: {
    provider?: 'google' | 'elevenlabs';
    model?: string;
    voice?: string;
    speed?: number;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  }
): Promise<string | null> {
  if (!text) return null;

  try {
    let audioBuffer: Buffer;

    const provider = options?.provider || 'elevenlabs';

    if (provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error('ELEVENLABS_API_KEY가 설정되지 않았습니다.');
      
      const voiceId = options?.voice || '2Lb1en5ujrODDIqmp7F3';
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: options?.model || 'eleven_multilingual_v2',
            voice_settings: {
              stability: options?.stability ?? 0.5,
              similarity_boost: options?.similarityBoost ?? 0.75,
              style: options?.style ?? 0,
              use_speaker_boost: options?.useSpeakerBoost ?? true,
              speed: options?.speed ?? speakingRate,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`ElevenLabs API 오류: ${errorData}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } else {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API 키(GOOGLE_API_KEY)가 설정되지 않았습니다.');

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: lang,
              name: options?.voice || (lang.includes('es') ? (lang === 'es' ? 'es-ES-Standard-A' : `${lang}-Standard-A`) : undefined)
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: options?.speed || speakingRate
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google TTS API 오류: ${JSON.stringify(errorData)}`);
      }

      const { audioContent } = await response.json();
      audioBuffer = Buffer.from(audioContent, 'base64');
    }

    // 2. Supabase 스토리지 업로드
    const supabase = createAdminClient();
    const bucketName = getStorageBucket();
    const fileName = createAudioFileName(folder, text);

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
