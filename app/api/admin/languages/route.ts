import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// 언어 목록 조회
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('languages')
      .select('*')
      .order('name_en', { ascending: true });

    if (error) {
      console.error('언어 조회 오류:', error);
      return NextResponse.json({ error: '언어 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 언어 추가
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

    const { name_en, name_ko, code } = await request.json();

    if (!name_en || !name_ko || !code) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 중복 코드 확인
    const { data: existing } = await supabase
      .from('languages')
      .select('id')
      .eq('code', code)
      .single();

    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 언어 코드입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('languages')
      .insert({ name_en, name_ko, code })
      .select()
      .single();

    if (error) {
      console.error('언어 추가 오류:', error);
      return NextResponse.json({ error: '언어 추가에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 언어 수정
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

    const { id, name_en, name_ko, code } = await request.json();

    if (!id || !name_en || !name_ko || !code) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 중복 코드 확인 (자신 제외)
    const { data: existing } = await supabase
      .from('languages')
      .select('id')
      .eq('code', code)
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 언어 코드입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('languages')
      .update({ name_en, name_ko, code })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('언어 수정 오류:', error);
      return NextResponse.json({ error: '언어 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 언어 삭제
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
      return NextResponse.json({ error: '언어 ID를 입력해주세요.' }, { status: 400 });
    }

    // 관련 단어 확인
    const { data: usedWords } = await supabase
      .from('words')
      .select('id')
      .eq('language_id', parseInt(id))
      .limit(1);

    if (usedWords && usedWords.length > 0) {
      return NextResponse.json(
        { error: '이 언어를 사용하는 단어가 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 관련 문장 확인
    const { data: usedSentences } = await supabase
      .from('sentences')
      .select('id')
      .eq('language_id', parseInt(id))
      .limit(1);

    if (usedSentences && usedSentences.length > 0) {
      return NextResponse.json(
        { error: '이 언어를 사용하는 문장이 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('languages')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('언어 삭제 오류:', error);
      return NextResponse.json({ error: '언어 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ message: '언어가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
