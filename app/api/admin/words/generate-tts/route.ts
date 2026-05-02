import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { generateTTS } from '@/lib/tts';
import { updateWord } from '@/lib/supabase/services/words';
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

    const { wordId, text, langCode, audio_url } = await request.json();

    if (!wordId || !text || !langCode) {
      return NextResponse.json({ error: '필수 정보(wordId, text, langCode)가 누락되었습니다.' }, { status: 400 });
    }

    // 1. TTS 생성 및 업로드 (항상 새로 생성)
    console.log(`TTS를 생성합니다: ${text} (${langCode})`);
    let finalAudioUrl = await generateTTS(text, 'words', langCode);

    if (!finalAudioUrl) {
      return NextResponse.json({ error: 'TTS 생성 실패' }, { status: 500 });
    }

    // 2. DB 저장용 상대 경로 추출 (URL인 경우)
    let storagePath = finalAudioUrl;
    if (finalAudioUrl.startsWith('http')) {
      try {
        const bucket = getStorageBucket();
        const urlObj = new URL(finalAudioUrl);
        const pathParts = urlObj.pathname.split('/');
        const bucketIndex = pathParts.findIndex(p => p === bucket);
        if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
          storagePath = decodeURIComponent(pathParts.slice(bucketIndex + 1).join('/'));
        }
      } catch (e) {
        console.error('URL 파싱 실패, 원본 사용:', e);
      }
    }

    // 3. words 테이블 업데이트
    await updateWord(Number(wordId), {
      audioUrl: storagePath
    });

    return NextResponse.json({ 
      success: true, 
      audio_url: storagePath 
    });

  } catch (error) {
    console.error('단어 TTS 생성 API 오류:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
