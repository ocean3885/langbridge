import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getWordById } from '@/lib/supabase/services/words';
import { generateDistractorsDeepseek } from '@/lib/generator';
import { createAdminClient } from '@/lib/supabase/admin';
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

    const { wordId, count } = await request.json();

    if (!wordId || !count) {
      return NextResponse.json({ error: '단어 ID와 생성 개수가 필요합니다.' }, { status: 400 });
    }

    const word = await getWordById(Number(wordId));
    if (!word) {
      return NextResponse.json({ error: '단어를 찾을 수 없습니다.' }, { status: 404 });
    }

    const distractors = await generateDistractorsDeepseek(word.word, count);

    if (!distractors || distractors.length === 0) {
      return NextResponse.json({ error: '혼동 어휘 생성에 실패했습니다.' }, { status: 500 });
    }

    const supabase = createAdminClient();
    const insertData = distractors.map(d => ({
      word_id: wordId,
      distractor: d.word,
      meaning_ko: d.meaning_ko,
      meaning_en: d.meaning_en
    }));

    const { data, error } = await supabase
      .from('words_distractor')
      .insert(insertData)
      .select();

    if (error) {
      throw new Error(`혼동 어휘 저장 실패: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
