import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const { name, language_id } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '카테고리 이름을 입력하세요.' },
        { status: 400 }
      );
    }

    // 중복 확인 (같은 언어 내에서만)
    const { data: existing } = await supabase
      .from('user_categories')
      .select('id')
      .eq('name', name.trim())
      .eq('language_id', language_id ?? null)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 카테고리입니다.' },
        { status: 400 }
      );
    }

    // 카테고리 추가
    const { data, error } = await supabase
      .from('user_categories')
      .insert({ 
        name: name.trim(), 
        language_id: typeof language_id === 'number' ? language_id : null,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('카테고리 추가 오류:', error);
      return NextResponse.json(
        { error: '카테고리 추가에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 카테고리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('includeCount') === 'true';

    const { data, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('카테고리 조회 오류:', error);
      return NextResponse.json(
        { error: '카테고리 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 컨텐츠 수 포함 (필요시 videos 테이블과 조인)
    if (includeCount && data) {
      const categoriesWithCount = await Promise.all(
        data.map(async (category) => {
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          return {
            ...category,
            content_count: count ?? 0
          };
        })
      );
      return NextResponse.json(categoriesWithCount);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 카테고리 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { id, name } = await request.json();

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { error: 'ID와 카테고리 이름을 입력하세요.' },
        { status: 400 }
      );
    }

    // 중복 확인 (같은 이름이 다른 ID로 존재하는지)
    const { data: existing } = await supabase
      .from('user_categories')
      .select('id')
      .eq('name', name.trim())
      .eq('user_id', user.id)
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 카테고리 이름입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('user_categories')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('카테고리 수정 오류:', error);
      return NextResponse.json(
        { error: '카테고리 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 카테고리 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '카테고리 ID를 입력하세요.' },
        { status: 400 }
      );
    }

    // 해당 카테고리를 사용 중인 비디오가 있는지 확인
    const { data: usedVideos } = await supabase
      .from('videos')
      .select('id')
      .eq('category_id', parseInt(id))
      .limit(1);

    if (usedVideos && usedVideos.length > 0) {
      return NextResponse.json(
        { error: '이 카테고리를 사용 중인 비디오가 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_categories')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', user.id);

    if (error) {
      console.error('카테고리 삭제 오류:', error);
      return NextResponse.json(
        { error: '카테고리 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
