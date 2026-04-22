'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { registerEduVideo } from '@/app/actions/edu-video';
import CategoryManageModal from '@/components/common/CategoryManageModal';

export default function RegisterVideoForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [formData, setFormData] = useState({
    youtubeUrl: '',
    title: '',
    description: '',
    videoLanguageId: '', // 영상 언어 (languages 테이블 id)
    categoryId: '',
    channelId: '', // 영상 채널 (video_channels.id)
  });
  const [languages, setLanguages] = useState<{ id: number; name_ko: string; name_en: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string; language_id: number | null }[]>([]);
  const [channels, setChannels] = useState<{ id: string; channel_name: string; channel_url?: string | null; language_id?: number | null }[]>([]);

  // 영상 언어 목록 불러오기 (관리자 전용 API 재활용)
  useEffect(() => {
    fetch('/api/admin/languages')
      .then(r => r.json())
      .then(setLanguages)
      .catch(err => console.error('언어 목록 로드 오류:', err));
  }, []);

  useEffect(() => {
    fetch('/api/edu-video-categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(err => console.error('카테고리 목록 로드 오류:', err));
  }, []);

  // 채널 목록 불러오기
  useEffect(() => {
    fetch('/api/admin/channels')
      .then(r => r.json())
      .then(setChannels)
      .catch(err => console.error('채널 목록 로드 오류:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await registerEduVideo({
        youtubeUrl: formData.youtubeUrl,
        title: formData.title,
        description: formData.description || undefined,
        languageId: formData.videoLanguageId ? Number(formData.videoLanguageId) : null,
        categoryId: formData.categoryId || null,
        channelId: formData.channelId || null,
      });

      if (result.success) {
        alert('영상이 성공적으로 등록되었습니다.');
        router.push('/admin/videos');
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  async function handleCategoryChanged() {
    try {
      const response = await fetch('/api/edu-video-categories');
      if (!response.ok) return;
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('교육 영상 카테고리 목록 새로고침 실패:', error);
    }
  }

  const filteredCategories = categories.filter((category) => {
    if (!formData.videoLanguageId) return true;
    return category.language_id === Number(formData.videoLanguageId);
  });

  return (
    <div className="min-h-screen bg-gray-50 ml-64 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">영상 등록</h1>
          <p className="text-gray-600 mt-2">학습용 YouTube 영상을 edu_videos 테이블에 등록합니다.</p>
        </div>

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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          <p className="text-sm text-gray-500 mt-1">
            YouTube 영상 URL을 입력하세요 (예: https://www.youtube.com/watch?v=dQw4w9WgXcQ)
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
          />
        </div>

        {/* 채널 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="channelId" className="block text-sm font-medium">채널</label>
            <a href="/admin/channels/register" className="text-xs text-blue-600 hover:underline">채널 추가</a>
          </div>
          {channels.length === 0 ? (
            <div className="text-sm text-gray-600 mb-2">
              등록된 채널이 없습니다. <a href="/admin/channels/register" className="text-blue-600 hover:underline">채널 추가 페이지</a>에서 먼저 채널을 등록해주세요.
            </div>
          ) : null}
          <select
            id="channelId"
            name="channelId"
            value={formData.channelId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="">채널 선택 (선택사항)</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.channel_name}</option>
            ))}
          </select>
        </div>

        {/* 영상 언어 */}
        <div>
          <label htmlFor="videoLanguageId" className="block text-sm font-medium mb-2">
            영상 언어
          </label>
          <select
            id="videoLanguageId"
            name="videoLanguageId"
            value={formData.videoLanguageId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="">언어 선택</option>
            {languages.map(l => (
              <option key={l.id} value={l.id}>{l.name_ko} ({l.name_en})</option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="categoryId" className="block text-sm font-medium">
              교육 영상 카테고리
            </label>
            <button
              type="button"
              onClick={() => setShowManageModal(true)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Settings className="h-3.5 w-3.5" />
              카테고리 관리
            </button>
          </div>
          <select
            id="categoryId"
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="">카테고리 미지정</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={String(category.id)}>{category.name}</option>
            ))}
          </select>
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
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </form>

      <CategoryManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onCategoryChanged={handleCategoryChanged}
        initialCategories={categories}
        initialLanguages={languages.map((language) => ({
          id: language.id,
          name_ko: language.name_ko,
          code: language.name_en ?? '',
        }))}
        apiEndpoint="/api/edu-video-categories"
        contentType="교육 영상"
      />
      </div>
    </div>
  );
}
