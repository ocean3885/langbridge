import { MessageCircle, Search, Users, Waves } from 'lucide-react';
import { getDisplayFontClass } from '../bundle-utils';
import type { BundleCopy } from '../types';

export function BundlesHero({
  copy,
  searchQuery,
  setSearchQuery,
}: {
  copy: BundleCopy;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  return (
    <section className="grid gap-8 py-8 md:py-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
      {/* Title & Search Column */}
      <div>
        <h1 className={`${getDisplayFontClass(copy.title)} text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl text-[#1f1b18] dark:text-zinc-50 flex items-center gap-2`}>
          {copy.title}
          <span className="inline-flex text-[#559c63] text-4xl sm:text-5xl lg:text-6xl animate-pulse">
            🌿
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-650 dark:text-zinc-405 sm:text-lg">
          {copy.description}
        </p>

        {/* Interactive Search Bar */}
        <div className="mt-8 flex max-w-xl items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 focus-within:ring-1 focus-within:ring-[#559c63] focus-within:border-[#559c63] transition-all">
          <Search className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-550" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={copy.search}
            className="w-full bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
          />
        </div>
      </div>

      {/* Start your Spanish journey Card */}
      <div className="hidden rounded-2xl border border-[#f5ead2] bg-[#fffcf5] p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 lg:block">
        <p className={`${getDisplayFontClass(copy.journey)} text-center text-lg font-bold text-zinc-800 dark:text-zinc-200`}>
          {copy.journey}
        </p>
        <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {copy.journeySub}
        </p>

        {/* 3 Step columns without arrows */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { title: 'Hola Start', icon: Waves },
            { title: 'Phrase Master', icon: MessageCircle },
            { title: 'Scenario Talk', icon: Users },
          ].map((item) => (
            <JourneyStep key={item.title} icon={item.icon} title={item.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneyStep({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3df] text-[#4f8a50] dark:bg-emerald-950/70 dark:text-emerald-400 shadow-sm transition hover:scale-105 duration-200">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
        {title}
      </p>
    </div>
  );
}
