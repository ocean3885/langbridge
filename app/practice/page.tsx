import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  HelpCircle,
  Layers3,
  LetterText,
  MousePointer2,
  PencilLine,
  Repeat2,
  Shuffle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { getDisplayLanguage } from '@/lib/auth/app-user';

type DisplayLanguage = 'ko' | 'en';
type PracticeModeId = 'flashcards' | 'quiz' | 'scramble' | 'wordfill' | 'spelling';

const practiceCopy = {
  ko: {
    heroEyebrow: 'Practice Modes',
    heroTitle: (
      <>
        퀴즈로 확인하고,
        <br />
        반복하며 진짜 내 것으로.
      </>
    ),
    heroDescription:
      'HolaLingo의 연습 모드는 번들 학습 후 바로 이어집니다. 카드를 넘기고, 뜻을 고르고, 문장을 배열하고, 빈칸과 철자를 채우며 배운 표현을 오래 기억하게 도와줘요.',
    primaryCta: '번들 선택하기',
    secondaryCta: '학습 홈으로',
    previewLabel: '오늘의 연습 흐름',
    previewItems: ['Flashcards', 'Quick Quiz', 'Word Scramble', 'Word Fill', 'Spelling'],
    sectionEyebrow: 'Mode Guide',
    sectionTitle: '연습 모드 둘러보기',
    sectionDescription: '각 모드는 같은 번들 문장을 다른 방식으로 다시 만나게 해줍니다.',
    startTitle: '연습을 시작하려면 먼저 번들을 골라주세요.',
    startDescription:
      '연습 모드는 특정 번들의 문장과 단어를 기반으로 만들어집니다. 관심 있는 주제를 고르면 Flashcards, Quiz, Scramble, Word Fill, Spelling을 바로 사용할 수 있어요.',
    startButton: '번들 둘러보기',
    modes: {
      flashcards: {
        label: 'Flashcards',
        title: '문장을 보고, 듣고, 뜻 떠올리기',
        description: '스페인어 문장 카드를 넘기며 소리를 듣고, 카드를 뒤집어 뜻을 확인합니다.',
        bestFor: '첫 복습, 빠른 워밍업',
      },
      quiz: {
        label: 'Quick Quiz',
        title: '정답을 고르며 이해도 확인',
        description: '스페인어 문장을 보고 자연스러운 해석이나 의미를 빠르게 선택합니다.',
        bestFor: '의미 확인, 짧은 테스트',
      },
      scramble: {
        label: 'Word Scramble',
        title: '문장 구조를 손으로 맞추기',
        description: '흩어진 스페인어 단어를 올바른 순서로 배열하며 어순과 표현 패턴을 익힙니다.',
        bestFor: '어순 연습, 문장 감각',
      },
      wordfill: {
        label: 'Word Fill',
        title: '문맥 속 빈칸 채우기',
        description: '문장 안의 핵심 단어를 떠올려 채우며 실제 사용 맥락을 복습합니다.',
        bestFor: '문맥 이해, 핵심 표현',
      },
      spelling: {
        label: 'Spelling',
        title: '뜻을 보고 철자 조각 맞추기',
        description: '뜻과 첫 글자 힌트를 바탕으로 단어 조각을 골라 정확한 철자를 완성합니다.',
        bestFor: '단어 암기, 정확도 향상',
      },
    },
  },
  en: {
    heroEyebrow: 'Practice Modes',
    heroTitle: (
      <>
        Check what you know,
        <br />
        then make it stick.
      </>
    ),
    heroDescription:
      'HolaLingo practice modes continue naturally after each bundle. Flip cards, choose meanings, arrange words, fill blanks, and spell what you learned.',
    primaryCta: 'Choose a Bundle',
    secondaryCta: 'Learn Home',
    previewLabel: 'Today\'s practice flow',
    previewItems: ['Flashcards', 'Quick Quiz', 'Word Scramble', 'Word Fill', 'Spelling'],
    sectionEyebrow: 'Mode Guide',
    sectionTitle: 'Explore Practice Modes',
    sectionDescription: 'Each mode helps you revisit the same bundle items from a different angle.',
    startTitle: 'Choose a bundle to start practicing.',
    startDescription:
      'Practice modes are powered by the sentences and words inside each bundle. Pick a topic, then jump into Flashcards, Quiz, Scramble, Word Fill, or Spelling.',
    startButton: 'Explore Bundles',
    modes: {
      flashcards: {
        label: 'Flashcards',
        title: 'Read, listen, and recall meaning',
        description: 'Flip sentence cards to hear Spanish first, then reveal the meaning when you are ready.',
        bestFor: 'Warm-ups, quick review',
      },
      quiz: {
        label: 'Quick Quiz',
        title: 'Check meaning fast',
        description: 'Read a Spanish sentence and choose the natural translation or meaning.',
        bestFor: 'Comprehension checks',
      },
      scramble: {
        label: 'Word Scramble',
        title: 'Build sentence order by hand',
        description: 'Arrange shuffled Spanish words into the correct sentence and build a feel for structure.',
        bestFor: 'Word order, sentence rhythm',
      },
      wordfill: {
        label: 'Word Fill',
        title: 'Fill the missing word in context',
        description: 'Recall key words inside real sentences instead of memorizing them in isolation.',
        bestFor: 'Context, key phrases',
      },
      spelling: {
        label: 'Spelling',
        title: 'Assemble spelling from word pieces',
        description: 'Use meaning and first-letter hints to choose chunks and complete the Spanish word.',
        bestFor: 'Vocabulary accuracy',
      },
    },
  },
};

