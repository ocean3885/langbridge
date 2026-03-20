import { createClient } from '@/lib/supabase/server';
import {
  deleteSqliteCategory,
  findSqliteCategoryByName,
  listSqliteCategories,
  updateSqliteCategory,
  upsertSqliteCategory,
} from '@/lib/sqlite/categories';
import {
  countAudioContentByCategoryForUserSqlite,
  hasAudioContentForCategoryByUserSqlite,
} from '@/lib/sqlite/audio-content';
import { getAppUserFromRequest } from '@/lib/auth/app-user';
import { NextRequest, NextResponse } from 'next/server';

const TABLE = 'lang_categories' as const;

function normalizeLanguageId(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function parseIdOrNull(value: string | null): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function ensureCategoryCache(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const cached = await listSqliteCategories(TABLE, userId);
  if (cached.length > 0) return cached;

  const { data } = await supabase
    .from(TABLE)
    .select('id, name, language_id, user_id, created_at')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  for (const row of data || []) {
    await upsertSqliteCategory({
      table: TABLE,
      id: row.id,
      name: row.name,
      languageId: row.language_id,
      userId: row.user_id,
      createdAt: row.created_at,
    });
  }

  return listSqliteCategories(TABLE, userId);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { name, language_id } = await request.json();
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const languageId = normalizeLanguageId(language_id);

    if (!trimmedName) {
      return NextResponse.json({ error: '카테고리 이름을 입력하세요.' }, { status: 400 });
    }

    const existing = await findSqliteCategoryByName({
      table: TABLE,
      userId: user.id,
      name: trimmedName,
      languageId,
    });

    if (existing) {
      return NextResponse.json({ error: '이미 존재하는 카테고리입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        name: trimmedName,
        language_id: languageId,
        user_id: user.id,
      })
      .select('id, name, language_id, user_id, created_at, updated_at')
      .single();

    if (error || !data) {
      console.error('카테고리 추가 오류:', error);
      return NextResponse.json({ error: '카테고리 추가에 실패했습니다.' }, { status: 500 });
    }

    await upsertSqliteCategory({
      table: TABLE,
      id: data.id,
      name: data.name,
      languageId: data.language_id,
      userId: data.user_id,
      createdAt: data.created_at,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('includeCount') === 'true';

    const categories = await ensureCategoryCache(supabase, user.id);

    if (!includeCount) {
      return NextResponse.json(categories);
    }

    const withCount = await Promise.all(
      categories.map(async (category) => {
        const count = await countAudioContentByCategoryForUserSqlite({
          userId: user.id,
          categoryId: category.id,
        });

        return {
          ...category,
          content_count: count ?? 0,
        };
      })
    );

    return NextResponse.json(withCount);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id, name } = await request.json();
    const categoryId = Number(id);
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!Number.isFinite(categoryId) || !trimmedName) {
      return NextResponse.json({ error: 'ID와 카테고리 이름을 입력하세요.' }, { status: 400 });
    }

    const categories = await ensureCategoryCache(supabase, user.id);
    const duplicate = categories.find((c) => c.id !== categoryId && c.name === trimmedName);

    if (duplicate) {
      return NextResponse.json({ error: '이미 존재하는 카테고리 이름입니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({ name: trimmedName })
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .select('id, name, language_id, user_id, created_at, updated_at')
      .single();

    if (error || !data) {
      console.error('카테고리 수정 오류:', error);
      return NextResponse.json({ error: '카테고리 수정에 실패했습니다.' }, { status: 500 });
    }

    await updateSqliteCategory({
      table: TABLE,
      id: categoryId,
      userId: user.id,
      name: trimmedName,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getAppUserFromRequest(request, supabase);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = parseIdOrNull(searchParams.get('id'));

    if (!categoryId) {
      return NextResponse.json({ error: '카테고리 ID를 입력하세요.' }, { status: 400 });
    }

    const usedContent = await hasAudioContentForCategoryByUserSqlite({
      userId: user.id,
      categoryId,
    });

    if (usedContent) {
      return NextResponse.json(
        { error: '이 카테고리를 사용 중인 콘텐츠가 있어 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from(TABLE).delete().eq('id', categoryId).eq('user_id', user.id);

    if (error) {
      console.error('카테고리 삭제 오류:', error);
      return NextResponse.json({ error: '카테고리 삭제에 실패했습니다.' }, { status: 500 });
    }

    await deleteSqliteCategory({ table: TABLE, id: categoryId, userId: user.id });
    return NextResponse.json({ message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
