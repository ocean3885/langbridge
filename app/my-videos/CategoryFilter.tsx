import Link from 'next/link';

interface CategoryFilterProps {
  categories: { id: number; name: string }[];
  selectedCategoryId: number | null;
}

export default function CategoryFilter({ categories, selectedCategoryId }: CategoryFilterProps) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 mr-1">학습 카테고리 필터:</span>
        <Link
          href="/my-videos"
          className={`rounded-full px-3 py-1 text-sm border transition-colors ${
            selectedCategoryId === null
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:border-blue-300 hover:text-blue-700'
          }`}
        >
          전체
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/my-videos?learningCategoryId=${category.id}`}
            className={`rounded-full px-3 py-1 text-sm border transition-colors ${
              selectedCategoryId === category.id
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