const modeOrder: PracticeModeId[] = ['flashcards', 'quiz', 'scramble', 'wordfill', 'spelling'];

const modeMeta: Record<PracticeModeId, {
  icon: typeof BookOpen;
  tone: string;
}> = {
  flashcards: { icon: Layers3, tone: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10' },
  quiz: { icon: HelpCircle, tone: 'text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10' },
  scramble: { icon: Shuffle, tone: 'text-orange-600 bg-orange-50 dark:text-orange-300 dark:bg-orange-500/10' },
  wordfill: { icon: PencilLine, tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10' },
  spelling: { icon: LetterText, tone: 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10' },
};

export default async function PracticePage() {
  const language = await getDisplayLanguage();
  const t = practiceCopy[language];
  const heroTitleClass = getPracticeHeroTitleClass(language);
  const sectionTitleClass = getPracticeSectionTitleClass(language);
  const bodyClass = getPracticeBodyClass(language);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 pb-12 text-[#1f1b18] dark:text-zinc-100">
      <section className="grid gap-8 overflow-hidden rounded-[28px] bg-[#fffdfa] px-4 py-8 dark:bg-zinc-900 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:px-10 lg:py-12">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#4f8a50] dark:text-emerald-300">
            {t.heroEyebrow}
          </p>
          <h1 className={heroTitleClass}>
            {t.heroTitle}
          </h1>
          <p className={`mt-6 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg ${bodyClass}`}>
            {t.heroDescription}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/bundles"
              className="inline-flex items-center gap-2 rounded-lg bg-[#57985a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#477f4a]"
            >
              {t.primaryCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-[#57985a] hover:text-[#477f4a] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {t.secondaryCta}
            </Link>
          </div>
        </div>

        <PracticeFlowPreview language={language} />
      </section>

      <section className="rounded-[28px] border border-zinc-200/80 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#4f8a50] dark:text-emerald-300">
              {t.sectionEyebrow}
            </p>
            <h2 className={`mt-3 ${sectionTitleClass}`}>
              {t.sectionTitle}
            </h2>
          </div>
          <p className={`max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base ${bodyClass}`}>
            {t.sectionDescription}
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          {modeOrder.map((mode) => (
            <PracticeModeCard
              key={mode}
              id={mode}
              mode={mode}
              language={language}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-[28px] bg-[#f8f5f1] p-6 dark:bg-zinc-950 md:grid-cols-[0.85fr_1.15fr] md:p-8">
        <div className="flex flex-col justify-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#eef6ee] text-[#57985a] dark:bg-emerald-500/10 dark:text-emerald-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className={sectionTitleClass}>
            {t.startTitle}
          </h2>
          <p className={`mt-4 leading-7 text-zinc-600 dark:text-zinc-300 ${bodyClass}`}>
            {t.startDescription}
          </p>
          <Link
            href="/bundles"
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-[#57985a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#477f4a]"
          >
            {t.startButton}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniPracticePanel mode="quiz" language={language} />
          <MiniPracticePanel mode="scramble" language={language} />
        </div>
      </section>
    </main>
  );
}

function getPracticeHeroTitleClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'break-keep font-sans text-4xl font-bold leading-[1.28] tracking-tight sm:text-5xl lg:text-[3.45rem]'
    : 'font-serif text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl';
}

function getPracticeSectionTitleClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'break-keep font-sans text-2xl font-bold leading-[1.35] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl'
    : 'font-serif text-3xl font-semibold leading-tight tracking-normal text-zinc-950 dark:text-zinc-50 sm:text-4xl';
}

function getPracticeCardTitleClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'break-keep font-sans text-lg font-bold leading-[1.45] text-zinc-950 dark:text-zinc-50'
    : 'font-serif text-xl font-semibold leading-snug text-zinc-950 dark:text-zinc-50';
}

function getPracticeBodyClass(language: DisplayLanguage) {
  return language === 'ko' ? 'break-keep font-medium' : '';
}

function PracticeFlowPreview({ language }: { language: DisplayLanguage }) {
  const t = practiceCopy[language];

  return (
    <div className="rounded-2xl border border-[#f5ead2] bg-[#fffcf5] p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.previewLabel}</p>
        <Repeat2 className="h-4 w-4 text-[#57985a]" />
      </div>
      <div className="mt-6 space-y-3">
        {t.previewItems.map((item, index) => (
          <div key={item} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${index < 2 ? 'bg-[#57985a] text-white' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'}`}>
              {index < 2 ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item}</p>
              <div className="mt-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-2 rounded-full bg-[#8bbf73]" style={{ width: `${38 + index * 14}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-white p-4 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <strong className="font-serif text-lg">Tengo una pregunta.</strong>
          <Volume2 className="h-4 w-4 text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {language === 'ko' ? '질문이 있어요.' : 'I have a question.'}
        </p>
      </div>
    </div>
  );
}

function PracticeModeCard({
  id,
  mode,
  language,
}: {
  id: string;
  mode: PracticeModeId;
  language: DisplayLanguage;
}) {
  const copy = practiceCopy[language].modes[mode];
  const meta = modeMeta[mode];
  const Icon = meta.icon;
  const cardTitleClass = getPracticeCardTitleClass(language);
  const bodyClass = getPracticeBodyClass(language);

  return (
    <article id={id} className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${meta.tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{copy.label}</p>
      <h3 className={`mt-2 ${cardTitleClass}`}>
        {copy.title}
      </h3>
      <p className={`mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300 ${bodyClass}`}>
        {copy.description}
      </p>
      <PracticeModePreview mode={mode} language={language} />
      <div className="mt-5 rounded-xl bg-zinc-50 p-3 text-xs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        {copy.bestFor}
      </div>
    </article>
  );
}

function PracticeModePreview({ mode, language }: { mode: PracticeModeId; language: DisplayLanguage }) {
  if (mode === 'flashcards') {
    return (
      <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-300">Sentence</span>
          <Volume2 className="h-3.5 w-3.5 text-sky-500" />
        </div>
        <p className="font-serif text-base text-zinc-900 dark:text-zinc-50">¿Como estas?</p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {language === 'ko' ? '카드를 뒤집어 뜻 확인' : 'Flip to reveal meaning'}
        </p>
      </div>
    );
  }

  if (mode === 'quiz') {
    return (
      <div className="mt-5 space-y-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
        <p className="font-serif text-base text-zinc-900 dark:text-zinc-50">Necesito ayuda.</p>
        <div className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#3f7d42] dark:bg-zinc-900 dark:text-emerald-300">
          {language === 'ko' ? '나는 도움이 필요해요.' : 'I need help.'}
        </div>
      </div>
    );
  }

  if (mode === 'scramble') {
    return (
      <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50/40 p-3 dark:border-orange-900/50 dark:bg-orange-950/20">
        <div className="flex flex-wrap gap-1.5">
          {['Yo', 'quiero', 'practicar'].map((word) => (
            <span key={word} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-orange-700 dark:bg-zinc-900 dark:text-orange-200">
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'wordfill') {
    return (
      <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="font-serif text-base text-zinc-900 dark:text-zinc-50">Yo _____ cafe.</p>
        <div className="mt-2 flex gap-1.5">
          {['tomo', 'hablo'].map((word, index) => (
            <span key={word} className={`rounded-md px-2 py-1 text-xs font-bold ${index === 0 ? 'bg-[#57985a] text-white' : 'bg-white text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'}`}>
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50/40 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
        {language === 'ko' ? '뜻: 여행' : 'Meaning: trip'}
      </p>
      <div className="mt-2 flex gap-1.5">
        {['via', 'je'].map((chunk) => (
          <span key={chunk} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-rose-700 dark:bg-zinc-900 dark:text-rose-200">
            {chunk}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniPracticePanel({ mode, language }: { mode: 'quiz' | 'scramble'; language: DisplayLanguage }) {
  if (mode === 'quiz') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-300">
          <HelpCircle className="h-4 w-4" />
          Quick Quiz
        </div>
        <p className="font-serif text-xl">Necesito ayuda.</p>
        <div className="mt-5 grid gap-2">
          {[
            language === 'ko' ? '나는 도움이 필요해요.' : 'I need help.',
            language === 'ko' ? '나는 시간이 있어요.' : 'I have time.',
            language === 'ko' ? '나는 커피를 마셔요.' : 'I drink coffee.',
          ].map((option, index) => (
            <div
              key={option}
              className={`rounded-lg border px-3 py-2 text-sm ${index === 0 ? 'border-[#57985a] bg-[#f2fbf0] text-[#3f7d42] dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100' : 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'}`}
            >
              {option}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-orange-600 dark:text-orange-300">
        <Shuffle className="h-4 w-4" />
        Scramble
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {language === 'ko' ? '단어를 눌러 문장을 완성하세요.' : 'Tap words to build the sentence.'}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {['Yo', 'quiero', 'practicar', 'espanol'].map((word, index) => (
          <span
            key={word}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold ${index < 2 ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200' : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300'}`}
          >
            {index === 0 && <MousePointer2 className="h-3.5 w-3.5" />}
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
