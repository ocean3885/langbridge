import { listBundles } from '@/lib/supabase/services/bundles';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  Camera,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  Landmark,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Users,
  Waves,
} from 'lucide-react';
import { getDisplayLanguage } from '@/lib/auth/app-user';

export const dynamic = 'force-dynamic';

type BundleRow = {
  id: string;
  title: string;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  thumbnail_url?: string | null;
  level?: number | null;
  created_at?: string;
  is_published?: boolean | null;
  bundle_category?: {
    id?: string | number | null;
    name?: string | null;
    name_en?: string | null;
  } | null;
};

const translations = {
  ko: {
    title: 'Explore Bundles',
    description: 'Choose from six learning paths designed to help you build Spanish naturally, one bundle at a time.',
    search: 'Search bundles, topics, or situations...',
    paths: 'Our Learning Paths',
    featured: 'Featured this week',
    start: 'Start Bundle',
    preview: 'Preview',
    viewAll: 'View all',
    noBundlesTitle: 'No published bundles',
    noBundlesDesc: 'New learning bundles are being prepared. Please wait!',
    bundles: 'bundles',
    lessons: 'lessons',
    minutes: 'min',
    beginner: 'Beginner',
    journey: 'Start your Spanish journey',
    journeySub: 'Step by step, in your way.',
  },
  en: {
    title: 'Explore Bundles',
    description: 'Choose from six learning paths designed to help you build Spanish naturally, one bundle at a time.',
    search: 'Search bundles, topics, or situations...',
    paths: 'Our Learning Paths',
    featured: 'Featured this week',
    start: 'Start Bundle',
    preview: 'Preview',
    viewAll: 'View all',
    noBundlesTitle: 'No published bundles',
    noBundlesDesc: 'New learning bundles are being prepared. Please wait!',
    bundles: 'bundles',
    lessons: 'lessons',
    minutes: 'min',
    beginner: 'Beginner',
    journey: 'Start your Spanish journey',
    journeySub: 'Step by step, in your way.',
  },
};

const learningPaths = [
  {
    key: 'hola-start',
    title: 'Hola Start',
    description: 'Begin with greetings, basics, and essential beginner Spanish.',
    icon: Waves,
    color: 'bg-[#edf3df]',
    iconColor: 'text-[#4f8a50]',
  },
  {
    key: 'phrase-master',
    title: 'Phrase Master',
    description: 'Practice useful phrases you can use in daily life and travel.',
    icon: MessageCircle,
    color: 'bg-[#ffe3ad]',
    iconColor: 'text-[#8a6828]',
  },
  {
    key: 'scenario-talk',
    title: 'Scenario Talk',
    description: 'Learn through real-life conversations in everyday situations.',
    icon: Users,
    color: 'bg-[#dce9f6]',
    iconColor: 'text-[#4c7197]',
  },
  {
    key: 'photo-scene',
    title: 'Photo Scene',
    description: 'Describe photos and scenes to build your speaking skills.',
    icon: Camera,
    color: 'bg-[#e7def9]',
    iconColor: 'text-[#7260a8]',
  },
  {
    key: 'short-story',
    title: 'Short Story',
    description: 'Follow short stories and learn Spanish in context.',
    icon: BookOpen,
    color: 'bg-[#f9dfca]',
    iconColor: 'text-[#9a6645]',
  },
  {
    key: 'culture-insight',
    title: 'Culture Insight',
    description: 'Explore the cultures, customs, and lifestyles of Spanish-speaking countries.',
    icon: Landmark,
    color: 'bg-[#e9f0dc]',
    iconColor: 'text-[#637d50]',
  },
];

const fallbackImages = [
  '/images/heroimg_land.jpg',
  '/images/main.png',
  '/images/heroimg_port.jpg',
];

