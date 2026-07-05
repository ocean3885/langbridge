'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  CalendarDays,
  CircleGauge,
  HelpCircle,
  Menu,
  MessagesSquare,
  Target,
  TimerReset,
  X,
} from 'lucide-react';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '학습 리포트',
    open: '리포트 메뉴 열기',
    close: '리포트 메뉴 닫기',
    nav: ['Overview', 'Words', 'Sentences', 'Bundles', 'Review', 'Awards', 'Activity'],
  },
  en: {
    title: 'Learning Report',
    open: 'Open report menu',
    close: 'Close report menu',
    nav: ['Overview', 'Words', 'Sentences', 'Bundles', 'Review', 'Awards', 'Activity'],
  },
};

const icons = [CalendarDays, Target, MessagesSquare, BookOpen, TimerReset, Award, CircleGauge];

export default function ProgressMobileMenu({ language }: { language: DisplayLanguage }) {
  const t = copy[language];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.open}
        className="fixed left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-lg shadow-zinc-900/15 transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 lg:hidden"
        style={{ bottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
          />
          <aside className="relative flex h-full w-[min(82vw,320px)] flex-col border-r border-zinc-200 bg-white px-4 py-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold tracking-tight">{t.title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-6 flex flex-col gap-2">
              {t.nav.map((item, index) => {
                const Icon = icons[index] || HelpCircle;
                const active = index === 0;
                return (
                  <Link
                    key={item}
                    href={getSidebarHref(index)}
                    onClick={() => setOpen(false)}
                    className={`inline-flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? 'bg-[#eef8ef] text-[#2f8748] dark:bg-emerald-950/50 dark:text-emerald-200'
                        : 'text-zinc-650 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

function getSidebarHref(index: number) {
  switch (index) {
    case 1:
      return '/learn/review/words';
    case 2:
      return '/learn/review/sentences';
    case 3:
      return '/bundles';
    case 4:
      return '/learn/review/sentences';
    case 5:
      return '/learn';
    case 6:
      return '/learn/active';
    default:
      return '/learn/progress';
  }
}
