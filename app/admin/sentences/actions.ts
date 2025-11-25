"use server";

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execa } from 'execa';

// 시스템 ffmpeg 사용
const ffmpeg = 'ffmpeg';

// Google TTS 클라이언트 초기화
function getGoogleTTSClient() {
  const credsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!credsBase64) {
    throw new Error("GOOGLE_CREDENTIALS_BASE64 환경 변수가 설정되지 않았습니다.");
  }

  try {
    const credsJson = Buffer.from(credsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credsJson);
    return new TextToSpeechClient({ credentials });
  } catch {
    throw new Error("Google 인증 정보가 잘못되었습니다.");
  }
}

// TTS 생성 함수
async function generateTTS(client: TextToSpeechClient, text: string, languageCode: string) {
  // 언어 코드를 TTS 형식으로 변환 (예: 'es' -> 'es-ES', 'en' -> 'en-US')
  const languageCodeMap: Record<string, string> = {
    'es': 'es-ES',
    'en': 'en-US',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'zh': 'zh-CN',
  };

  const ttsLanguageCode = languageCodeMap[languageCode] || languageCode;

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode: ttsLanguageCode, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 0.8 },
  });
  return response.audioContent as Buffer;
}

// MP3 파라미터 정규화
async function normalizeMp3(inputPath: string, outputPath: string) {
  await execa(ffmpeg, [
    "-i", inputPath,
    "-ar", "44100",
    "-ac", "1",
    "-c:a", "libmp3lame",
    "-q:a", "2",
    outputPath,
  ]);
}

interface GenerateSentenceAudioParams {
  text: string;
  languageCode: string;
  sentenceId?: number;
}

export async function generateSentenceAudio({ text, languageCode, sentenceId }: GenerateSentenceAudioParams) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 운영자 확인
    const admin = createAdminClient();
    const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
      user_id: user.id
    });

    if (!isSuperAdmin) {
      return { success: false, error: '권한이 없습니다.' };
    }

    const ttsClient = getGoogleTTSClient();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sentence-tts-'));

    try {
      // TTS 생성
      const audioBuf = await generateTTS(ttsClient, text, languageCode);
      const rawPath = path.join(tempDir, 'raw.mp3');
      const normalizedPath = path.join(tempDir, 'normalized.mp3');
      
      await fs.writeFile(rawPath, audioBuf);
      await normalizeMp3(rawPath, normalizedPath);

      // Supabase Storage에 업로드
      const finalBuf = await fs.readFile(normalizedPath);
      const timestamp = Date.now();
      const fileName = sentenceId 
        ? `sentence_${sentenceId}_${timestamp}.mp3`
        : `sentence_${timestamp}.mp3`;
      const storagePath = `sentences/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kdryuls_automaking')
        .upload(storagePath, finalBuf, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage 업로드 오류:', uploadError);
        return { success: false, error: '오디오 업로드에 실패했습니다.' };
      }

      // Private storage이므로 storage path만 반환 (signed URL은 필요 시 생성)
      return { 
        success: true, 
        audioPath: storagePath,
        storagePath 
      };

    } finally {
      // 임시 파일 정리
      await fs.rm(tempDir, { recursive: true, force: true });
    }

  } catch (error) {
    console.error('TTS 생성 오류:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '오디오 생성 중 오류가 발생했습니다.' 
    };
  }
}
