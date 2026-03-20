import {
  createSqliteCategory,
  deleteSqliteCategory,
  findSqliteCategoryByName,
  listSqliteCategories,
  updateSqliteCategory,
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

async function ensureCategoryCache(userId: string) {
  return listSqliteCategories(TABLE, userId);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

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

    const created = await createSqliteCategory({
      table: TABLE,
      userId: user.id,
      name: trimmedName,
      languageId,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCount = searchParams.get('includeCount') === 'true';

    const categories = await ensureCategoryCache(user.id);

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
    const user = await getAppUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id, name } = await request.json();
    const categoryId = Number(id);
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!Number.isFinite(categoryId) || !trimmedName) {
      return NextResponse.json({ error: 'ID와 카테고리 이름을 입력하세요.' }, { status: 400 });
    }

    const categories = await ensureCategoryCache(user.id);
    const duplicate = categories.find((c) => c.id !== categoryId && c.name === trimmedName);

    if (duplicate) {
      return NextResponse.json({ error: '이미 존재하는 카테고리 이름입니다.' }, { status: 400 });
    }

    await updateSqliteCategory({
      table: TABLE,
      id: categoryId,
      userId: user.id,
      name: trimmedName,
    });

    return NextResponse.json({ id: categoryId, name: trimmedName });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAppUserFromRequest(request);

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

    await deleteSqliteCategory({ table: TABLE, id: categoryId, userId: user.id });
    return NextResponse.json({ message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
