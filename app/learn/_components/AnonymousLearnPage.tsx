import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Leaf, Volume2 } from 'lucide-react';
import { ExcellenthalfAsset } from '@/components/assets/CharacterBadges';
import { GoalCard, MiniListCard, ProgressChartCard } from './ProgressCards';
import { StreakCard } from './StreakCard';
import { learningCycleSteps } from './learn-page-data';

type DisplayLanguage = 'ko' | 'en';

const anonymousCopy = {
  ko: {
    hero: {
      eyebrow: 'HolaLingo와 함께 학습하기',
      title: (
        <>
          Learn Spanish,
          <br />
          the natural and cozy way.
        </>
      ),
      description: '짧은 레슨, 실제 대화, 스마트 복습으로 스페인어를 자연스럽게 익혀보세요.',
      cta: '레슨 시작하기',
      lovedBy: '10,000명 이상의 학습자가 함께해요',
      imageAlt: '햇살이 드는 창가에서 스페인어를 공부하는 학습자',
      phraseMeaning: '좋은 아침!',
    },
    lesson: {
      title: '레슨 미리보기',
      description: (
        <>
          짧은 인터랙티브 레슨을 체험해보세요.
          <br />
          회원가입 없이 확인할 수 있어요!
        </>
      ),
      prompt: '빈칸 채우기',
      translation: 'Maria가 커피를 주문합니다.',
      options: [
        ['libro', '책'],
        ['cafe', '커피'],
        ['casa', '집'],
      ],
      correct: '정답이에요!',
      feedback: '잘했어요!',
    },
    cycle: {
      title: 'HolaLingo로 학습하는 방법',
      description: '학습, 연습, 복습이 자연스럽게 이어지는 간단한 흐름입니다.',
      steps: [
        { title: '1. 읽고 듣기', desc: '실제 대화와 이야기를 맥락 속에서 익혀요.' },
        { title: '2. 연습하기', desc: '퀴즈로 이해한 내용을 바로 적용해요.' },
        { title: '3. 복습하기', desc: '스마트 복습으로 기억을 다시 끌어올려요.' },
        { title: '4. 성장하기', desc: '진행 상황을 보며 자신감을 쌓아가요.' },
      ],
    },
    progress: {
      title: (
        <>
          학습 진행 상황을
          <br />
          한눈에 확인하세요
        </>
      ),
      description: '매일의 학습 여정을 명확하게 보며 동기를 유지하세요.',
      items: ['일일 목표와 연속 학습', '완료한 레슨', '학습한 단어', '복습할 항목'],
    },
    cta: {
      eyebrow: '시작할 준비가 되셨나요?',
      title: (
        <>
          오늘 스페인어 여정을 시작하세요
          <br />
          무료로 시작할 수 있어요.
        </>
      ),
      button: '학습 시작하기',
      note: '신용카드가 필요하지 않아요',
      imageAlt: '스페인어 학습 책상',
    },
  },
  en: {
    hero: {
      eyebrow: 'Learn with HolaLingo',
      title: (
        <>
          Learn Spanish,
          <br />
          the natural and cozy way.
        </>
      ),
      description: 'Short lessons, real conversations, and smart review help you learn and remember.',
      cta: 'Try a Lesson Now',
      lovedBy: 'Loved by 10,000+ learners',
      imageAlt: 'Spanish learner studying near a sunny window',
      phraseMeaning: 'Good morning!',
    },
    lesson: {
      title: 'Experience a Lesson',
      description: (
        <>
          Try a short interactive lesson.
          <br />
          No sign-up required!
        </>
      ),
      prompt: 'Fill in the blank',
      translation: 'Maria orders a coffee.',
      options: [
        ['libro', 'book'],
        ['cafe', 'coffee'],
        ['casa', 'house'],
      ],
      correct: '¡Correcto!',
      feedback: 'Great job!',
    },
    cycle: {
      title: 'How You Learn with HolaLingo',
      description: 'Learn, practice, and review in a simple cycle that sticks.',
      steps: learningCycleSteps.map((step) => ({ title: step.title, desc: step.desc })),
    },
    progress: {
      title: (
        <>
          Your Progress,
          <br />
          Beautifully Tracked
        </>
      ),
      description: 'Stay motivated with a clear view of your learning journey.',
      items: ['Daily goals & streaks', 'Lessons completed', 'Words learned', 'Areas to review'],
    },
    cta: {
      eyebrow: 'Ready to start?',
      title: (
        <>
          Start your Spanish journey today
          <br />
          It&apos;s free to get started.
        </>
      ),
      button: 'Start Learning',
      note: 'No credit card required',
      imageAlt: 'Spanish study desk',
    },
  },
};

export function AnonymousLearnPage({ language = 'en' }: { language?: DisplayLanguage }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-2 pb-10 text-[#1f1b18] dark:text-zinc-100">
      <AnonymousHeroSection language={language} />
      <LessonPreviewSection language={language} />
      <LearningCycleSection language={language} />
      <ProgressPreviewSection language={language} />
      <StartCtaSection language={language} />
    </div>
  );
}

