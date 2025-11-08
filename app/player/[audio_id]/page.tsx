// langbridge/app/player/[audio_id]/page.tsx

import { createClient } from '@/lib/supabase/server';
import AudioPlayerClient from '@/components/AudioPlayerClient'; // 클라이언트 컴포넌트
import Link from 'next/link';
import { Calendar, User, FolderOpen } from 'lucide-react';

// Next.js 16: params는 Promise이므로 await 필요
export default async function PlayerPage({ params }: { params: Promise<{ audio_id: string }> }) {
  const supabase = await createClient();
  const { audio_id } = await params;
  const audioIdNum = Number(audio_id);

  if (!Number.isFinite(audioIdNum)) {
    return <div>잘못된 오디오 ID입니다.</div>;
  }

  // 1. DB에서 오디오 메타데이터 가져오기 (유저 정보와 카테고리 포함)
  const { data: audioContent, error } = await supabase
    .from('lang_audio_content')
    .select(`
      *,
      user:user_id!inner (
        id,
        email
      ),
      category:category_id (
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

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-4">{mergedContent.title || '제목 없음'}</h1>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {mergedContent.category && (
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <span className="font-medium">{mergedContent.category.name}</span>
              </div>
            )}
            
            {mergedContent.user && (
              <Link 
                href={`/user/${mergedContent.user.id}/audios`}
                className="flex items-center gap-2 hover:text-blue-600 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="font-medium underline">{mergedContent.user.email}</span>
              </Link>
            )}
            
            {mergedContent.created_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(mergedContent.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            )}
          </div>
        </div>

        <AudioPlayerClient
          audioUrl={audioUrl}
          syncData={mergedContent.sync_data} 
        />
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
  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 영역 */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-4">{audioContent.title || '제목 없음'}</h1>
        
        {/* 메타데이터 */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {/* 카테고리 */}
          {audioContent.category && (
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span className="font-medium">{audioContent.category.name}</span>
            </div>
          )}
          
          {/* 생성 유저 (클릭 가능) */}
          {audioContent.user && (
            <Link 
              href={`/user/${audioContent.user.id}/audios`}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="font-medium underline">{audioContent.user.email}</span>
            </Link>
          )}
          
          {/* 생성 날짜 */}
          {audioContent.created_at && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(audioContent.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          )}
        </div>
      </div>

      <AudioPlayerClient
        audioUrl={audioUrl}
        syncData={audioContent.sync_data} 
      />
    </div>
  );
}