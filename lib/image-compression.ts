const IMAGE_UPLOAD_MAX_WIDTH = 1024;
const IMAGE_UPLOAD_WEBP_QUALITY = 0.82;

export async function compressImageForUpload(file: File) {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_UPLOAD_MAX_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', IMAGE_UPLOAD_WEBP_QUALITY);
  });

  if (!blob) return file;

  const fileBaseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${fileBaseName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}
