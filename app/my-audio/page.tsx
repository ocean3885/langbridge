import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { getStorageBucket } from '@/lib/supabase/storage';
import {
  deleteAudioContentByIdForUserSqlite,
  findAudioContentByIdSqlite,
  listAudioContentByUserSqlite,
  recordAudioStudySqlite,
  updateAudioCategoryForIdsSqlite,
} from '@/lib/sqlite/audio-content';
import { listSqliteCategories, updateSqliteCategory } from '@/lib/sqlite/categories';
import { DEFAULT_LEARNING_CATEGORY_NAME } from '@/lib/learning-category';
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

  const user = await getAppUserFromServer();
  if (!user) {
    console.log('🔴 사용자 인증 실패');
    redirect('/auth/login');
  }
  
  console.log('🔴 삭제 시작, 사용자:', user.id);

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

  // 각 항목 개별 처리 (권한/스토리지/DB)
  for (const id of ids) {
    console.log(`🔴 처리 중: ${id}`);

    const target = await findAudioContentByIdSqlite(id);
      
    console.log(`🔴 조회 결과 (${id}):`, target);
    
    if (!target || target.user_id !== user!.id) {
      console.log(`🔴 권한 없음 또는 없는 항목 (${id})`);
      continue;
    }

    if (target.audio_file_path) {
      console.log(`🔴 스토리지 삭제 시도: ${target.audio_file_path}`);

      const { data: storageData, error: storageError } = await serviceSupabase.storage
        .from(getStorageBucket())
        .remove([target.audio_file_path]);
      
      if (storageError) {
        console.error(`🔴 Storage 삭제 실패 (${target.audio_file_path}):`, storageError);
      } else {
        console.log(`🔴 Storage 삭제 성공:`, storageData);
      }
    } else {
      console.log(`🔴 audio_file_path가 없음 (ID: ${id})`);
    }
    
    console.log(`🔴 DB 삭제 시도 (ID: ${id})`);
    await deleteAudioContentByIdForUserSqlite(id, user.id);
    console.log(`🔴 DB 삭제 성공 (ID: ${id})`);
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

  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/login');
  }

  await updateSqliteCategory({
    table: 'lang_categories',
    id: categoryId,
    userId: user.id,
    name: newName,
  });

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
  
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(idsRaw) as unknown;
    if (Array.isArray(parsed)) {
      ids = parsed.map((v) => String(v)).filter(Boolean);
    }
  } catch {
    ids = idsRaw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  
  if (ids.length === 0) return;
  
  let categoryId: number | null;
  if (categoryIdRaw === 'null' || categoryIdRaw === '' || categoryIdRaw === null) {
    categoryId = null;
  } else {
    const num = Number(categoryIdRaw);
    categoryId = Number.isNaN(num) ? null : num;
  }
  const user = await getAppUserFromServer();
  if (!user) {
    redirect('/auth/login');
  }
  await updateAudioCategoryForIdsSqlite({
    ids,
    userId: user.id,
    categoryId,
  });
  
  revalidatePath('/my-audio');
}

// 학습 기록 액션 (서버): 항목 클릭 시 study_count 증가 + last_studied_at 갱신
async function recordStudyAction(formData: FormData) {
  'use server';
  const idRaw = formData.get('id');
  if (!idRaw || typeof idRaw !== 'string') return;

  const user = await getAppUserFromServer();
  if (!user) return;

  const nowIso = new Date().toISOString();

  await recordAudioStudySqlite({
    id: idRaw,
    userId: user.id,
    nowIso,
  });
}
// 나의 오디오 리스트 페이지 (서버 컴포넌트)
export default async function MyAudioPage() {
  const user = await getAppUserFromServer();

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

  const audioList = await listAudioContentByUserSqlite(user.id, 100);

  // 카테고리 ID 목록 추출 및 이름 조회
  const categoryRows = await listSqliteCategories('lang_categories', user.id);
  const categoryMap: Record<number, { name: string; languageName: string }> = {};
  categoryRows.forEach((category) => {
    categoryMap[category.id] = {
      name: category.name,
      languageName: category.language_id ? `언어 ${category.language_id}` : '언어 미지정',
    };
  });

  // 카테고리별로 그룹화
  const grouped: Record<string, AudioWithCategory[]> = {};
  audioList.forEach(a => {
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
      name: catId === null ? DEFAULT_LEARNING_CATEGORY_NAME : (categoryMap[catId]?.name || '알 수 없는 카테고리'),
      languageName: catId === null ? '' : (categoryMap[catId]?.languageName || ''),
      audioList: list
    };
  }).sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return a.name.localeCompare(b.name, 'ko');
  });

  const allLanguages = Array.from(new Set(categoryRows.map((category) => category.language_id).filter((id): id is number => id !== null)))
    .sort((a, b) => a - b)
    .map((id) => ({ id, name_ko: `언어 ${id}`, code: String(id) }));

  const categoriesForModal = categoryRows.map((c) => {
    return {
      id: c.id,
      name: c.name,
      languageName: c.language_id ? `언어 ${c.language_id}` : '언어 미지정'
    };
  });

  return (
    <div className="max-w-7xl mx-auto">
      {groupedCategories.length === 0 && (
        <>
          <h1 className="text-4xl font-bold mb-6">내 오디오</h1>
           <p className="text-gray-600">아직 생성된 오디오가 없습니다. <Link href="/upload?tab=audio" className="text-blue-600 hover:underline">지금 만들어보세요.</Link></p>
        </>
      )}
      {groupedCategories.length > 0 && (
        <MyAudioPageClient
          allGroupedCategories={groupedCategories}
          allCategories={categoriesForModal}
          languages={allLanguages}
          bulkDelete={bulkDeleteAction}
          changeCategory={changeCategoryAction}
          recordStudy={recordStudyAction}
          renameCategory={renameCategoryAction}
        />
      )}
    </div>
  );
}