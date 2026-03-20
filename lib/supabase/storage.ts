export function getStorageBucket(): string {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket || !bucket.trim()) {
    throw new Error('SUPABASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다. (.env.local 확인)');
  }
  return bucket.trim();
}

export function isBucketNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { statusCode?: string | number; message?: string };
  return (
    String(maybeError.statusCode) === '404' ||
    (typeof maybeError.message === 'string' && maybeError.message.includes('Bucket not found'))
  );
}