function AnonymousHeroSection({ language }: { language: DisplayLanguage }) {
  const t = anonymousCopy[language].hero;

  return (
    <section className="grid min-h-[360px] gap-8 overflow-hidden rounded-[28px] bg-[#fffdfa] dark:bg-zinc-900 lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col justify-center px-4 py-8 sm:px-9 lg:px-10">
        <p className="mb-4 text-xs font-black uppercase tracking-widest text-[#4f8a50]">
          {t.eyebrow}
        </p>
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
          {t.title}
        </h1>
        <p className="mt-6 max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
          {t.description}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Link
            href="/auth/sign-up?redirectTo=/learn"
            className="inline-flex items-center gap-2 rounded-lg bg-[#57985a] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#477f4a]"
          >
            {t.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            <div className="font-bold text-[#f2a51f]">★★★★★</div>
            <div>{t.lovedBy}</div>
          </div>
        </div>
      </div>
      <div className="relative min-h-[320px] overflow-hidden rounded-[24px]">
        <Image
          src="/images/heroimg_land.jpg"
          alt={t.imageAlt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#fffdfa] to-transparent dark:from-zinc-900" />
        <div className="absolute left-8 top-16 w-56 rounded-xl border border-white/70 bg-white/90 p-5 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="mb-3 flex items-center justify-between">
            <strong className="font-serif text-lg">¡Buenos dias!</strong>
            <Volume2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.phraseMeaning}</p>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5f9f61] text-white">
              <Check className="h-4 w-4" />
            </span>
            <span className="h-2 flex-1 rounded-full bg-[#e7ded4] dark:bg-zinc-700" />
            <span className="h-2 flex-1 rounded-full bg-[#e7ded4] dark:bg-zinc-700" />
            <span className="h-2 flex-1 rounded-full bg-[#e7ded4] dark:bg-zinc-700" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LessonPreviewSection({ language }: { language: DisplayLanguage }) {
  const t = anonymousCopy[language].lesson;

  return (
    <section className="grid gap-6 rounded-[28px] border border-zinc-200/80 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/20 md:grid-cols-[0.8fr_1.25fr_0.55fr] md:p-8">
      <div>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef5ea] text-[#5f9f61] dark:bg-emerald-950/50 dark:text-emerald-200">
          <Leaf className="h-6 w-6" />
        </div>
        <h2 className={getAnonymousHeadingClass(language, 'text-2xl')}>{t.title}</h2>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">
          {t.description}
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
        <p className="mb-5 text-xs text-zinc-500 dark:text-zinc-400">{t.prompt}</p>
        <p className="font-serif text-2xl">Maria pide un ________.</p>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.translation}</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {t.options.map(([word, meaning], index) => (
            <button
              key={word}
              className={`rounded-lg border px-4 py-3 text-sm transition ${
                index === 1
                  ? 'border-[#57985a] bg-[#f2fbf0] text-[#3f7d42] dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-100'
                  : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
              }`}
            >
              <span className="block font-semibold">{word}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{meaning}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
        <ExcellenthalfAsset size={128} className="mb-3 !h-[88px] !w-[88px] lg:!h-[120px] lg:!w-[120px]" />
        <strong className="text-lg">{t.correct}</strong>
        <span className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.feedback}</span>
      </div>
    </section>
  );
}

function LearningCycleSection({ language }: { language: DisplayLanguage }) {
  const t = anonymousCopy[language].cycle;

  return (
    <section className="rounded-[28px] bg-[#fffdfa] px-5 py-8 text-center shadow-sm dark:bg-zinc-900 dark:shadow-black/20">
      <h2 className={getAnonymousHeadingClass(language, 'text-3xl')}>{t.title}</h2>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">{t.description}</p>
      <div className="mt-9 grid gap-6 md:grid-cols-4">
        {learningCycleSteps.map((step, index) => (
          <div key={step.title} className="flex flex-col items-center">
            <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full ${step.bg}`}>
              <step.icon className="h-9 w-9 text-[#5c7f56] dark:text-emerald-200" />
            </div>
            <h3 className="font-bold">{t.steps[index]?.title || step.title}</h3>
            <p className="mt-2 max-w-48 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{t.steps[index]?.desc || step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgressPreviewSection({ language }: { language: 'ko' | 'en' }) {
  const t = anonymousCopy[language].progress;

  return (
    <section className="grid gap-8 rounded-[28px] bg-[#fff8ec] p-6 shadow-sm dark:bg-zinc-900 dark:shadow-black/20 lg:grid-cols-[0.55fr_1fr] lg:p-9">
      <div>
        <h2 className={getAnonymousHeadingClass(language, 'text-3xl')}>
          {t.title}
        </h2>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">{t.description}</p>
        <ul className="mt-8 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
          {t.items.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#75a777]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StreakCard language={language} />
        <GoalCard language={language} />
        <MiniListCard />
        <ProgressChartCard />
      </div>
    </section>
  );
}

function StartCtaSection({ language }: { language: DisplayLanguage }) {
  const t = anonymousCopy[language].cta;

  return (
    <section className="grid items-center gap-8 overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 md:grid-cols-[0.42fr_1fr]">
      <div className="relative h-44 overflow-hidden rounded-2xl">
        <Image src="/images/heroimg_port.jpg" alt={t.imageAlt} fill className="object-cover" sizes="360px" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#4f8a50]">{t.eyebrow}</p>
        <h2 className={`mt-3 ${getAnonymousHeadingClass(language, 'text-3xl')}`}>
          {t.title}
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Link href="/auth/sign-up?redirectTo=/learn" className="inline-flex items-center gap-2 rounded-lg bg-[#57985a] px-6 py-3 text-sm font-bold text-white">
            {t.button}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{t.note}</span>
        </div>
      </div>
    </section>
  );
}

function getAnonymousHeadingClass(language: DisplayLanguage, sizeClassName: string) {
  return language === 'ko'
    ? `font-sans ${sizeClassName} font-bold`
    : `font-serif ${sizeClassName} font-semibold`;
}
