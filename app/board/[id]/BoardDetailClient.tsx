'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Trash2, Eye, Clock } from 'lucide-react';

interface BoardDetailClientProps {
  post: {
    id: number;
    title: string;
    content: string;
    userName: string;
    fileName: string | null;
    viewCount: number;
    createdAt: string;
  };
  canDelete: boolean;
}

export default function BoardDetailClient({ post, canDelete }: BoardDetailClientProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/board/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/board');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* 뒤로가기 */}
      <div className="mb-6">
        <Link href="/board" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft className="w-4 h-4" />
          게시판으로 돌아가기
        </Link>
      </div>

      {/* 게시글 */}
      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>{post.userName}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {post.viewCount}
            </span>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6">
          {post.content ? (
            <div className="prose prose-gray max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
              {post.content}
            </div>
          ) : (
            <p className="text-gray-400 italic">내용이 없습니다.</p>
          )}
        </div>

        {/* 첨부파일 */}
        {post.fileName && (
          <div className="mx-6 mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Download className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm text-emerald-700 truncate">{post.fileName}</span>
            </div>
            <a
              href={`/api/board/${post.id}/download`}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex-shrink-0 ml-3"
            >
              다운로드
            </a>
          </div>
        )}
      </article>

      {/* 삭제 버튼 */}
      {canDelete && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      )}
    </div>
  );
}
