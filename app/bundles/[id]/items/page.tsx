import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, ImageIcon, Play, Volume2 } from 'lucide-react';
import { getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { getPublicUrl } from '@/lib/utils';
import { getBundleDescription, getBundleTitle } from '../../bundle-utils';

interface BundleItemsPageProps {
  params: Promise<{ id: string }>;
}

const copy = {
  ko: {
    back: '상세로 돌아가기',
    title: 'All Items',
    count: (count: number) => `${count}개 표현`,
    empty: '등록된 학습 항목이 없습니다.',
    learnFromHere: '여기부터 학습',
    noTranslation: '번역이 등록되지 않았습니다.',
    noSentence: '문장이 등록되지 않았습니다.',
  },
  en: {
    back: 'Back to detail',
    title: 'All Items',
    count: (count: number) => `${count} items`,
    empty: 'No learning items yet.',
    learnFromHere: 'Learn from here',
    noTranslation: 'No translation provided.',
    noSentence: 'No sentence provided.',
  },
};

export default async function BundleItemsPage({ params }: BundleItemsPageProps) {
  const { id } = await params;
  const [bundle, items, language] = await Promise.all([getBundle(id), listBundleItems(id), getDisplayLanguage()]);

  if (!bundle) notFound();

  const t = copy[language];
  const title = getBundleTitle(bundle, language);
  const description = getBundleDescription(bundle, language);

  return (
    <div className="mx-auto max-w-5xl pb-12 text-[#191715]">
      <header className="mb-5">
        <Link href={`/bundles/${bundle.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-[#2f7d4a]">
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Link>
        <div className="mt-5 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm md:p-7">
          <p className="inline-flex rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-black text-[#2f7d4a]">{t.title}</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-black leading-tight text-zinc-950 md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-600 md:text-base">{description}</p>
            </div>
            <p className="shrink-0 text-sm font-black text-zinc-500">{t.count(items.length)}</p>
          </div>
        </div>
      </header>

      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item, index) => {
            const sentence = item.sentences?.sentence || item.words?.word || t.noSentence;
            const translation =
              (language === 'en' ? item.sentences?.translation_en : item.sentences?.translation) ||
              item.sentences?.translation ||
              item.words?.meaning_ko ||
              item.words?.meaning_en ||
              t.noTranslation;
            const imageUrl = item.image_url || bundle.thumbnail_url;
            const audioUrl = getPublicUrl(item.audio_url || item.sentences?.audio_url);

            return (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition hover:border-[#d3ead9] md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f3ede3]">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={sentence} fill className="object-cover" sizes="120px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#8b7c66]">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dff1e5] text-xs font-black text-[#2f7d4a]">
                      {index + 1}
                    </span>
                    <span className="text-xs font-black uppercase text-zinc-400">
                      {item.sentence_id ? 'Sentence' : 'Word'}
                    </span>
                  </div>
                  <h2 className="text-lg font-black leading-relaxed text-zinc-950">{sentence}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">{translation}</p>
                </div>

                <div className="flex gap-2 md:flex-col">
                  {audioUrl && (
                    <a
                      href={audioUrl}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                    >
                      <Volume2 className="h-4 w-4" />
                      Audio
                    </a>
                  )}
                  <Link
                    href={`/bundles/${bundle.id}/learn?item=${item.id}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3f8d54] px-3 text-sm font-black text-white transition hover:bg-[#347946]"
                  >
                    <Play className="h-4 w-4" />
                    {t.learnFromHere}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-500">{t.empty}</p>
        </div>
      )}
    </div>
  );
}
