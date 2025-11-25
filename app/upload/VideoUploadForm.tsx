'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerVideo } from '@/app/actions/video';

interface VideoUploadFormProps {
  languages: Array<{ id: number; name_ko: string; code: string }>;
  categories: Array<{ id: number | string; name: string; language_id?: number | null }>;
}

export default function VideoUploadForm({ languages, categories }: VideoUploadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    title: '',
    description: '',
    lang: 'ko',
    videoLanguageId: '',
    categoryId: '',
    transcriptFile: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let transcriptText = '';
      if (formData.transcriptFile) {
        transcriptText = await parseCsvToTranscriptText(formData.transcriptFile);
      } else {
        alert('스크립트 CSV 파일을 업로드해주세요.');
        setIsSubmitting(false);
        return;
      }

      const result = await registerVideo({
        youtubeUrl: formData.youtubeUrl,
        title: formData.title,
        description: formData.description || undefined,
        transcriptText: transcriptText,
        lang: formData.lang || 'ko',
        languageId: formData.videoLanguageId ? Number(formData.videoLanguageId) : null,
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
      });

      if (result.success) {
        alert('영상이 성공적으로 등록되었습니다.');
        router.push('/videos');
      } else {
        alert(result.error || '영상 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('영상 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // 카테고리 선택 시 해당 카테고리의 언어에 맞춰 영상 언어 자동 설정
    if (name === 'categoryId') {
      if (value) {
        // 카테고리가 선택된 경우 (UUID 문자열 비교)
        const selectedCategory = categories.find(c => String(c.id) === String(value));
        
        if (selectedCategory?.language_id) {
          // 카테고리에 언어가 설정되어 있으면 영상 언어를 강제 설정
          setFormData((prev) => ({ 
            ...prev, 
            categoryId: value,
            videoLanguageId: String(selectedCategory.language_id)
          }));
          return;
        } else {
          // 카테고리에 언어가 없으면 categoryId만 설정
          setFormData((prev) => ({ 
            ...prev, 
            categoryId: value
          }));
          return;
        }
      } else {
        // 카테고리 선택 해제 시 영상 언어도 초기화
        setFormData((prev) => ({ 
          ...prev, 
          categoryId: '',
          videoLanguageId: ''
        }));
        return;
      }
    }
    
    // 영상 언어를 직접 변경하려고 할 때, 카테고리에 언어가 설정되어 있으면 무시
    if (name === 'videoLanguageId' && formData.categoryId) {
      const selectedCategory = categories.find(c => String(c.id) === String(formData.categoryId));
      if (selectedCategory?.language_id) {
        // 카테고리 언어가 설정되어 있으면 변경 불가
        return;
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // CSV parsing helpers
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result.map(s => s.trim());
  }

  function timeToSeconds(timeStr: string): number {
    const parts = timeStr.trim().split(':').map(s => parseFloat(s));
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      const [m, s] = parts;
      return m * 60 + s;
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  }

  async function parseCsvToTranscriptText(file: File): Promise<string> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows = lines.map(line => parseCsvLine(line)).filter(fields => fields.length >= 3);
    if (rows.length === 0) throw new Error('CSV 파일에 유효한 데이터가 없습니다.');

    const starts = rows.map(r => timeToSeconds(r[0]));
    const parts = rows.map((r, i) => {
      const start = starts[i];
      const nextStart = starts[i + 1];
      const end = nextStart && nextStart > start ? nextStart - 0.01 : start + 3;
      const original = r[1];
      const translated = r[2];
      return `${start.toFixed(2)} ${end.toFixed(2)} ${original} | ${translated}`;
    });

    return parts.join('\n');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
      {/* YouTube URL */}
      <div>
        <label htmlFor="youtubeUrl" className="block text-sm font-medium mb-2">
          YouTube URL *
        </label>
        <input
          type="text"
          id="youtubeUrl"
          name="youtubeUrl"
          value={formData.youtubeUrl}
          onChange={handleChange}
          required
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-sm text-gray-500 mt-1">
          YouTube 영상 URL을 입력하세요
        </p>
      </div>

      {/* 제목 */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          제목 *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="영상 제목"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* 설명 */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          설명
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="영상 설명 (선택사항)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
        />
      </div>

      {/* 카테고리 */}
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium mb-2">
          카테고리
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">카테고리 선택 (선택사항)</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 영상 언어 */}
      <div>
        <label htmlFor="videoLanguageId" className="block text-sm font-medium mb-2">
          영상 언어 *
          {formData.categoryId && categories.find(c => String(c.id) === String(formData.categoryId))?.language_id && (
            <span className="ml-2 text-xs text-blue-600">(카테고리 언어로 고정됨)</span>
          )}
        </label>
        <select
          id="videoLanguageId"
          name="videoLanguageId"
          value={formData.videoLanguageId}
          onChange={handleChange}
          required
          disabled={formData.categoryId && categories.find(c => String(c.id) === String(formData.categoryId))?.language_id ? true : false}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">언어 선택</option>
          {languages.map(l => (
            <option key={l.id} value={l.id}>{l.name_ko}</option>
          ))}
        </select>
      </div>

      {/* 번역 언어 */}
      <div>
        <label htmlFor="lang" className="block text-sm font-medium mb-2">
          번역 언어
        </label>
        <select
          id="lang"
          name="lang"
          value={formData.lang}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* 스크립트 CSV 파일 */}
      <div>
        <label htmlFor="transcriptCsv" className="block text-sm font-medium mb-2">
          스크립트 CSV 파일 *
        </label>
        <input
          id="transcriptCsv"
          name="transcriptCsv"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFormData(prev => ({ ...prev, transcriptFile: e.target.files?.[0] ?? null }))}
          required
          className="w-full px-2 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-sm text-gray-500 mt-1">
          CSV 형식: 시작시간,원문,번역
          <br />예: 0:00:10,good afternoon,좋은 오후입니다
        </p>
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? '등록 중...' : '영상 등록'}
        </button>
      </div>

      {/* 도움말 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">💡 스크립트 CSV 형식 안내</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• CSV 형식: 시작시간,원문,번역</li>
          <li>• 타임스탬프 예시: 0:00:10 (H:MM:SS 또는 MM:SS)</li>
          <li>• 텍스트에 쉼표가 포함되면 &ldquo;&rdquo;로 감싸세요</li>
          <li>• 빈 줄은 자동으로 무시됩니다</li>
        </ul>
      </div>
    </form>
  );
}
