import { listBoardPostsSqlite } from '@/lib/sqlite/board';
import { getAppUserFromServer } from '@/lib/auth/app-user';
import Link from 'next/link';
import { MessageSquare, PenSquare, FileText, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BoardPageProps {
  searchParams?: Promise<{ page?: string }>;
}

const PAGE_SIZE = 20;

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const user = await getAppUserFromServer();
  const resolvedParams = searchParams ? await searchParams : undefined;
  const currentPage = Math.max(1, Number(resolvedParams?.page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const { posts, total } = await listBoardPostsSqlite({ limit: PAGE_SIZE, offset });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <MessageSquare className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">게시판</h1>
            <p className="text-sm text-gray-500 mt-1">스크립트 CSV 파일을 공유하고 학습 정보를 나눠보세요</p>
          </div>
        </div>
        {user && (
          <Link
            href="/board/write"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex-shrink-0 w-full sm:w-auto"
          >
            <PenSquare className="w-4 h-4" />
            글쓰기
          </Link>
        )}
      </div>

      {/* 게시글 목록 */}
      {posts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">아직 게시글이 없습니다</h3>
          <p className="text-gray-500 text-sm">첫 번째 글을 작성해보세요!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_140px_80px_100px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            <span>제목</span>
            <span className="text-center">작성자</span>
            <span className="text-center">조회</span>
            <span className="text-center">작성일</span>
          </div>

          {/* 게시글 행 */}
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/board/${post.id}`}
              className="block border-b border-gray-100 last:border-b-0 hover:bg-blue-50/50 transition-colors"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_80px_100px] gap-1 sm:gap-4 px-5 py-3.5 sm:items-center">
                {/* 제목 + 첨부 아이콘 */}
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                  {post.file_name && (
                    <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>

                {/* 작성자 */}
                <div className="text-sm text-gray-500 sm:text-center truncate">
                  {post.user_email
                    ? post.user_email.split('@')[0]
                    : '익명'}
                </div>

                {/* 조회수 */}
                <div className="text-sm text-gray-500 sm:text-center flex items-center sm:justify-center gap-1">
                  <Eye className="w-3.5 h-3.5 sm:hidden" />
                  {post.view_count}
                </div>

                {/* 작성일 */}
                <div className="text-sm text-gray-400 sm:text-center">
                  {new Date(post.created_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link
              href={`/board?page=${currentPage - 1}`}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              이전
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
            .reduce<number[]>((acc, p) => {
              if (acc.length > 0 && p - acc[acc.length - 1] > 1) acc.push(-1);
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
              ) : (
                <Link
                  key={p}
                  href={`/board?page=${p}`}
                  className={`px-3 py-2 text-sm rounded-lg transition ${
                    p === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </Link>
              )
            )}
          {currentPage < totalPages && (
            <Link
              href={`/board?page=${currentPage + 1}`}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              다음
            </Link>
          )}
        </div>
      )}

      {/* 비로그인 안내 */}
      {!user && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-sm text-blue-800 mb-3">글을 작성하려면 로그인이 필요합니다.</p>
          <Link
            href="/auth/login?redirectTo=/board"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            로그인
          </Link>
        </div>
      )}
    </div>
  );
}
