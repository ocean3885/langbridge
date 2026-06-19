import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getWordById } from '@/lib/supabase/services/words';
import { generateDistractorsDeepseek } from '@/lib/generator';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatWordMeaning } from '@/lib/word-meaning';
import { NextRequest, NextResponse } from 'next/server';

const TARGET_DISTRACTOR_COUNT = 6;

export async function POST(request: NextRequest) {
  let batchId = '';
  let wordId = 0;
  let sourceSnapshot: Record<string, unknown> = {};

  try {
    const user = await getAppUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
    if (!isAdminUser) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    batchId = typeof body.batchId === 'string' ? body.batchId : '';
    wordId = Number(body.wordId);
    const count = Number(body.count);

    if (!batchId || !Number.isInteger(wordId) || wordId <= 0 || count !== TARGET_DISTRACTOR_COUNT) {
      return NextResponse.json(
        { error: `생성 배치, 단어 ID와 생성 개수 ${TARGET_DISTRACTOR_COUNT}개가 필요합니다.` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: batch, error: batchError } = await supabase
      .from('distractor_generation_batches')
      .select('id, status, created_by')
      .eq('id', batchId)
      .maybeSingle();

    if (batchError) throw new Error(`생성 배치 조회 실패: ${batchError.message}`);
    if (!batch || batch.created_by !== user.id || batch.status !== 'generating') {
      return NextResponse.json({ error: '진행 중인 생성 배치를 찾을 수 없습니다.' }, { status: 409 });
    }

    const word = await getWordById(wordId);
    if (!word) {
      return NextResponse.json({ error: '단어를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: existingDistractors, error: existingError } = await supabase
      .from('words_distractor')
      .select('id, distractor, meaning_ko, meaning_en')
      .eq('word_id', wordId)
      .order('id', { ascending: true });

    if (existingError) {
      throw new Error(`기존 오답 조회 실패: ${existingError.message}`);
    }
    if ((existingDistractors?.length ?? 0) >= TARGET_DISTRACTOR_COUNT) {
      throw new Error(`이미 오답이 ${TARGET_DISTRACTOR_COUNT}개 이상 등록된 단어입니다.`);
    }

    sourceSnapshot = {
      word: word.word,
      lang_code: word.lang_code,
      pos: word.pos,
      meaning_ko: word.meaning_ko,
      meaning_en: word.meaning_en,
      distractor_count: existingDistractors?.length ?? 0,
      existing_distractors: existingDistractors ?? [],
    };

    const meaningKo = formatWordMeaning(word.meaning_ko);
    const meaningEn = formatWordMeaning(word.meaning_en);
    if (!meaningEn) {
      throw new Error('오답 생성 기준으로 사용할 영어 뜻이 없습니다.');
    }

    const distractors = await generateDistractorsDeepseek({
      word: word.word,
      langCode: word.lang_code,
      pos: Array.isArray(word.pos) ? word.pos : [],
      meaningKo: meaningKo || '',
      meaningEn,
      count: count + 4, // 필터링(원본단어 중복 등) 대비 넉넉하게 생성 요청
    });

    if (!distractors || distractors.length === 0) {
      throw new Error('혼동 어휘 생성에 실패했습니다.');
    }

    const normalizedWord = word.word.toLowerCase().trim();
    const seen = new Set<string>();
    const excludedReasons: Record<string, number> = {
      invalid_word: 0,
      same_as_source: 0,
      duplicate: 0,
      missing_meaning: 0,
      too_long: 0,
    };
    const generatedJson = distractors.flatMap(d => {
      const distractorWord = typeof d.word === 'string' ? d.word.trim() : '';
      const normalized = distractorWord.toLowerCase();
      const meaningKo = typeof d.meaning_ko === 'string' ? d.meaning_ko.trim() : '';
      const distractorMeaningEn = typeof d.meaning_en === 'string' ? d.meaning_en.trim() : '';

      if (!distractorWord) {
        excludedReasons.invalid_word++;
        return [];
      }
      if (normalized === normalizedWord) {
        excludedReasons.same_as_source++;
        return [];
      }
      if (seen.has(normalized)) {
        excludedReasons.duplicate++;
        return [];
      }
      if (!meaningKo || !distractorMeaningEn) {
        excludedReasons.missing_meaning++;
        return [];
      }
      if (distractorWord.length > 100 || meaningKo.length > 300 || distractorMeaningEn.length > 300) {
        excludedReasons.too_long++;
        return [];
      }
      seen.add(normalized);

      return [{
        word: distractorWord,
        meaning_ko: meaningKo,
        meaning_en: distractorMeaningEn,
      }];
    });

    if (generatedJson.length < count) {
      const reasonSummary = Object.entries(excludedReasons)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => `${key} ${value}개`)
        .join(', ');
      throw new Error(
        `AI 응답 ${distractors.length}개 중 유효한 혼동 어휘가 ${generatedJson.length}개만 남았습니다` +
        `${reasonSummary ? ` (${reasonSummary})` : ''}. 초안을 저장하지 않았습니다.`
      );
    }

    const completedGeneratedJson = generatedJson.slice(0, count);
    const { data, error } = await supabase
      .from('distractor_generation_items')
      .insert({
        batch_id: batchId,
        word_id: wordId,
        status: 'generated',
        source_snapshot: sourceSnapshot,
        generated_json: completedGeneratedJson,
      })
      .select();

    if (error) {
      throw new Error(`혼동 어휘 초안 저장 실패: ${error.message}`);
    }

    return NextResponse.json(data?.[0]);
  } catch (error) {
    console.error('API 오류:', error);

    if (batchId && wordId) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from('distractor_generation_items')
          .upsert({
            batch_id: batchId,
            word_id: wordId,
            status: 'failed',
            source_snapshot: sourceSnapshot,
            generated_json: [],
            error_message: error instanceof Error ? error.message : '알 수 없는 오류',
          }, {
            onConflict: 'batch_id,word_id',
          });
      } catch (saveError) {
        console.error('오답 생성 실패 이력 저장 오류:', saveError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
