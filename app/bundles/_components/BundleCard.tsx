import Image from 'next/image';
import Link from 'next/link';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { translations } from '../bundle-data';
import { bundleItemCount, getBundleImage, getBundleTitle } from '../bundle-utils';
import type { BundleRow, Language } from '../types';

export function BundleCard({ bundle, index, language }: { bundle: BundleRow; index: number; language: Language }) {
  const title = getBundleTitle(bundle, language);
  const copy = translations[language];
  const level = getBundleLevelDisplay(bundle.level, language);

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
          <span>{level.label}</span>
          <span>
            {bundleItemCount(bundle)} {copy.items}
          </span>
        </div>
      </div>
    </Link>
  );
}
