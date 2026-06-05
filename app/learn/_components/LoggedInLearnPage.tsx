import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Headphones,
  HelpCircle,
  Leaf,
  Layers,
  Trophy,
} from 'lucide-react';
import type { RecentStudiedBundle } from '@/lib/supabase/services/bundle-progress';
import { GoalCard, MiniListCard, ProgressChartCard, StreakCard } from './ProgressCards';
import { SectionHeader } from './SectionHeader';
import { activities, lessonCards, quickPractice } from './learn-page-data';

export function LoggedInLearnPage({ name, recentBundle }: { name: string; recentBundle: RecentStudiedBundle | null }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-2 pb-10 text-[#1f1b18] dark:text-zinc-100 lg:grid-cols-[1fr_360px]">
      <div className="space-y-9">
        <WelcomeSection name={name} />
        <ContinueLearningSection recentBundle={recentBundle} />
        <TodaysPicksSection />
        <RecentActivitySection />
        <QuickPracticeSection />
      </div>

      <LearnSidebar />
    </div>
  );
}

function WelcomeSection({ name }: { name: string }) {
  return (
    <section>
      <h1 className="font-serif text-4xl font-semibold sm:text-5xl">¡Buenos dias, {name}!</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-300">Keep going! Small lessons, big progress.</p>
    </section>
  );
}