export default async function BundlesPage() {
  const [allBundles, lang] = await Promise.all([listBundles(), getDisplayLanguage()]);
  const t = translations[lang];
  const publishedBundles = (allBundles as BundleRow[]).filter((bundle) => bundle.is_published);
  const featuredBundle = publishedBundles[0] ?? null;
  const groupedBundles = groupBundlesByPath(publishedBundles);

  return (
    <div className="mx-auto max-w-7xl px-2 pb-12 text-[#1f1b18]">
      <section className="grid gap-8 py-8 md:py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            {t.title}
            <span className="ml-4 inline-flex translate-y-1 text-[#6d9b6d]">
              <Sparkles className="h-8 w-8" />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">{t.description}</p>
          <div className="mt-8 flex max-w-xl items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <Search className="h-5 w-5 shrink-0 text-zinc-500" />
            <span className="truncate text-sm text-zinc-500">{t.search}</span>
          </div>
        </div>

        <div className="hidden rounded-2xl border border-zinc-200 bg-[#fffaf1] p-7 shadow-sm lg:block">
          <p className="text-center font-serif text-lg">{t.journey}</p>
          <p className="mt-1 text-center text-sm text-zinc-600">{t.journeySub}</p>
          <div className="mt-8 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 text-center">
            {[
              { title: 'Hola Start', icon: Waves },
              { title: 'Phrase Master', icon: MessageCircle },
              { title: 'Scenario Talk', icon: Users },
            ].map((item, index) => (
              <JourneyStep key={item.title} icon={item.icon} title={item.title} showArrow={index < 2} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl font-semibold">{t.paths}</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-6">
          {learningPaths.map((path) => {
            const count = groupedBundles[path.key]?.length || 0;

            return (
              <a
                key={path.key}
                href={`#${path.key}`}
                className="group flex min-h-64 flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${path.color}`}>
                  <path.icon className={`h-10 w-10 ${path.iconColor}`} />
                </div>
                <h3 className="mt-5 text-center font-serif text-xl font-semibold">{path.title}</h3>
                <p className="mt-2 flex-1 text-center text-sm leading-6 text-zinc-600">{path.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#2f7d4a]">
                    {count || fallbackCount(path.key)} {t.bundles}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white transition group-hover:bg-[#2f7d4a] group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {featuredBundle ? (
        <FeaturedBundle bundle={featuredBundle} language={lang} />
      ) : (
        <EmptyState title={t.noBundlesTitle} description={t.noBundlesDesc} />
      )}

      <div className="mt-8 space-y-8">
        {learningPaths.map((path) => {
          const bundles = (groupedBundles[path.key]?.length ? groupedBundles[path.key] : publishedBundles).slice(0, 4);
          if (bundles.length === 0) return null;

          return (
            <section key={path.key} id={path.key} className="scroll-mt-24">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl font-semibold">{path.title}</h2>
                  <p className="mt-1 hidden truncate text-sm text-zinc-500 sm:block">{path.description}</p>
                </div>
                <a href={`#${path.key}`} className="flex shrink-0 items-center gap-1 text-sm font-medium text-zinc-700">
                  {t.viewAll}
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <div className="grid grid-cols-[repeat(3,minmax(150px,1fr))] gap-4 overflow-x-auto pb-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {bundles.map((bundle, index) => (
                  <BundleCard key={`${path.key}-${bundle.id}`} bundle={bundle} index={index} language={lang} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function JourneyStep({
  icon: Icon,
  title,
  showArrow,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  showArrow: boolean;
}) {
  return (
    <>
      <div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f0dc] text-[#5b8c56]">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-3 text-sm font-medium">{title}</p>
      </div>
      {showArrow && <div className="h-px bg-[#a9794c]" />}
    </>
  );
}

function FeaturedBundle({ bundle, language }: { bundle: BundleRow; language: 'ko' | 'en' }) {
  const t = translations[language];
  const title = getBundleTitle(bundle, language);
  const description = getBundleDescription(bundle, language);
  const image = getBundleImage(bundle, 0);

  return (
    <section className="mt-6 grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-[0.92fr_1fr]">
      <div className="relative min-h-64 lg:min-h-56">
        <Image src={image} alt={title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
      </div>
      <div className="p-6 lg:p-8">
        <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#f07124]">
          <Flame className="h-4 w-4" />
          {t.featured}
        </p>
        <h2 className="font-serif text-3xl font-semibold leading-tight">{title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">{description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
          <span className="rounded-full bg-[#f8dfb7] px-3 py-1 font-medium text-[#7d6230]">
            {getCategoryName(bundle, language)}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {t.beginner} A{bundle.level || 1}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {lessonCount(bundle)} {t.lessons}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {lessonCount(bundle) * 4} {t.minutes}
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/bundles/${bundle.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#57985a] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#477f4a]"
          >
            {t.start}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/bundles/${bundle.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-7 py-3 text-sm font-bold transition hover:bg-zinc-50"
          >
            {t.preview}
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function BundleCard({ bundle, index, language }: { bundle: BundleRow; index: number; language: 'ko' | 'en' }) {
  const title = getBundleTitle(bundle, language);

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
          <span>{translations[language].beginner} A{bundle.level || 1}</span>
          <span>{lessonCount(bundle)} {translations[language].lessons}</span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
      <h2 className="text-xl font-bold text-zinc-800">{title}</h2>
      <p className="mt-2 text-zinc-500">{description}</p>
    </div>
  );
}

function groupBundlesByPath(bundles: BundleRow[]) {
  return bundles.reduce<Record<string, BundleRow[]>>((groups, bundle) => {
    const key = getPathKey(bundle);
    if (!groups[key]) groups[key] = [];
    groups[key].push(bundle);
    return groups;
  }, {});
}

function getPathKey(bundle: BundleRow) {
  const category = `${bundle.bundle_category?.name_en || ''} ${bundle.bundle_category?.name || ''}`.toLowerCase();
  const title = `${bundle.title_en || ''} ${bundle.title || ''}`.toLowerCase();
  const value = `${category} ${title}`;

  if (value.includes('phrase') || value.includes('cafe') || value.includes('restaurant')) return 'phrase-master';
  if (value.includes('scenario') || value.includes('talk') || value.includes('airport') || value.includes('hotel')) return 'scenario-talk';
  if (value.includes('photo') || value.includes('scene') || value.includes('market') || value.includes('street')) return 'photo-scene';
  if (value.includes('story') || value.includes('day') || value.includes('trip')) return 'short-story';
  if (value.includes('culture') || value.includes('festival') || value.includes('breakfast') || value.includes('tapas')) return 'culture-insight';
  return 'hola-start';
}

function getBundleTitle(bundle: BundleRow, language: 'ko' | 'en') {
  return (language === 'en' ? bundle.title_en : bundle.title) || bundle.title || bundle.title_en || 'Untitled Bundle';
}

function getBundleDescription(bundle: BundleRow, language: 'ko' | 'en') {
  return (
    (language === 'en' ? bundle.description_en : bundle.description) ||
    bundle.description ||
    bundle.description_en ||
    'Learn naturally with short lessons, questions, and practical review.'
  );
}

function getCategoryName(bundle: BundleRow, language: 'ko' | 'en') {
  return (
    (language === 'en' ? bundle.bundle_category?.name_en : bundle.bundle_category?.name) ||
    bundle.bundle_category?.name ||
    bundle.bundle_category?.name_en ||
    'Hola Start'
  );
}

function getBundleImage(bundle: BundleRow, index: number) {
  return bundle.thumbnail_url || fallbackImages[index % fallbackImages.length];
}

function lessonCount(bundle: BundleRow) {
  const level = Number(bundle.level || 1);
  return Math.max(5, Math.min(8, level + 5));
}

function fallbackCount(key: string) {
  const counts: Record<string, number> = {
    'hola-start': 12,
    'phrase-master': 18,
    'scenario-talk': 16,
    'photo-scene': 16,
    'short-story': 15,
    'culture-insight': 13,
  };
  return counts[key] || 12;
}
