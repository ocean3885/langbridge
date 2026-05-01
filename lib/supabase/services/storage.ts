'use server';

import { createAdminClient } from '../admin';

/**
 * 이미지를 Supabase Storage의 'langbridge' 버킷에 업로드합니다.
 */
export async function uploadThumbnail(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) throw new Error('파일이 없습니다.');
  
  const supabase = createAdminClient();
  
  // 파일 확장자 추출
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `bundles/${fileName}`;

  // ArrayBuffer를 Buffer로 변환하여 업로드 (서버 사이드)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage
    .from('langbridge')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true
    });

  if (error) {
    console.error('Thumbnail upload error:', error);
    // 버킷이 없는 경우 등의 에러 처리가 필요할 수 있음
    throw new Error('이미지 업로드에 실패했습니다. (langbridge 버킷 확인 필요)');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('langbridge')
    .getPublicUrl(filePath);

  return publicUrl;
}
