import Link from 'next/link';
import Image from 'next/image';
import { Layers, ChevronRight, Clock } from 'lucide-react';

export type Bundle = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  level: number;
  created_at: string;
  category_name?: string | null;
};

interface BundleSectionProps {
  bundles: Bundle[];
}

export default function BundleSection({ bundles }: BundleSectionProps) {
  if (bundles.length === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-black text-blue-600 uppercase tracking-widest">Learning Bundles</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">추천 학습 번들</h2>
            <p className="mt-3 text-gray-500 font-medium">정교하게 선별된 문장 세트로 실력을 쌓아보세요.</p>
          </div>
          <Link
            href="/bundles"
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors group"
          >
            전체보기
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bundles.map((bundle) => (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.id}`}
              className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                {bundle.thumbnail_url ? (
                  <Image
                    src={bundle.thumbnail_url}
                    alt={bundle.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <Layers className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 bg-white/90 backdrop-blur-sm text-blue-600 text-[10px] font-black rounded-full shadow-sm uppercase tracking-wider">
                    Lv.{bundle.level || 1}
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-grow">
                <div className="mb-2">
                  {bundle.category_name && (
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 block">
                      {bundle.category_name}
                    </span>
                  )}
                  <h3 className="font-bold text-gray-900 line-clamp-2 min-h-[3rem] group-hover:text-blue-600 transition-colors">
                    {bundle.title}
                  </h3>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <Clock className="w-3 h-3" />
                    {new Date(bundle.created_at).toLocaleDateString('ko-KR')}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 sm:hidden">
          <Link
            href="/bundles"
            className="flex items-center justify-center w-full py-4 bg-gray-50 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            전체 번들 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
