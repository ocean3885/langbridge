import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import MyAudioPageClient from '../../components/MyAudioPageClient';

type AudioWithCategory = {
  id: string;
  title: string | null;
  created_at: string;
  user_id: string;
  audio_file_path: string | null;
  category_id: number | null;
  created_label: string;
  study_count: number | null;
  last_studied_at: string | null;
  studied_label: string;
};

function relativeFromNowKo(iso: string | null | undefined): string {
  if (!iso) return '-';
  const past = new Date(iso);
  if (isNaN(past.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - past.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);
  if (diffDays <= 0) return '오늘';
  if (diffDays < 30) return `${diffDays}일 전`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months}달 전`;
  const years = Math.floor(months / 12);
  return `${years}년 전`;
}

// 다중 삭제 액션 (서버): 선택된 항목의 소유권을 확인하고 Storage + DB에서 삭제
async function bulkDeleteAction(formData: FormData) {
  'use server';
  
  console.log('🔴 bulkDeleteAction 시작');
  
  const raw = formData.get('ids');
  console.log('🔴 받은 ids:', raw);
  
  if (!raw || typeof raw !== 'string') {
    console.log('🔴 ids가 없거나 잘못된 타입');
    return;
  }
  
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      ids = parsed.map(v => String(v)).filter(Boolean);
    }
  } catch (err) {
    console.log('🔴 JSON 파싱 실패, CSV로 처리:', err);
    // fallback: csv
    ids = raw.split(',').map((v) => v.trim()).filter(Boolean);
  }
  
  console.log('🔴 파싱된 ids:', ids);
  
  if (ids.length === 0) {
    console.log('🔴 삭제할 항목 없음');
    return;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('🔴 사용자 인증 실패');
    redirect('/auth/login');
  }
  
  console.log('🔴 삭제 시작, 사용자:', user.id);

  // 각 항목 개별 처리 (권한/스토리지/DB)
  for (const id of ids) {
    console.log(`🔴 처리 중: ${id}`);
    
    const { data: target } = await supabase
      .from('lang_audio_content')
      .select('id,user_id,audio_file_path')
      .eq('id', id)
      .maybeSingle();
      
    console.log(`🔴 조회 결과 (${id}):`, target);
    
    if (!target || target.user_id !== user!.id) {
      console.log(`🔴 권한 없음 또는 없는 항목 (${id})`);
      continue;
    }

    if (target.audio_file_path) {
      console.log(`🔴 스토리지 삭제 시도: ${target.audio_file_path}`);
      
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
        console.error(`🔴 Storage 삭제 실패 (${target.audio_file_path}):`, storageError);
      } else {
        console.log(`🔴 Storage 삭제 성공:`, storageData);
      }
    } else {
      console.log(`🔴 audio_file_path가 없음 (ID: ${id})`);
    }
    
    // DB에서 레코드 삭제
    console.log(`🔴 DB 삭제 시도 (ID: ${id})`);
    const { error: dbError } = await supabase
      .from('lang_audio_content')
      .delete()
      .eq('id', id);
    
    if (dbError) {
      console.error(`🔴 DB 삭제 실패 (ID: ${id}):`, dbError);
    } else {
      console.log(`🔴 DB 삭제 성공 (ID: ${id})`);
    }
  }
  
  console.log('🔴 bulkDeleteAction 완료');

  revalidatePath('/my-audio');
}

// 카테고리 이름 변경 액션 (서버)
async function renameCategoryAction(formData: FormData) {
  'use server';
  const idRaw = formData.get('categoryId');
  const nameRaw = formData.get('name');

  if (!idRaw || !nameRaw || typeof idRaw !== 'string' || typeof nameRaw !== 'string') return;
  const categoryId = Number(idRaw);
  const newName = nameRaw.trim();
  if (!newName || Number.isNaN(categoryId)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // 소유권 확인 후 업데이트
  const { data: catRow } = await supabase
    .from('lang_categories')
    .select('id,user_id')
    .eq('id', categoryId)
    .maybeSingle();

  if (!catRow || catRow.user_id !== user.id) {
    return; // 소유하지 않은 카테고리면 무시
  }

  const { error: updateError } = await supabase
    .from('lang_categories')
    .update({ name: newName })
    .eq('id', categoryId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('[renameCategoryAction] 카테고리 이름 변경 실패:', updateError);
  }

  revalidatePath('/my-audio');
}
// 카테고리 변경 액션 (서버)
async function changeCategoryAction(formData: FormData) {
  'use server';
  const idsRaw = formData.get('ids');
  const categoryIdRaw = formData.get('categoryId');
  
  if (!idsRaw || typeof idsRaw !== 'string') {
    return;
  }
  
  let ids: Array<string | number> = [];
  try {
    const parsed = JSON.parse(idsRaw) as unknown;
    if (Array.isArray(parsed)) {
      ids = parsed.filter((v) => typeof v === 'string' || typeof v === 'number');
    }
  } catch {
    ids = idsRaw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => (isNaN(Number(v)) ? v : Number(v)));
  }
  
  if (ids.length === 0) return;
  
  let categoryId: number | null;
  if (categoryIdRaw === 'null' || categoryIdRaw === '' || categoryIdRaw === null) {
    categoryId = null;
  } else {
    const num = Number(categoryIdRaw);
    categoryId = Number.isNaN(num) ? null : num;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }
  
  // Service Role 클라이언트 (RLS 우회) - 업데이트 시 사용
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
    // 단일 업데이트: 먼저 소유권 필터링 목록 생성
    const { data: ownershipRows } = await supabase
      .from('lang_audio_content')
      .select('id,user_id')
        .in('id', (ids.every(v => typeof v === 'number') ? (ids as number[]) : (ids.map(String) as string[])));

    const ownedIds = (ownershipRows || [])
      .filter(r => r.user_id === user.id)
      .map(r => r.id);

    if (ownedIds.length === 0) {
      revalidatePath('/my-audio');
      return;
    }

    const clientForUpdate = process.env.SUPABASE_SERVICE_ROLE_KEY ? serviceSupabase : supabase;
    const ownedIdsForQuery = ownedIds.length && typeof ownedIds[0] === 'number' ? (ownedIds as number[]) : (ownedIds.map(String) as string[]);
    const { error: updateError } = await clientForUpdate
      .from('lang_audio_content')
      .update({ category_id: categoryId })
      .in('id', ownedIdsForQuery);

    if (updateError) {
      console.error('[changeCategoryAction] 벌크 카테고리 변경 실패:', updateError);
    }
  
  revalidatePath('/my-audio');
}

// 학습 기록 액션 (서버): 항목 클릭 시 study_count 증가 + last_studied_at 갱신
async function recordStudyAction(formData: FormData) {
  'use server';
  const idRaw = formData.get('id');
  if (!idRaw || typeof idRaw !== 'string') return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 현재 값 조회 (소유권 포함)
  const { data: row } = await supabase
    .from('lang_audio_content')
    .select('id, user_id, study_count')
    .eq('id', idRaw)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) return;

  const nextCount = (row.study_count ?? 0) + 1;
  const nowIso = new Date().toISOString();

  const { error: updErr } = await supabase
    .from('lang_audio_content')
    .update({ study_count: nextCount, last_studied_at: nowIso })
    .eq('id', idRaw)
    .eq('user_id', user.id);

  if (updErr) {
    console.error('[recordStudyAction] 업데이트 실패:', updErr);
  }
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

  // 사용자 소유 오디오 콘텐츠 가져오기 (category_id 포함, 최신 순)
  const { data: audioList, error } = await supabase
    .from('lang_audio_content')
    .select('id,title,created_at,user_id,audio_file_path,category_id,study_count,last_studied_at')
    .eq('user_id', user.id)
    .order('id', { ascending: false })
    .limit(100);

  if (error) {
    return <div className="text-red-600">오디오 목록을 불러오는 중 오류: {error.message}</div>;
  }

  // 카테고리 ID 목록 추출 및 이름 조회
  const categoryIds = Array.from(
    new Set((audioList || []).map(a => a.category_id).filter(id => id !== null))
  ) as number[];
  
    const categoryMap: Record<number, { name: string; languageName: string }> = {};
  if (categoryIds.length > 0) {
      const { data: catRows } = await supabase
      .from('lang_categories')
        .select('id, name, language_id, languages(name_ko)')
        .eq('user_id', user.id)
      .in('id', categoryIds);
      (catRows || []).forEach((c) => { 
        const languageData = Array.isArray(c.languages) ? c.languages[0] : c.languages;
        categoryMap[c.id] = {
          name: c.name,
          languageName: languageData?.name_ko || '언어 미지정'
        };
      });
  }

  // 카테고리별로 그룹화
  const grouped: Record<string, AudioWithCategory[]> = {};
  (audioList || []).forEach(a => {
    const key = a.category_id === null ? 'uncategorized' : String(a.category_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      ...a,
      created_label: new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }).format(new Date(a.created_at)),
      studied_label: relativeFromNowKo(a.last_studied_at),
    });
  });

  const groupedCategories = Object.entries(grouped).map(([key, list]) => {
    const catId = key === 'uncategorized' ? null : Number(key);
    return {
      id: catId,
      name: catId === null ? '미분류' : (categoryMap[catId]?.name || '알 수 없는 카테고리'),
      languageName: catId === null ? '' : (categoryMap[catId]?.languageName || ''),
      audioList: list
    };
  }).sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return a.name.localeCompare(b.name, 'ko');
  });

  // 모든 언어 조회
  const { data: allLanguages } = await supabase
    .from('languages')
    .select('id, name_ko, code')
    .order('name_ko', { ascending: true });

  // 사용자의 모든 카테고리 조회 (모달에서 사용)
  const { data: allUserCategories } = await supabase
    .from('lang_categories')
    .select('id, name, language_id, languages(name_ko)')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  const categoriesForModal = (allUserCategories || []).map((c) => {
    const languageData = Array.isArray(c.languages) ? c.languages[0] : c.languages;
    return {
      id: c.id,
      name: c.name,
      languageName: languageData?.name_ko || '언어 미지정'
    };
  });

  return (
    <div className="max-w-7xl mx-auto">
      {groupedCategories.length === 0 && (
        <>
          <h1 className="text-4xl font-bold mb-6">내 오디오</h1>
          <p className="text-gray-600">아직 생성된 오디오가 없습니다. <Link href="/upload" className="text-blue-600 hover:underline">지금 만들어보세요.</Link></p>
        </>
      )}
      {groupedCategories.length > 0 && (
        <MyAudioPageClient
          allGroupedCategories={groupedCategories}
          allCategories={categoriesForModal}
          languages={allLanguages || []}
          bulkDelete={bulkDeleteAction}
          changeCategory={changeCategoryAction}
          recordStudy={recordStudyAction}
          renameCategory={renameCategoryAction}
        />
      )}
    </div>
  );
}