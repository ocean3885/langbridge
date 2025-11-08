// langbridge/app/upload/page.tsx
import { createClient } from '@/lib/supabase/server';
import { processFileAction } from './actions';
import UploadFormWrapper from './UploadFormWrapper';

export default async function UploadPage() {
  const supabase = await createClient();
  
  // ✅ 카테고리 목록 가져오기 (에러 처리 추가)
  const { data: categories, error: categoryError } = await supabase
    .from('lang_categories')
    .select('*')
    .order('name', { ascending: true });

  if (categoryError) {
    console.error('카테고리 로드 오류:', categoryError);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">새 오디오 콘텐츠 업로드</h1>
      
      {/* ℹ️ 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-blue-900 mb-2">📝 업로드 가이드</h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• TXT 파일 형식: 스페인어 문장과 한국어 번역을 한 줄씩 번갈아 입력</li>
          <li>• 예시: &ldquo;Hola&rdquo; (첫 줄) → &ldquo;안녕하세요&rdquo; (둘째 줄)</li>
          <li>• 처리 시간은 문장 수에 따라 다를 수 있습니다</li>
        </ul>
      </div>

      {categoryError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            ⚠️ 카테고리를 불러올 수 없습니다. 계속 진행할 수 있지만 카테고리 없이 저장됩니다.
          </p>
        </div>
      )}

      <UploadFormWrapper 
        processFileAction={processFileAction} 
        initialCategories={categories || []} 
      />
    </div>
  );
}