function ContinueLearningSection({ recentBundle }: { recentBundle: RecentStudiedBundle | null }) {
  if (!recentBundle) {
    return <ContinueLearningEmptyState />;
  }

  const { bundle, currentItem, interaction, progressPercent, totalItems, completedItems } = recentBundle;
  const categoryName =
    bundle.bundle_category?.name_en ||
    bundle.bundle_category?.name ||
    bundle.bundle_type?.name ||
    'Learning Bundle';
  const title = bundle.title_en || bundle.title || 'Untitled Bundle';
  const imageSrc = bundle.thumbnail_url || '/images/heroimg_land.jpg';
  const currentLabel = currentItem?.order_index != null
    ? `Item ${currentItem.order_index + 1} of ${Math.max(totalItems, currentItem.order_index + 1)}`
    : `${completedItems} of ${totalItems} completed`;
  const sentencePreview =
    currentItem?.sentence?.sentence ||
    bundle.description_en ||
    bundle.description ||
    'Pick up where you left off.';
  const lastStudiedLabel = formatRelativeStudyDate(interaction.last_studied_at);
  const learnHref = interaction.current_bundle_item_id
    ? `/bundles/${bundle.id}/learn?item=${interaction.current_bundle_item_id}`
    : `/bundles/${bundle.id}/learn`;

  return (
    <section>
      <SectionHeader title="Continue Learning" href="/bundles" />
      <div className="mt-4 grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 md:grid-cols-[0.44fr_1fr]">
        <div className="relative min-h-64">
          {imageSrc ? (
            <Image src={imageSrc} alt={title} fill className="object-cover" sizes="360px" />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center bg-[#f3ede3] text-[#8b7c66] dark:bg-zinc-800 dark:text-zinc-500">
              <Layers className="h-14 w-14" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center p-7">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-[#4d8b4f]">{categoryName}</p>
            {lastStudiedLabel && (
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {lastStudiedLabel}
              </span>
            )}
          </div>
          <h2 className="mt-4 font-serif text-3xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{currentLabel}</p>
          <p className="mt-3 line-clamp-2 text-zinc-600 dark:text-zinc-300">{sentencePreview}</p>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full rounded-full bg-[#63a464]" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
            </div>
            <span className="text-sm font-medium tabular-nums">{progressPercent}%</span>
          </div>
          <div className="mt-7 flex items-center gap-4">
            <Link href={learnHref} className="rounded-full bg-[#63a464] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#4e9250]">
              Continue Lesson
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContinueLearningEmptyState() {
  return (
    <section>
      <SectionHeader title="Continue Learning" href="/bundles" />
      <div className="mt-4 flex flex-col gap-5 rounded-xl border border-dashed border-zinc-300 bg-white p-7 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200">
            <Compass className="h-7 w-7" />
          </span>
          <div>
            <h2 className="font-serif text-2xl font-semibold">Start your first bundle</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose a lesson bundle and your progress will appear here.</p>
          </div>
        </div>
        <Link href="/bundles" className="inline-flex items-center justify-center rounded-full bg-[#63a464] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4e9250]">
          Browse Bundles
        </Link>
      </div>
    </section>
  );
}

function TodaysPicksSection() {
  return (
    <section>
      <h2 className="font-serif text-2xl font-semibold">Today&apos;s Picks for You</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {lessonCards.map((card) => (
          <Link
            key={card.title}
            href="/bundles"
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
          >
            <div className="p-5">
              <p className="text-xs font-black uppercase tracking-wide text-[#5a975d]">{card.label}</p>
              <h3 className="mt-3 min-h-14 font-serif text-2xl font-semibold leading-tight">{card.title}</h3>
            </div>
            <div className="relative h-40">
              <Image src={card.image} alt={card.title} fill className="object-cover" sizes="(max-width: 1280px) 50vw, 260px" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Beginner</span>
              <span>{card.minutes}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentActivitySection() {
  return (
    <section>
      <SectionHeader title="Recent Activity" href="/my-videos" />
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        {activities.map((activity) => (
          <div key={activity.title} className="grid grid-cols-[76px_1fr_auto] items-center gap-4 border-b border-zinc-100 p-4 last:border-b-0 dark:border-zinc-800">
            <div className="relative h-14 overflow-hidden rounded-lg">
              <Image src={activity.image} alt="" fill className="object-cover" sizes="76px" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-bold">{activity.title}</h3>
              <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{activity.meta}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#4f934f]">{activity.status}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{activity.date}</p>
            </div>
          </div>
        ))}
        <div className="flex justify-center p-4">
          <Link href="/my-videos" className="rounded-full border border-zinc-200 px-10 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            View full history
          </Link>
        </div>
      </div>
    </section>
  );
}

function QuickPracticeSection() {
  return (
    <section>
      <h2 className="font-serif text-2xl font-semibold">Quick Practice</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Short activities to keep your Spanish fresh.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {quickPractice.map((item) => (
          <Link
            key={item.title}
            href="/bundles"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
          >
            <div className="flex items-center gap-4">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full ${item.color}`}>
                <item.icon className="h-7 w-7" />
              </span>
              <span>
                <strong className="block">{item.title}</strong>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</span>
              </span>
            </div>
            <ArrowRight className="h-5 w-5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function LearnSidebar() {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <StreakCard />
      <GoalCard />
      <ReviewCard />
      <QuoteCard />
      <ProgressSummaryCard />
      <EncouragementCard />
    </aside>
  );
}

function ReviewCard() {
  const rows = [
    { label: 'Vocabulary', value: 12, icon: BookOpen, color: 'bg-[#e4f0e1] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200' },
    { label: 'Expressions', value: 8, icon: Headphones, color: 'bg-[#e4edfb] text-[#5176bd] dark:bg-sky-950/50 dark:text-sky-200' },
    { label: 'Grammar', value: 5, icon: HelpCircle, color: 'bg-[#eee5fb] text-[#8564cf] dark:bg-violet-950/50 dark:text-violet-200' },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold">Review Needed</h3>
        <span className="rounded-full bg-[#ffe0bf] px-2 py-1 text-xs font-bold text-[#df7c38] dark:bg-orange-950/50 dark:text-orange-200">3</span>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${row.color}`}>
                <row.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{row.label}</span>
            </span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteCard() {
  return (
    <div className="overflow-hidden rounded-xl bg-[#fff0d9] p-7 shadow-sm dark:bg-amber-950/30 dark:text-amber-100 dark:shadow-black/20">
      <p className="font-serif text-xl leading-8">
        &ldquo;Every day in a new language is a step toward a new you.&rdquo;
      </p>
      <div className="mt-4 flex justify-end text-[#6c9b6e] dark:text-emerald-200">
        <Leaf className="h-14 w-14" />
      </div>
    </div>
  );
}

function ProgressSummaryCard() {
  const rows = [
    ['Lessons Completed', '28'],
    ['Words Learned', '236'],
    ['Expressions Mastered', '57'],
    ['Current Level', 'Beginner A2'],
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold">Your Progress</h3>
        <Link href="/profile" className="text-sm text-zinc-500 dark:text-zinc-400">View details</Link>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function EncouragementCard() {
  return (
    <div className="rounded-xl bg-[#fff0d9] p-7 shadow-sm dark:bg-amber-950/30 dark:text-amber-100 dark:shadow-black/20">
      <h3 className="font-serif text-xl font-semibold">You&apos;re doing amazing!</h3>
      <p className="mt-4 leading-7 text-zinc-600 dark:text-amber-100/80">Consistency is the key to fluency.</p>
      <div className="mt-5 flex justify-end text-[#6c9b6e] dark:text-emerald-200">
        <Trophy className="h-12 w-12" />
      </div>
    </div>
  );
}

function formatRelativeStudyDate(value: string | null | undefined) {
  if (!value) return null;

  const studiedAt = new Date(value);
  if (Number.isNaN(studiedAt.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - studiedAt.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return studiedAt.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });
}
