import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Eye, Flame, Star } from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import type { BundleRow, Language } from '../types';
import { translations } from '../bundle-data';
import {
  getBundleDescription,
  getBundleImage,
  getBundleTitle,
  getCategoryName,
  bundleItemCount,
} from '../bundle-utils';

export function FeaturedBundle({ bundle, language }: { bundle: BundleRow; language: Language }) {
  const copy = translations[language];
  const title = getBundleTitle(bundle, language);
  const description = getBundleDescription(bundle, language);
  const image = getBundleImage(bundle, 0);
  const level = getBundleLevelDisplay(bundle.level, language);

  return (
    <section className="mt-6 grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-[0.92fr_1fr]">
      <div className="relative min-h-64 lg:min-h-56">
        <Image src={image} alt={title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
      </div>
      <div className="p-6 lg:p-8">
        <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#f07124]">
          <Flame className="h-4 w-4" />
          {copy.featured}
        </p>
        <h2 className="font-serif text-3xl font-semibold leading-tight">{title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">{description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
          <span className="rounded-full bg-[#f8dfb7] px-3 py-1 font-medium text-[#7d6230]">
            {getCategoryName(bundle, language)}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {level.label}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {bundleItemCount(bundle)} {copy.items}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {bundleItemCount(bundle) * 4} {copy.minutes}
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/bundles/${bundle.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#57985a] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#477f4a]"
          >
            {copy.start}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/bundles/${bundle.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3 text-sm font-bold transition hover:bg-zinc-50"
          >
            {copy.preview}
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
