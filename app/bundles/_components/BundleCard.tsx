import Image from 'next/image';
import Link from 'next/link';
import { translations } from '../bundle-data';
import { getBundleImage, getBundleTitle, lessonCount } from '../bundle-utils';
import type { BundleRow, Language } from '../types';

export function BundleCard({ bundle, index, language }: { bundle: BundleRow; index: number; language: Language }) {
  const title = getBundleTitle(bundle, language);
  const copy = translations[language];

  return (
    <Link
      href={`/bundles/${bundle.id}`}
      className="group min-w-[150px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[2.1/1] overflow-hidden bg-[#f3ede3] sm:aspect-[2.3/1]">
        <Image
          src={getBundleImage(bundle, index)}
          alt={title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px"
        />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-zinc-900">{title}</h3>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span>{copy.beginner} A{bundle.level || 1}</span>
          <span>
            {lessonCount(bundle)} {copy.lessons}
          </span>
        </div>
      </div>
    </Link>
  );
}
