import { MessageCircle, Search, Sparkles, Users, Waves } from 'lucide-react';
import { getDisplayFontClass } from '../bundle-utils';
import type { BundleCopy } from '../types';

export function BundlesHero({ copy }: { copy: BundleCopy }) {
  return (
    <section className="grid gap-8 py-8 md:py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
      <div>
        <h1 className={`${getDisplayFontClass(copy.title)} text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl`}>
          {copy.title}
          <span className="ml-4 inline-flex translate-y-1 text-[#6d9b6d]">
            <Sparkles className="h-8 w-8" />
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400 sm:text-lg">{copy.description}</p>
        <div className="mt-8 flex max-w-xl items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
          <Search className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">{copy.search}</span>
        </div>
      </div>

      <div className="hidden rounded-2xl border border-zinc-200 bg-[#fffaf1] p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 lg:block">
        <p className={`${getDisplayFontClass(copy.journey)} text-center text-lg`}>{copy.journey}</p>
        <p className="mt-1 text-center text-sm text-zinc-600 dark:text-zinc-400">{copy.journeySub}</p>
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f0dc] text-[#5b8c56] dark:bg-emerald-950/70 dark:text-emerald-400">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-3 text-sm font-medium">{title}</p>
      </div>
      {showArrow && <div className="h-px bg-[#a9794c] dark:bg-amber-700/70" />}
    </>
  );
}
