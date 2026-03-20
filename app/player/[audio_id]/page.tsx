import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';
import AudioPlayerClient from '@/components/AudioPlayerClient'; // 클라이언트 컴포넌트
import Link from 'next/link';
import { Calendar, FolderOpen } from 'lucide-react';
import TitleEditorClient from '@/components/TitleEditorClient';
import { revalidatePath } from 'next/cache';
import BackButton from '@/components/BackButton';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import {
  findAudioContentByIdSqlite,
  listAudioContentByCategorySqlite,
  updateAudioTitleForUserSqlite,
} from '@/lib/sqlite/audio-content';
import { listSqliteCategories } from '@/lib/sqlite/categories';
import { listAudioMemosSqlite } from '@/lib/sqlite/audio-memos';

type RelatedAudio = {
  id: string;
  title: string | null;
};

// Next.js 16: params는 Promise이므로 await 필요
export default async function PlayerPage({ params }: { params: Promise<{ audio_id: string }> }) {
  const adminClient = createAdminClient();
  const storageBucket = getStorageBucket();
  const { audio_id } = await params;
  const audioId = String(audio_id);

  // 현재 로그인 유저 확인
  const appUser = await getAppUserFromServer();
  const sessionUserId = appUser?.id ?? null;

  const audioContent = await findAudioContentByIdSqlite(audioId);
  if (!audioContent) {
    return <div>오디오 콘텐츠를 찾을 수 없습니다.</div>;
  }

  const categories = await listSqliteCategories('lang_categories', audioContent.user_id);
  const category = audioContent.category_id
    ? categories.find((c) => c.id === audioContent.category_id) ?? null
    : null;

  const parsedSyncData = (() => {
    if (!audioContent.sync_data) return [];
    try {
      const parsed = JSON.parse(audioContent.sync_data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  if (!audioContent.audio_file_path) {
    return <div>오디오 파일 경로가 없습니다.</div>;
  }

  // Storage에서 오디오 파일의 signed URL 가져오기 (1시간 유효)
  const { data: signedUrlData, error: urlError } = await adminClient
    .storage
    .from(storageBucket)
    .createSignedUrl(audioContent.audio_file_path, 3600); // 3600초 = 1시간
  
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
  if (audioContent.category_id) {
    relatedAudios = await listAudioContentByCategorySqlite({
      categoryId: audioContent.category_id,
      excludeId: audioContent.id,
      limit: 20,
    });
  }

  // 메모 데이터 조회
  const memos = sessionUserId ? await listAudioMemosSqlite(audioContent.id, sessionUserId) : [];

  const updateTitle = async (formData: FormData) => {
    'use server';
    const authUser = await getAppUserFromServer();
    const uid = authUser?.id;
    if (!uid) return { ok: false, message: '로그인이 필요합니다.' };

    const newTitle = (formData.get('title') as string | null)?.trim() ?? '';
    if (!newTitle) return { ok: false, message: '제목을 입력하세요.' };
    if (newTitle.length > 200) return { ok: false, message: '제목은 200자 이하로 입력하세요.' };

    const updated = await updateAudioTitleForUserSqlite({
      id: audioId,
      userId: uid,
      title: newTitle,
    });
    if (!updated) return { ok: false, message: '수정 권한이 없거나 오디오를 찾을 수 없습니다.' };

    revalidatePath(`/player/${audioId}`);
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
              {category && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">{category.name}</span>
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
        syncData={parsedSyncData}
        contentId={audioContent.id}
        initialMemos={memos}
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