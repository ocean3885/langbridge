// langbridge/app/upload/page.tsx
import { createClient } from '@/lib/supabase/server';
import { processFileAction } from './actions'; // 5단계에서 만들 Server Action

export default async function UploadPage() {
  const supabase = await createClient();
  
  // 카테고리 목록 가져오기
  const { data: categories } = await supabase.from('categories').select('*');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">새 오디오 콘텐츠 업로드</h1>
      {/* <form>에 action={processFileAction}을 연결합니다.
        이것이 Next.js의 Server Action 방식입니다.
      */}
      <form action={processFileAction} className="space-y-4">
        <div>
          <label htmlFor="title" className="block font-medium">제목</label>
          <input type="text" name="title" id="title" required className="w-full border p-2" />
        </div>
        
        <div>
          <label htmlFor="category" className="block font-medium">카테고리</label>
          <select name="category" id="category" className="w-full border p-2">
            <option value="">선택 안 함</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="input_file" className="block font-medium">TXT 파일</label>
          <input type="file" name="input_file" id="input_file" accept=".txt" required />
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          업로드 및 처리 시작
        </button>
      </form>
    </div>
  );
}