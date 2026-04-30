'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateEduVideo } from '@/app/actions/edu-video';
import CategoryManageModal from '@/components/common/CategoryManageModal';

interface EditEduVideoFormProps {
  video: {
    id: string;
    youtube_url: string;
    title: string;
    description: string | null;
    language_id: number | null;
    category_id: string | null;
    channel_id: string | null;
  };
  languages: Array<{ id: number; name_ko: string; name_en: string | null }>;
  categories: Array<{ id: number; name: string; language_id: number | null }>;
  channels: Array<{ id: string; channel_name: string }>;
}

export default function EditEduVideoForm({ video, languages, categories, channels }: EditEduVideoFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [formData, setFormData] = useState({
    youtubeUrl: video.youtube_url,
    title: video.title,
    description: video.description ?? '',
    languageId: video.language_id ? String(video.language_id) : '',
    categoryId: video.category_id ?? '',
    channelId: video.channel_id ?? '',
  });

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
      setCategoryOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('교육 영상 카테고리 목록 새로고침 실패:', error);
    }
  }

  const filteredCategories = categoryOptions.filter((category) => {
    if (!formData.languageId) return true;
    return category.language_id === Number(formData.languageId) || String(category.id) === formData.categoryId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateEduVideo({
      videoId: video.id,
      youtubeUrl: formData.youtubeUrl,
      title: formData.title,
      description: formData.description || null,
      languageId: formData.languageId ? Number(formData.languageId) : null,
      categoryId: formData.categoryId || null,
      channelId: formData.channelId || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push('/admin/videos');
      router.refresh();
      return;
    }

    alert(result.error || '영상 수정에 실패했습니다.');
  };

  return (
    <div className="min-h-screen bg-gray-50 md:ml-64 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">교육 영상 수정</h1>
          <p className="text-gray-600 mt-2">edu_videos 메타데이터를 수정합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
          <div>
            <label htmlFor="youtubeUrl" className="block text-sm font-medium mb-2">YouTube URL *</label>
            <input
              type="text"
              id="youtubeUrl"
              name="youtubeUrl"
              value={formData.youtubeUrl}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">제목 *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">설명</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white resize-none"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label htmlFor="languageId" className="block text-sm font-medium mb-2">언어</label>
              <select
                id="languageId"
                name="languageId"
                value={formData.languageId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">언어 미지정</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name_ko}{language.name_en ? ` (${language.name_en})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="categoryId" className="block text-sm font-medium">교육 영상 카테고리</label>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">카테고리 미지정</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={String(category.id)}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="channelId" className="block text-sm font-medium mb-2">채널</label>
              <select
                id="channelId"
                name="channelId"
                value={formData.channelId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">채널 미지정</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>{channel.channel_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '변경사항 저장'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </form>

        <CategoryManageModal
          isOpen={showManageModal}
          onClose={() => setShowManageModal(false)}
          onCategoryChanged={handleCategoryChanged}
          initialCategories={categoryOptions}
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