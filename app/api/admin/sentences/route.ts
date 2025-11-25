import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// 문장 목록 조회
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sentences')
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
      console.error('문장 조회 오류:', error);
      return NextResponse.json({ error: '문장 조회에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 문장 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const admin = createAdminClient();
    const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
      user_id: user.id
    });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { language_id, text, translation_ko, audio_path, context_category } = await request.json();

    if (!language_id || !text || !translation_ko || !audio_path) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('sentences')
      .insert({ 
        language_id, 
        text, 
        translation_ko, 
        audio_path,
        context_category: context_category || null 
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
      console.error('문장 추가 오류:', error);
      return NextResponse.json({ error: '문장 추가에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 문장 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const admin = createAdminClient();
    const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
      user_id: user.id
    });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { id, language_id, text, translation_ko, audio_path, context_category } = await request.json();

    if (!id || !language_id || !text || !translation_ko || !audio_path) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
    }

    // 기존 문장 정보 조회 (이전 audio_path 가져오기)
    const { data: oldSentence } = await supabase
      .from('sentences')
      .select('audio_path')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('sentences')
      .update({ 
        language_id, 
        text, 
        translation_ko, 
        audio_path,
        context_category: context_category || null 
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
      console.error('문장 수정 오류:', error);
      return NextResponse.json({ error: '문장 수정에 실패했습니다.' }, { status: 500 });
    }

    // 오디오 파일이 변경된 경우 이전 파일 삭제
    if (oldSentence?.audio_path && oldSentence.audio_path !== audio_path) {
      try {
        const adminClient = createAdminClient();
        const { error: storageError } = await adminClient.storage
          .from('kdryuls_automaking')
          .remove([oldSentence.audio_path]);

        if (storageError) {
          console.error('이전 오디오 파일 삭제 실패:', storageError);
        }
      } catch (adminErr) {
        console.error('Admin 클라이언트 오류:', adminErr);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 문장 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 운영자 확인
    const admin = createAdminClient();
    const { data: isSuperAdmin } = await admin.rpc('get_user_is_super_admin', {
      user_id: user.id
    });

    if (!isSuperAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '문장 ID를 입력해주세요.' }, { status: 400 });
    }

    // 관련 단어-문장 매핑 확인
    const { data: usedMappings } = await supabase
      .from('word_sentence_map')
      .select('sentence_id')
      .eq('sentence_id', parseInt(id))
      .limit(1);

    if (usedMappings && usedMappings.length > 0) {
      return NextResponse.json(
        { error: '이 문장을 사용하는 단어 매핑이 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 삭제 전 문장 정보 조회 (audio_path 가져오기)
    const { data: sentence } = await supabase
      .from('sentences')
      .select('audio_path')
      .eq('id', parseInt(id))
      .single();

    // DB에서 문장 삭제
    const { error } = await supabase
      .from('sentences')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('문장 삭제 오류:', error);
      return NextResponse.json({ error: '문장 삭제에 실패했습니다.' }, { status: 500 });
    }

    // Storage에서 오디오 파일 삭제 (Service Role 사용)
    if (sentence?.audio_path) {
      try {
        const adminClient = createAdminClient();
        const { error: storageError } = await adminClient.storage
          .from('kdryuls_automaking')
          .remove([sentence.audio_path]);

        if (storageError) {
          console.error('스토리지 파일 삭제 실패:', storageError);
        }
      } catch (adminErr) {
        console.error('Admin 클라이언트 오류:', adminErr);
      }
    }

    return NextResponse.json({ message: '문장이 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
