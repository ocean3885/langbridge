'use server';

import { 
  createSqliteCategory, 
  updateSqliteCategory, 
  deleteSqliteCategory,
  listSqliteCategories
} from '@/lib/sqlite/categories';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import { revalidatePath } from 'next/cache';

export async function createUserCategoryAction(input: {
  name: string;
  languageId: number | null;
}) {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  try {
    const category = await createSqliteCategory({
      table: 'user_categories',
      userId: user.id,
      name: input.name,
      languageId: input.languageId
    });
    revalidatePath('/my-videos');
    revalidatePath('/lb-videos');
    return { success: true, category };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserCategoryAction(input: {
  id: number;
  name: string;
}) {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  try {
    await updateSqliteCategory({
      table: 'user_categories',
      id: input.id,
      userId: user.id,
      name: input.name
    });
    revalidatePath('/my-videos');
    revalidatePath('/lb-videos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteUserCategoryAction(id: number) {
  const user = await getAppUserFromServer();
  if (!user) return { success: false, error: '로그인이 필요합니다.' };

  try {
    await deleteSqliteCategory({
      table: 'user_categories',
      id,
      userId: user.id
    });
    revalidatePath('/my-videos');
    revalidatePath('/lb-videos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listUserCategoriesAction() {
  const user = await getAppUserFromServer();
  if (!user) return [];
  return listSqliteCategories('user_categories', user.id);
}
