import { createClient } from '@/lib/supabase/server';
import AudioPlayerClient from '@/components/AudioPlayerClient'; // 클라이언트 컴포넌트
import Link from 'next/link';
import { Calendar, FolderOpen } from 'lucide-react';
import TitleEditorClient from '@/components/TitleEditorClient';
import { revalidatePath } from 'next/cache';
import BackButton from '@/components/BackButton';

type RelatedAudio = {
  id: number;
  title: string | null;
};

// Next.js 16: params는 Promise이므로 await 필요
export default async function PlayerPage({ params }: { params: Promise<{ audio_id: string }> }) {
  const supabase = await createClient();
  const { audio_id } = await params;
  const audioIdNum = Number(audio_id);

  if (!Number.isFinite(audioIdNum)) {
    return <div>잘못된 오디오 ID입니다.</div>;
  }

  // 현재 로그인 유저 확인
  const { data: authData } = await supabase.auth.getUser();
  const sessionUserId = authData.user?.id ?? null;

  // 1. DB에서 오디오 메타데이터 가져오기 (카테고리 포함)
  const { data: audioContent, error } = await supabase
    .from('lang_audio_content')
    .select(`
      *,
      category:lang_categories!category_id (
        id,
        name
      )
    `)
    .eq('id', audioIdNum)
    .single();

  // 조인 실패 시 기본 쿼리로 재시도
  if (error) {
    const { data: basicContent, error: basicError } = await supabase
      .from('lang_audio_content')
      .select('*')
      .eq('id', audioIdNum)
      .single();
    
    if (basicError || !basicContent) {
      return <div>오디오 콘텐츠를 찾을 수 없습니다. (오류: {basicError?.message || error.message})</div>;
    }

    // 유저 정보 별도 조회
    const { data: userData } = await supabase
      .from('lang_profiles')
      .select('id, email')
      .eq('id', basicContent.user_id)
      .single();

    // 카테고리 정보 별도 조회
    let categoryData = null;
    if (basicContent.category_id) {
      const { data: cat } = await supabase
        .from('lang_categories')
        .select('id, name')
        .eq('id', basicContent.category_id)
        .single();
      categoryData = cat;
    }

    // 데이터 병합
    const mergedContent = {
      ...basicContent,
      user: userData,
      category: categoryData
    };

    const { data: signedUrlData, error: urlError } = await supabase
      .storage
      .from('kdryuls_automaking')
      .createSignedUrl(basicContent.audio_file_path, 3600);
    
    if (urlError) {
      console.error('Signed URL 생성 오류:', urlError);
      return <div>오디오 파일 URL을 생성할 수 없습니다: {urlError.message}</div>;
    }
    
    const audioUrl = signedUrlData?.signedUrl || "";
    
    if (!audioUrl) {
      return <div>오디오 파일 URL이 비어있습니다.</div>;
    }

    // 같은 카테고리의 다른 오디오 불러오기
    let relatedAudios: RelatedAudio[] = [];
    if (mergedContent.category?.id) {
      const { data: rel, error: relErr } = await supabase
        .from('lang_audio_content')
        .select('id, title')
        .eq('category_id', mergedContent.category.id)
        .neq('id', audioIdNum)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!relErr && rel) relatedAudios = rel as RelatedAudio[];
    }

    // 메모 데이터 조회
    const { data: memos } = await supabase
      .from('lang_audio_memos')
      .select('*')
      .eq('content_id', audioIdNum)
      .eq('user_id', sessionUserId || '')
      .order('line_number', { ascending: true });

    // 제목 수정 서버 액션 (fallback 경로)
    const updateTitle = async (formData: FormData) => {
      'use server';
      const supa = await createClient();
      const { data: auth } = await supa.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return { ok: false, message: '로그인이 필요합니다.' };

      const newTitle = (formData.get('title') as string | null)?.trim() ?? '';
      if (!newTitle) return { ok: false, message: '제목을 입력하세요.' };
      if (newTitle.length > 200) return { ok: false, message: '제목은 200자 이하로 입력하세요.' };

      // 소유자 확인
      const { data: ownerRow, error: ownerErr } = await supa
        .from('lang_audio_content')
        .select('id, user_id')
        .eq('id', audioIdNum)
        .single();
      if (ownerErr || !ownerRow) return { ok: false, message: '오디오를 찾을 수 없습니다.' };
      if (ownerRow.user_id !== uid) return { ok: false, message: '수정 권한이 없습니다.' };

      const { error: updErr } = await supa
        .from('lang_audio_content')
        .update({ title: newTitle })
        .eq('id', audioIdNum);
      if (updErr) return { ok: false, message: updErr.message };

      revalidatePath(`/player/${audioIdNum}`);
      return { ok: true };
    };

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex justify-end mb-2">
          <BackButton />
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <TitleEditorClient
              title={mergedContent.title || '제목 없음'}
              canEdit={sessionUserId !== null && 'user_id' in mergedContent && sessionUserId === mergedContent.user_id}
              action={updateTitle}
            />
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600">
              {mergedContent.category && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">{mergedContent.category.name}</span>
                </div>
              )}
              {mergedContent.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(mergedContent.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>        <AudioPlayerClient 
          audioUrl={audioUrl} 
          syncData={mergedContent.sync_data} 
          contentId={audioIdNum}
          initialMemos={memos || []}
        />

        {relatedAudios.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <h2 className="text-base sm:text-lg font-semibold mb-3">같은 카테고리의 다른 오디오</h2>
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1">
              {relatedAudios.map((a) => (
                <Link
                  key={a.id}
                  href={`/player/${a.id}`}
                  className="shrink-0 rounded-md border px-3 py-2 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground max-w-[70vw] truncate"
                >
                  {a.title || `오디오 #${a.id}`}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error || !audioContent) {
    return <div>오디오 콘텐츠를 찾을 수 없습니다.</div>;
  }

  // 2. Storage에서 오디오 파일의 signed URL 가져오기 (1시간 유효)
  const { data: signedUrlData, error: urlError } = await supabase
    .storage
    .from('kdryuls_automaking')
    .createSignedUrl(audioContent.audio_file_path, 3600); // 3600초 = 1시간
  
  if (urlError) {
    console.error('Signed URL 생성 오류:', urlError);
    return <div>오디오 파일 URL을 생성할 수 없습니다: {urlError.message}</div>;
  }
  
  const audioUrl = signedUrlData?.signedUrl || "";
  
  if (!audioUrl) {
    return <div>오디오 파일 URL이 비어있습니다.</div>;
  }
  
  // 3. 실제 오디오 재생 로직은 클라이언트 컴포넌트에 위임
  // 같은 카테고리의 다른 오디오 불러오기
  let relatedAudios: RelatedAudio[] = [];
  if (audioContent.category?.id) {
    const { data: rel, error: relErr } = await supabase
      .from('lang_audio_content')
      .select('id, title')
      .eq('category_id', audioContent.category.id)
      .neq('id', audioIdNum)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!relErr && rel) relatedAudios = rel as RelatedAudio[];
  }

  // 메모 데이터 조회
  const { data: memos } = await supabase
    .from('lang_audio_memos')
    .select('*')
    .eq('content_id', audioIdNum)
    .eq('user_id', sessionUserId || '')
    .order('line_number', { ascending: true });

  // 제목 수정 서버 액션 (정상 경로)
  const updateTitle = async (formData: FormData) => {
    'use server';
    const supa = await createClient();
    const { data: auth } = await supa.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return { ok: false, message: '로그인이 필요합니다.' };

    const newTitle = (formData.get('title') as string | null)?.trim() ?? '';
    if (!newTitle) return { ok: false, message: '제목을 입력하세요.' };
    if (newTitle.length > 200) return { ok: false, message: '제목은 200자 이하로 입력하세요.' };

    // 소유자 확인은 이미 조인된 데이터로도 가능하지만 다시 조회로 안전성 확보
    const { data: ownerRow, error: ownerErr } = await supa
      .from('lang_audio_content')
      .select('id, user_id')
      .eq('id', audioIdNum)
      .single();
    if (ownerErr || !ownerRow) return { ok: false, message: '오디오를 찾을 수 없습니다.' };
    if (ownerRow.user_id !== uid) return { ok: false, message: '수정 권한이 없습니다.' };

    const { error: updErr } = await supa
      .from('lang_audio_content')
      .update({ title: newTitle })
      .eq('id', audioIdNum);
    if (updErr) return { ok: false, message: updErr.message };

    revalidatePath(`/player/${audioIdNum}`);
    return { ok: true };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 헤더 영역 */}
      <div className="mb-6">
        <div className="flex justify-end mb-2">
          <BackButton />
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <TitleEditorClient
              title={audioContent.title || '제목 없음'}
              canEdit={sessionUserId !== null && 'user_id' in audioContent && sessionUserId === audioContent.user_id}
              action={updateTitle}
            />
            {/* 메타데이터 */}
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600">
              {/* 카테고리 */}
              {audioContent.category && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">{audioContent.category.name}</span>
                </div>
              )}
              {/* 생성 날짜 */}
              {audioContent.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(audioContent.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AudioPlayerClient 
        audioUrl={audioUrl} 
        syncData={audioContent.sync_data} 
        contentId={audioIdNum}
        initialMemos={memos || []}
      />

      {relatedAudios.length > 0 && (
        <div className="mt-8 sm:mt-10">
          <h2 className="text-base sm:text-lg font-semibold mb-3">같은 카테고리의 다른 오디오</h2>
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1">
            {relatedAudios.map((a) => (
              <Link
                key={a.id}
                href={`/player/${a.id}`}
                className="shrink-0 rounded-md border px-3 py-2 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground max-w-[70vw] truncate"
              >
                {a.title || `오디오 #${a.id}`}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}