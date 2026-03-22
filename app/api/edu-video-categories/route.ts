import { NextRequest, NextResponse } from 'next/server';
import {
  createSqliteCategory,
  deleteSqliteCategory,
  findSqliteCategoryByName,
  listSqliteCategories,
  updateSqliteCategory,
} from '@/lib/sqlite/categories';
import {
  countEduVideosByCategoryForUploaderSqlite,
  hasEduVideosForCategoryByUploaderSqlite,
} from '@/lib/sqlite/edu-videos';
import { getAppUserFromServer } from '@/lib/auth/app-user';

const TABLE = 'edu_video_categories' as const;

function parseLanguageId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIdOrNull(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function ensureCategoryCache(userId: string) {
  return listSqliteCategories(TABLE, userId);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const languageId = parseLanguageId(body?.language_id);

    if (!name) {
      return NextResponse.json({ error: '카테고리 이름을 입력해주세요.' }, { status: 400 });
    }

    const existing = await findSqliteCategoryByName({
      table: TABLE,
      userId: user.id,
      name,
      languageId,
    });

    if (existing) {
      return NextResponse.json({ error: '이미 같은 이름의 카테고리가 있습니다.' }, { status: 409 });
    }

    const created = await createSqliteCategory({
      table: TABLE,
      userId: user.id,
      name,
      languageId,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Create edu video category error:', error);
    return NextResponse.json({ error: '카테고리 생성에 실패했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeCount = searchParams.get('includeCount') === 'true';
    const categories = await ensureCategoryCache(user.id);

    if (!includeCount) {
      return NextResponse.json(categories);
    }

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await countEduVideosByCategoryForUploaderSqlite({
          uploaderId: user.id,
          categoryId: category.id,
        });

        return {
          ...category,
          content_count: count,
        };
      })
    );

    return NextResponse.json(categoriesWithCount);
  } catch (error) {
    console.error('List edu video categories error:', error);
    return NextResponse.json({ error: '카테고리 목록 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const id = body?.id;
    const trimmedName = typeof body?.name === 'string' ? body.name.trim() : '';
    const categoryId = Number(id);

    if (!Number.isFinite(categoryId) || !trimmedName) {
      return NextResponse.json({ error: '유효한 요청이 아닙니다.' }, { status: 400 });
    }

    const categories = await ensureCategoryCache(user.id);
    const duplicate = categories.find((category) => category.id !== categoryId && category.name === trimmedName);
    if (duplicate) {
      return NextResponse.json({ error: '이미 같은 이름의 카테고리가 있습니다.' }, { status: 409 });
    }

    await updateSqliteCategory({
      table: TABLE,
      id: categoryId,
      userId: user.id,
      name: trimmedName,
    });

    return NextResponse.json({ id: categoryId, name: trimmedName });
  } catch (error) {
    console.error('Update edu video category error:', error);
    return NextResponse.json({ error: '카테고리 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const categoryId = parseIdOrNull(searchParams.get('id'));

    if (!categoryId) {
      return NextResponse.json({ error: '카테고리 ID가 필요합니다.' }, { status: 400 });
    }

    const usedVideos = await hasEduVideosForCategoryByUploaderSqlite({
      uploaderId: user.id,
      categoryId,
    });

    if (usedVideos) {
      return NextResponse.json(
        { error: '이 카테고리를 사용하는 교육 영상이 있어 삭제할 수 없습니다.' },
        { status: 409 }
      );
    }

    await deleteSqliteCategory({ table: TABLE, id: categoryId, userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete edu video category error:', error);
    return NextResponse.json({ error: '카테고리 삭제에 실패했습니다.' }, { status: 500 });
  }
}