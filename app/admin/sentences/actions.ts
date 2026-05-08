"use server";

import { createClient } from '@/lib/supabase/server';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getStorageBucket } from '@/lib/supabase/storage';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execa } from 'execa';

// 시스템 ffmpeg 사용
const ffmpeg = 'ffmpeg';

// TTS 생성 함수 (ElevenLabs API 사용)
async function generateTTS(text: string, languageCode: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY 환경 변수가 설정되지 않았습니다.");
  }

  // 기본 목소리 설정 (Rachel)
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; 

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2', // 다국어 지원 모델
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API 오류: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
    const storageBucket = getStorageBucket();

    // 인증 확인
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 운영자 확인
    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return { success: false, error: '권한이 없습니다.' };
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sentence-tts-'));

    try {
      // TTS 생성
      const audioBuf = await generateTTS(text, languageCode);
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
        .from(storageBucket)
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
