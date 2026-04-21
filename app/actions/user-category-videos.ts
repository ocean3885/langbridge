'use server';

import { revalidatePath } from 'next/cache';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import {
  addUserCategoryVideoSqlite,
  listUserCategoriesForVideoSqlite,
  listVideosByUserCategorySqlite,
  removeUserCategoryVideoSqlite,
} from '@/lib/sqlite/user-category-videos';

export interface AddVideoToLearningCategoryInput {
  categoryId: number;
  videoId: string;
}

export async function addVideoToLearningCategory(input: AddVideoToLearningCategoryInput) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const mapping = await addUserCategoryVideoSqlite({
      userId: user.id,
      categoryId: input.categoryId,
      videoId: input.videoId,
    });

    revalidatePath('/my-videos');
    revalidatePath(`/my-videos/${input.videoId}`);
    revalidatePath('/videos');
    revalidatePath(`/videos/${input.videoId}`);
    revalidatePath('/lb-videos');
    return { success: true, mapping };
  } catch (error) {
    console.error('addVideoToLearningCategory exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export interface RemoveVideoFromLearningCategoryInput {
  categoryId: number;
  videoId: string;
}

export async function removeVideoFromLearningCategory(input: RemoveVideoFromLearningCategoryInput) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await removeUserCategoryVideoSqlite({
      userId: user.id,
      categoryId: input.categoryId,
      videoId: input.videoId,
    });

    revalidatePath('/my-videos');
    revalidatePath(`/my-videos/${input.videoId}`);
    revalidatePath('/videos');
    revalidatePath(`/videos/${input.videoId}`);
    revalidatePath('/lb-videos');
    return { success: true };
  } catch (error) {
    console.error('removeVideoFromLearningCategory exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

export async function listLearningCategoryVideos(categoryId: number) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.', videos: [] as const };
    }

    const videos = await listVideosByUserCategorySqlite({
      userId: user.id,
      categoryId,
    });

    return { success: true, videos };
  } catch (error) {
    console.error('listLearningCategoryVideos exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      videos: [] as const,
    };
  }
}

export async function listLearningCategoriesForVideo(videoId: string) {
  try {
    const user = await getAppUserFromServer();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.', categories: [] as const };
    }

    const categories = await listUserCategoriesForVideoSqlite({
      userId: user.id,
      videoId,
    });

    return { success: true, categories };
  } catch (error) {
    console.error('listLearningCategoriesForVideo exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      categories: [] as const,
    };
  }
}
