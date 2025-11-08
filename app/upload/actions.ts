"use server";

import { createClient } from '@/lib/supabase/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { redirect } from 'next/navigation';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { execa } from 'execa';

// 시스템 ffmpeg, ffprobe 사용 (dev container 환경)
const ffmpeg = 'ffmpeg';
const ffprobe = 'ffprobe';

// 1. Google TTS 클라이언트 초기화
function getGoogleTTSClient() {
  const credsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!credsBase64) {
    throw new Error("GOOGLE_CREDENTIALS_BASE64 환경 변수가 설정되지 않았습니다. README를 참조하여 Google Cloud TTS를 설정하세요.");
  }

  try {
    const credsJson = Buffer.from(credsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credsJson);
    return new TextToSpeechClient({ credentials });
  } catch {
    throw new Error("Google 인증 정보가 잘못되었습니다. GOOGLE_CREDENTIALS_BASE64 환경 변수를 확인하세요.");
  }
}

// 2. TTS 생성 함수
async function generateTTS(client: TextToSpeechClient, text: string, lang: string) {
  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode: lang, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 0.8 },
  });
  return response.audioContent as Buffer;
}

// ✅ ffmpeg: 무음 파일 생성
async function createSilence(outputPath: string, seconds: number) {
  await execa(ffmpeg, [
    "-f", "lavfi",
    "-i", `anullsrc=r=44100:cl=mono`,
    "-t", String(seconds),
    "-q:a", "9",
    "-acodec", "libmp3lame",
    outputPath
  ]);
}

// ✅ ffmpeg: 오디오 여러 개 병합
async function concatAudio(inputs: string[], outputPath: string) {
  const tmpList = inputs.map(p => `file '${p}'`).join("\n");
  const listFile = outputPath + "_list.txt";
  await fs.writeFile(listFile, tmpList);

  await execa(ffmpeg, [
    "-f", "concat",
    "-safe", "0",
    "-i", listFile,
    "-c", "copy",
    outputPath,
  ]);

  await fs.unlink(listFile);
}

// ✅ ffprobe: duration 가져오기
async function getDurationMs(filePath: string) {
  const { stdout } = await execa(ffprobe, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath
  ]);
  return parseFloat(stdout) * 1000;
}

// ------------------------------
// 3. 메인 액션
// ------------------------------
export async function processFileAction(formData: FormData) {
  const supabase = await createClient();

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/auth');

  const title = formData.get('title') as string;
  const categoryId = formData.get('category') as string;
  const file = formData.get('input_file') as File;

  if (!file || file.size === 0) throw new Error("파일이 없습니다.");

  const fileContent = await file.text();
  const lines = fileContent.split('\n').map(l => l.trim()).filter(Boolean);

  const sentencePairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    sentencePairs.push({ text: lines[i], translation: lines[i + 1] });
  }

  const ttsClient = getGoogleTTSClient();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'langbridge-'));

  const sync_data = [];
  let current_time_ms = 0;
  const concatList: string[] = [];

  const silence1 = path.join(tempDir, 'silence1.mp3');
  const silence2 = path.join(tempDir, 'silence2.mp3');

  // ✅ 최초 한번 공백 파일 생성
  await createSilence(silence1, 1);
  await createSilence(silence2, 2);

  try {
    for (let i = 0; i < sentencePairs.length; i++) {
      const pair = sentencePairs[i];

      // 1) TTS 생성
      const audioBuf = await generateTTS(ttsClient, pair.text, 'es-ES');
      const clipPath = path.join(tempDir, `clip_${i}.mp3`);
      await fs.writeFile(clipPath, audioBuf);

      // 2) [1초 무음 + clip] ×3 + 1초 무음
      const repeatedPath = path.join(tempDir, `repeat_${i}.mp3`);
      const parts = [
        silence1, clipPath,
        silence1, clipPath,
        silence1, clipPath,
        silence1
      ];
      await concatAudio(parts, repeatedPath);

      // 3) 길이 계산
      const duration = await getDurationMs(repeatedPath);
      const start = current_time_ms / 1000;
      const end = (current_time_ms + duration) / 1000;

      sync_data.push({
        text: pair.text,
        translation: pair.translation,
        start,
        end
      });

      concatList.push(repeatedPath);
      current_time_ms += duration;

      // 4) 문장 사이 2초 무음
      if (i < sentencePairs.length - 1) {
        concatList.push(silence2);
        current_time_ms += 2000;
      }
    }

    // 최종 오디오 병합
    const finalAudioPath = path.join(tempDir, 'final.mp3');
    await concatAudio(concatList, finalAudioPath);

    // Supabase 업로드
    const finalBuf = await fs.readFile(finalAudioPath);
    const storagePath = `public/${user.id}/${Date.now()}-final.mp3`;

    const { error: upErr } = await supabase.storage
      .from('kdryuls_automaking')
      .upload(storagePath, finalBuf, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (upErr) throw upErr;

    // DB 저장
    const { data: audioObj, error: dbErr } = await supabase
      .from('lang_audio_content')
      .insert({
        user_id: user.id,
        title,
        category_id: categoryId ? parseInt(categoryId) : null,
        original_text: sentencePairs.map(s => s.text).join('\n'),
        translated_text: sentencePairs.map(s => s.translation).join('\n'),
        sync_data,
        audio_file_path: storagePath,
      })
      .select('id')
      .single();

    if (dbErr) throw dbErr;

    await fs.rm(tempDir, { recursive: true, force: true });

    return redirect(`/player/${audioObj.id}`);

  } catch (err) {
    console.error('업로드 처리 중 오류:', err);
    await fs.rm(tempDir, { recursive: true, force: true });
    
    const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
    throw new Error(`오류 발생: ${errorMessage}`);
  }
}
