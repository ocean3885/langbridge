import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import MyAudioList from '../../components/MyAudioList';

// 다중 삭제 액션 (서버): 선택된 항목의 소유권을 확인하고 Storage + DB에서 삭제
async function bulkDeleteAction(formData: FormData) {
  'use server';
  const raw = formData.get('ids');
  if (!raw || typeof raw !== 'string') return;
  let ids: number[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      ids = parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    }
  } catch {
    // fallback: csv
    ids = raw
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n));
  }
  if (ids.length === 0) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // 각 항목 개별 처리 (권한/스토리지/DB)
  for (const id of ids) {
    const { data: target } = await supabase
      .from('lang_audio_content')
      .select('id,user_id,audio_file_path')
      .eq('id', id)
      .maybeSingle();
    if (!target || target.user_id !== user!.id) continue;

    if (target.audio_file_path) {
      console.log(`삭제 시도: 버킷=kdryuls_automaking, 경로=${target.audio_file_path}`);
      
      // Service Role 클라이언트 생성 (RLS 우회)
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      const { data: storageData, error: storageError } = await serviceSupabase.storage
        .from('kdryuls_automaking')
        .remove([target.audio_file_path]);
      
      if (storageError) {
        console.error(`❌ Storage 삭제 실패 (${target.audio_file_path}):`, storageError);
      } else {
        console.log(`✅ Storage 삭제 성공:`, storageData);
      }
    } else {
      console.log(`경고: audio_file_path가 없음 (ID: ${id})`);
    }
    
    // DB에서 레코드 삭제
    const { error: dbError } = await supabase
      .from('lang_audio_content')
      .delete()
      .eq('id', id);
    
    if (dbError) {
      console.error(`❌ DB 삭제 실패 (ID: ${id}):`, dbError);
    } else {
      console.log(`✅ DB 삭제 성공 (ID: ${id})`);
    }
  }

  revalidatePath('/my-audio');
}

// 나의 오디오 리스트 페이지 (서버 컴포넌트)
export default async function MyAudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // 비로그인 상태면 로그인 페이지로 유도
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">내 오디오</h1>
        <p className="mb-4">로그인이 필요합니다.</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">로그인 페이지로 이동</Link>
      </div>
    );
  }

  // 사용자 소유 오디오 콘텐츠 가져오기 (최신 순)
  const { data: audioList, error } = await supabase
    .from('lang_audio_content')
    .select('id,title,created_at,user_id,audio_file_path')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(50);

  if (error) {
    return <div className="text-red-600">오디오 목록을 불러오는 중 오류: {error.message}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">내 오디오</h1>
      {(!audioList || audioList.length === 0) && (
        <p className="text-gray-600">아직 생성된 오디오가 없습니다. <Link href="/upload" className="text-blue-600 hover:underline">지금 만들어보세요.</Link></p>
      )}
      {audioList && audioList.length > 0 && (
        <MyAudioList
          audioList={audioList.map((a) => ({
            ...a,
            created_label: new Intl.DateTimeFormat('ko-KR', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false,
              timeZone: 'UTC',
            }).format(new Date(a.created_at)),
          }))}
          bulkDelete={bulkDeleteAction}
        />
      )}
    </div>
  );
}
