'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStorageBucket } from '@/lib/supabase/storage';

interface UploadAssetResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

function sanitizeStoragePath(path: string) {
  return path
    .split('/')
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/-+/g, '-'))
    .filter(Boolean)
    .join('/');
}

export async function uploadProcessedAsset(formData: FormData): Promise<UploadAssetResult> {
  const user = await getAppUserFromServer();
  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!isAdminUser) {
    return { success: false, error: '권한이 없습니다.' };
  }

  const file = formData.get('file');
  const rawPath = String(formData.get('path') ?? '');
  const upsert = String(formData.get('upsert') ?? 'false') === 'true';
  const storagePath = sanitizeStoragePath(rawPath);

  if (!(file instanceof File)) {
    return { success: false, error: '업로드할 파일이 없습니다.' };
  }

  if (!storagePath || !storagePath.endsWith('.webp')) {
    return { success: false, error: 'Storage path는 .webp 파일 경로여야 합니다.' };
  }

  if (file.type !== 'image/webp') {
    return { success: false, error: 'WebP 이미지 파일만 업로드할 수 있습니다.' };
  }

  try {
    const bucket = getStorageBucket();
    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      cacheControl: '31536000',
      contentType: 'image/webp',
      upsert,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return { success: true, publicUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.',
    };
  }
}
