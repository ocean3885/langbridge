import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { generateWordInfoDeepseek } from '@/lib/generator';
import { generateTTS } from '@/lib/tts';
import { insertWord } from '@/lib/supabase/services/words';
import { insertMapping } from '@/lib/supabase/services/word-sentence-map';
import { getStorageBucket } from '@/lib/supabase/storage';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { sentenceId, word, langCode } = await request.json();

    if (!sentenceId || !word || !langCode) {
      return NextResponse.json({ error: '필수 정보(sentenceId, word, langCode)가 누락되었습니다.' }, { status: 400 });
    }

    // 1. DeepSeek를 사용하여 단어 정보 생성
    console.log(`DeepSeek 정보를 생성합니다: ${word}`);
    const wordInfo = await generateWordInfoDeepseek(word);

    if (wordInfo.error) {
      return NextResponse.json({ error: `단어 정보 생성 실패: ${wordInfo.error}` }, { status: 500 });
    }

    // 2. TTS 생성 및 업로드
    let audioUrl: string | null = null;
    try {
      console.log(`TTS를 생성합니다: ${wordInfo.word}`);
      const fullAudioUrl = await generateTTS(wordInfo.word, 'words', langCode);
      
      // DB 저장용 상대 경로 추출
      if (fullAudioUrl && fullAudioUrl.startsWith('http')) {
        const bucket = getStorageBucket();
        const urlObj = new URL(fullAudioUrl);
        const pathParts = urlObj.pathname.split('/');
        const bucketIndex = pathParts.findIndex(p => p === bucket);
        if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
          audioUrl = decodeURIComponent(pathParts.slice(bucketIndex + 1).join('/'));
        }
      } else {
        audioUrl = fullAudioUrl;
      }
    } catch (ttsError) {
      console.error('TTS 생성 중 오류 (무시하고 계속 진행):', ttsError);
    }

    // 3. words 테이블에 단어 추가
    const wordId = await insertWord({
      word: wordInfo.word, // 원형(Lemma) 사용
      langCode,
      pos: wordInfo.pos,
      meaning_ko: wordInfo.meaning_ko as any,
      meaning_en: wordInfo.meaning_en as any,
      gender: wordInfo.gender ? wordInfo.gender.trim().toUpperCase().charAt(0) : null,
      declensions: wordInfo.declensions as any,
      conjugations: wordInfo.conjugations as any,
      audioUrl: audioUrl,
    });

    // 4. word_sentence_map 테이블에 매핑 추가
    await insertMapping({
      wordId,
      sentenceId: Number(sentenceId),
      usedAs: word, // 문장에서 실제로 사용된 형태
    });

    return NextResponse.json({ 
      success: true, 
      wordId,
      extractedWord: wordInfo.word 
    });

  } catch (error) {
    console.error('단어 등록 및 매핑 API 오류:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
