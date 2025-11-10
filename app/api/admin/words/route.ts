import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// 단어 목록 조회
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('words')
      .select(`
        *,
        languages:language_id (
          id,
          name_en,
          name_ko,
          code
        )
      `)
      .order('id', { ascending: false });

    if (error) {
      console.error('단어 조회 오류:', error);
      return NextResponse.json({ error: '단어 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 단어 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // is_premium 확인
    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { language_id, text, meaning_ko, level, part_of_speech } = await request.json();

    if (!language_id || !text || !meaning_ko || !level) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('words')
      .insert({ 
        language_id, 
        text, 
        meaning_ko, 
        level, 
        part_of_speech: part_of_speech || null 
      })
      .select(`
        *,
        languages:language_id (
          id,
          name_en,
          name_ko,
          code
        )
      `)
      .single();

    if (error) {
      console.error('단어 추가 오류:', error);
      return NextResponse.json({ error: '단어 추가에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 단어 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // is_premium 확인
    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, language_id, text, meaning_ko, level, part_of_speech } = await request.json();

    if (!id || !language_id || !text || !meaning_ko || !level) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('words')
      .update({ 
        language_id, 
        text, 
        meaning_ko, 
        level, 
        part_of_speech: part_of_speech || null 
      })
      .eq('id', id)
      .select(`
        *,
        languages:language_id (
          id,
          name_en,
          name_ko,
          code
        )
      `)
      .single();

    if (error) {
      console.error('단어 수정 오류:', error);
      return NextResponse.json({ error: '단어 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 단어 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // is_premium 확인
    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '단어 ID를 입력해주세요.' }, { status: 400 });
    }

    // 관련 동사 활용 확인
    const { data: usedConjugations } = await supabase
      .from('verb_conjugations')
      .select('id')
      .eq('word_id', parseInt(id))
      .limit(1);

    if (usedConjugations && usedConjugations.length > 0) {
      return NextResponse.json(
        { error: '이 단어의 동사 활용이 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 관련 단어-문장 매핑 확인
    const { data: usedMappings } = await supabase
      .from('word_sentence_map')
      .select('word_id')
      .eq('word_id', parseInt(id))
      .limit(1);

    if (usedMappings && usedMappings.length > 0) {
      return NextResponse.json(
        { error: '이 단어를 사용하는 문장 매핑이 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('단어 삭제 오류:', error);
      return NextResponse.json({ error: '단어 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ message: '단어가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
