import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  queryParams?: Record<string, string>;
}

export default function Pagination({ currentPage, totalPages, baseUrl, queryParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  // URL 생성 헬퍼 함수
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    // 기존 쿼리 파라미터 보존 (예: filter=saved)
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    if (page > 1) {
      params.append('page', page.toString());
    }
    const queryString = params.toString();
    return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
  };

  // 표시할 페이지 번호 계산 로직 (현재 페이지 기준 좌우 2개씩 표시)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  // 항상 5개의 페이지 번호가 표시되도록 보정
  if (currentPage <= 3) {
    endPage = Math.min(totalPages, 5);
  } else if (currentPage >= totalPages - 2) {
    startPage = Math.max(1, totalPages - 4);
  }

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="flex justify-center items-center gap-1 mt-12 mb-8">
      {/* 맨 처음으로 */}
      <Link
        href={createPageUrl(1)}
        className={`p-2 rounded-lg transition-all ${
          currentPage === 1
            ? 'pointer-events-none opacity-50 text-gray-400'
            : 'text-gray-700 hover:bg-gray-100 hover:text-emerald-600'
        }`}
        aria-label="First page"
      >
        <ChevronsLeft className="w-5 h-5" />
      </Link>

      {/* 이전 페이지 */}
      <Link
        href={createPageUrl(currentPage - 1)}
        className={`p-2 rounded-lg transition-all ${
          currentPage === 1
            ? 'pointer-events-none opacity-50 text-gray-400'
            : 'text-gray-700 hover:bg-gray-100 hover:text-emerald-600'
        }`}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </Link>

      {/* 번호판 */}
      <div className="flex gap-1 px-2">
        {pages.map((page) => (
          <Link
            key={page}
            href={createPageUrl(page)}
            className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg font-semibold transition-all ${
              currentPage === page
                ? 'bg-emerald-600 text-white shadow-md cursor-default pointer-events-none'
                : 'text-gray-700 hover:bg-gray-100 hover:text-emerald-600'
            }`}
          >
            {page}
          </Link>
        ))}
      </div>

      {/* 다음 페이지 */}
      <Link
        href={createPageUrl(currentPage + 1)}
        className={`p-2 rounded-lg transition-all ${
          currentPage === totalPages
            ? 'pointer-events-none opacity-50 text-gray-400'
            : 'text-gray-700 hover:bg-gray-100 hover:text-emerald-600'
        }`}
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </Link>

      {/* 맨 끝으로 */}
      <Link
        href={createPageUrl(totalPages)}
        className={`p-2 rounded-lg transition-all ${
          currentPage === totalPages
            ? 'pointer-events-none opacity-50 text-gray-400'
            : 'text-gray-700 hover:bg-gray-100 hover:text-emerald-600'
        }`}
        aria-label="Last page"
      >
        <ChevronsRight className="w-5 h-5" />
      </Link>
    </div>
  );
}
