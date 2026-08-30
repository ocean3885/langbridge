import Link from 'next/link';
import { Award, BookOpen, CalendarDays, CircleGauge, HelpCircle, MessagesSquare, Target, TimerReset } from 'lucide-react';
import { WelcomefullAsset } from '@/components/assets/CharacterBadges';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '학습 리포트',
    nav: ['Overview', 'Words', 'Sentences', 'Bundles', 'Review', 'Awards', 'Activity'],
    mascotTitle: '꾸준함이 실력을 만듭니다.',
    mascotBody: '매일 조금씩 성장해요.',
  },
  en: {
    title: 'Learning Report',
    nav: ['Overview', 'Words', 'Sentences', 'Bundles', 'Review', 'Awards', 'Activity'],
    mascotTitle: 'Consistency builds skill.',
    mascotBody: 'Grow a little every day.',
  },
};

const icons = [CalendarDays, Target, MessagesSquare, BookOpen, TimerReset, Award, CircleGauge];
const hrefs = [
  '/learn/progress',
  '/learn/progress/words',
  '/learn/progress/sentences',
  '/learn/progress/bundles',
  '/learn/review',
  '/learn',
  '/learn/active',
];

export default function ProgressSidebar({ language, activeIndex }: { language: DisplayLanguage; activeIndex: number }) {
  const t = copy[language];

  return (
    <aside className="hidden border-r border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-950 lg:block">
      <h2 className="px-2 text-sm font-bold tracking-tight">{t.title}</h2>
      <nav className="mt-5 flex flex-col gap-2">
        {t.nav.map((item, index) => {
          const Icon = icons[index] || HelpCircle;
          const active = index === activeIndex;
          return (
            <Link
              key={item}
              href={hrefs[index]}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-w-fit items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
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

      <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex min-h-[178px] flex-col">
          <div>
            <p className="text-sm font-bold leading-5">{t.mascotTitle}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{t.mascotBody}</p>
          </div>
          <WelcomefullAsset size={112} className="!mx-auto !mb-[-8px] !mt-4" priority />
        </div>
      </div>
    </aside>
  );
}
