import { CheckCircle2, CircleDashed, Lightbulb } from 'lucide-react';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const content = {
  ko: {
    eyebrow: 'Resources',
    title: 'Roadmap',
    intro: 'HolaLingo가 지금 제공하는 기능과 앞으로 다듬어갈 방향입니다.',
    columns: [
      {
        title: 'Available now',
        icon: CheckCircle2,
        items: ['번들 기반 스페인어 학습', 'Flashcards, Quiz, Scramble, Word Fill, Spelling', '단어와 문장 복습', '학습 진도 확인', '블로그와 학습 자료'],
      },
      {
        title: 'In progress',
        icon: CircleDashed,
        items: ['리소스와 도움말 정리', '피드백 수집 흐름 개선', '번들 콘텐츠 확장', '모바일 학습 흐름 개선'],
      },
      {
        title: 'Considering',
        icon: Lightbulb,
        items: ['발음 연습', '복습 알림', '개인별 추천 학습', '더 많은 언어 지원', '학습 목표 기반 플랜'],
      },
    ],
    note: '로드맵은 서비스 품질과 사용자 피드백에 따라 조정될 수 있습니다.',
  },
  en: {
    eyebrow: 'Resources',
    title: 'Roadmap',
    intro: 'A practical look at what HolaLingo supports today and what may come next.',
    columns: [
      {
        title: 'Available now',
        icon: CheckCircle2,
        items: ['Bundle-based Spanish learning', 'Flashcards, Quiz, Scramble, Word Fill, and Spelling', 'Word and sentence review', 'Progress tracking', 'Blog and learning resources'],
      },
      {
        title: 'In progress',
        icon: CircleDashed,
        items: ['Resource and help pages', 'Better feedback collection', 'More bundle content', 'Improved mobile learning flow'],
      },
      {
        title: 'Considering',
        icon: Lightbulb,
        items: ['Pronunciation practice', 'Review reminders', 'Personal learning recommendations', 'More language support', 'Goal-based learning plans'],
      },
    ],
    note: 'The roadmap may change as the service improves and user feedback comes in.',
  },
};

export default async function RoadmapPage() {
  const language = await getDisplayLanguage();
  const t = content[language];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-zinc-950 dark:text-zinc-50 sm:px-6">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">{t.intro}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {t.columns.map((column) => {
          const Icon = column.icon;
          return (
            <section key={column.title} className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <Icon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
              <h2 className="mt-4 text-lg font-semibold">{column.title}</h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {column.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-8 rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">{t.note}</p>
    </main>
  );
}
