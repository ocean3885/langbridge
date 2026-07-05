import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getDisplayLanguage } from '@/lib/auth/app-user';

type DisplayLanguage = 'ko' | 'en';

type AboutSection = {
  id?: string;
  title: string;
  paragraphs: string[];
  list?: string[];
  rhythm?: string[];
};

const aboutCopy: Record<DisplayLanguage, {
  eyebrow: string;
  title: string;
  intro: string[];
  sections: AboutSection[];
  images: {
    first: { alt: string; caption: string };
    second: { alt: string; caption: string };
  };
  closingTitle: string;
  closingBody: string;
  closingButton: string;
}> = {
  ko: {
    eyebrow: 'About HolaLingo',
    title: '단어만 외우는 대신, 진짜 문장으로 스페인어를 배워요.',
    intro: [
      'HolaLingo는 문장, 이야기, 이미지, 듣기, 반복을 통해 학습자가 스페인어를 실제 맥락 속에서 이해하도록 돕는 스페인어 학습 플랫폼입니다.',
      '우리는 언어 학습이 명확하고, 실용적이고, 격려받는 경험이어야 한다고 믿습니다. 무작위 단어를 하나씩 외우는 대신, HolaLingo는 스페인어가 자연스러운 상황에서 실제로 어떻게 쓰이는지 익힐 수 있도록 돕습니다.',
      '모든 문장, 단어, 이미지, 오디오 활동은 의미와 소리, 실제 사용법을 함께 연결하도록 설계됩니다.',
    ],
    sections: [
      {
        title: 'Why HolaLingo exists',
        paragraphs: [
          '많은 학습자는 설렘으로 스페인어를 시작하지만 곧 부담을 느낍니다.',
          '외워야 할 단어는 많고, 문법은 복잡하게 느껴지며, 교재 속 문장은 실제 생활과 멀게 느껴질 때가 많습니다. 공부를 해도 스페인어 음성이 잘 들리지 않거나, 간단한 표현을 자연스럽게 쓰기 어려울 수 있습니다.',
          'HolaLingo는 이 과정을 더 쉽게 만들기 위해 만들어졌습니다. 짧고 의미 있는 학습 번들을 통해 유용한 표현, 일상 상황, 문화 주제, 짧은 이야기, 동사 패턴을 단계적으로 만날 수 있게 돕습니다.',
        ],
      },
      {
        title: 'What makes HolaLingo different',
        paragraphs: [
          'HolaLingo는 문장 기반 학습을 중심으로 만들어졌습니다.',
          '하나의 문장은 어휘, 문법, 발음, 어순, 문화적 뉘앙스를 동시에 담을 수 있습니다. 그래서 HolaLingo는 고립된 단어 목록보다 완성된 스페인어 문장을 중심으로 학습을 구성합니다.',
          '목표는 단어를 아는 것에 그치지 않고, 스페인어가 실제로 어떻게 쓰이는지 이해하는 것입니다.',
        ],
        list: [
          '자연스러운 스페인어 문장을 듣기',
          '유용한 표현을 반복하고 복습하기',
          '문맥 속에서 어휘 배우기',
          '퀴즈와 복습 활동으로 연습하기',
          '짧은 이야기와 실제 상황 탐색하기',
          '조금씩 자신감 쌓기',
        ],
      },
      {
        title: 'Learning with context',
        paragraphs: [
          '단어는 의미 있는 상황 안에 있을 때 더 오래 기억됩니다.',
          'HolaLingo는 짧은 이야기, 사진 장면, 대화 패턴, 문화 주제, 실용적인 상황을 활용합니다. 이런 학습 번들은 단어가 무엇을 뜻하는지뿐 아니라 언제, 어떻게 쓰이는지도 함께 이해하도록 돕습니다.',
          '예를 들어 카페 대화, 여행 장면, 짧은 이야기 속에서 단어를 만나면 혼자 외울 때보다 훨씬 더 선명하게 기억됩니다.',
        ],
      },
      {
        title: 'Designed for steady progress',
        paragraphs: [
          'HolaLingo는 부담 없이 꾸준히 공부하고 싶은 학습자를 위해 만들어졌습니다.',
          '매일 긴 레슨을 끝내지 않아도 괜찮습니다. 몇 개의 문장만으로도 학습 경험이 명확하고 집중되어 있다면 앞으로 나아갈 수 있습니다.',
          '작은 단계는 반복될 때 실제 진전이 됩니다.',
        ],
        rhythm: [
          '먼저 듣기',
          '의미 이해하기',
          '핵심 단어 복습하기',
          '문장으로 연습하기',
          '나중에 다시 돌아와 기억하기',
        ],
      },
      {
        title: 'For Spanish learners around the world',
        paragraphs: [
          'HolaLingo는 스페인어 기초를 더 탄탄하게 만들고 싶은 초급 및 중급 학습자에게 특히 도움이 됩니다.',
          '여행, 일, 공부, 문화, 개인적인 관심 등 어떤 이유로 스페인어를 배우든 HolaLingo는 매일 언어를 만나는 단순한 방법을 제공합니다.',
          '우리의 목표는 스페인어가 덜 멀고, 조금 더 익숙하게 느껴지도록 돕는 것입니다.',
        ],
      },
      {
        id: 'mission',
        title: 'Our mission',
        paragraphs: [
          '우리의 미션은 사람들이 자연스럽고, 기억에 남고, 즐겁게 느껴지는 방식으로 스페인어를 배우도록 돕는 것입니다.',
          'HolaLingo는 레슨을 빠르게 통과하는 서비스가 아닙니다. 한 문장씩 진짜 자신감을 쌓아가는 경험을 만들고자 합니다.',
          '스페인어는 듣고, 보고, 이해하고, 다시 사용할 때 더 쉬워집니다. 그것이 HolaLingo가 만들고 싶은 학습 경험입니다.',
        ],
      },
    ],
    images: {
      first: {
        alt: 'HolaLingo learning scene with Spanish sentence practice',
        caption: '이미지는 문장의 의미를 더 빠르게 붙잡고, 듣기와 복습을 더 자연스럽게 이어 줍니다.',
      },
      second: {
        alt: 'Spanish learning materials arranged for steady study',
        caption: '짧은 문장, 사진 장면, 반복 연습이 함께 모이면 꾸준한 학습 흐름이 만들어집니다.',
      },
    },
    closingTitle: 'Welcome to HolaLingo',
    closingBody:
      '한 문장으로 시작하세요. 천천히 듣고, 의미를 이해하고, 내일 다시 시도해 보세요. 조금씩 스페인어는 당신의 세계 안으로 들어올 것입니다.',
    closingButton: '시작하기',
  },
  en: {
    eyebrow: 'About HolaLingo',
    title: 'Learn Spanish through real sentences, not isolated words.',
    intro: [
      'HolaLingo is a Spanish learning platform designed to help learners build real understanding through sentences, stories, images, listening, and repetition.',
      'We believe language learning should feel clear, practical, and encouraging. Instead of memorizing random words one by one, HolaLingo helps you learn how Spanish is actually used in natural contexts.',
      'Every sentence, word, image, and audio activity is created to help you connect meaning, sound, and usage together.',
    ],
    sections: [
      {
        title: 'Why HolaLingo exists',
        paragraphs: [
          'Many learners start Spanish with excitement, but soon feel overwhelmed.',
          'There are too many words to remember, grammar feels confusing, and textbook sentences often feel far from real life. Even after studying, it can be difficult to understand spoken Spanish or use simple expressions naturally.',
          'HolaLingo was created to make this process easier. Our goal is to help learners meet Spanish step by step through short, meaningful learning bundles.',
        ],
      },
      {
        title: 'What makes HolaLingo different',
        paragraphs: [
          'HolaLingo is built around sentence-based learning.',
          'A single sentence can teach vocabulary, grammar, pronunciation, word order, and cultural nuance at the same time. That is why we organize learning around complete Spanish sentences rather than isolated word lists.',
          'The focus is not just on knowing Spanish words. The focus is on understanding Spanish as it is actually used.',
        ],
        list: [
          'Listen to natural Spanish sentences',
          'Repeat and review useful expressions',
          'Learn vocabulary in context',
          'Practice with quizzes and review activities',
          'Explore short stories and real-life scenarios',
          'Build confidence little by little',
        ],
      },
      {
        title: 'Learning with context',
        paragraphs: [
          'Words become easier to remember when they appear in meaningful situations.',
          'That is why HolaLingo uses short stories, photo scenes, conversation patterns, cultural topics, and practical scenarios. These learning bundles help you understand not only what a word means, but also when and how to use it.',
          'For example, learning a word inside a cafe conversation, a travel scene, or a short story makes it much more memorable than studying it alone.',
        ],
      },
      {
        title: 'Designed for steady progress',
        paragraphs: [
          'HolaLingo is made for learners who want to study consistently without feeling pressured.',
          'You do not need to finish a long lesson every day. Even a few sentences can help you move forward when the learning experience is clear and focused.',
          'Small steps become real progress when they are repeated over time.',
        ],
        rhythm: [
          'Listen first',
          'Understand the meaning',
          'Review key words',
          'Practice the sentence',
          'Come back later and remember it again',
        ],
      },
      {
        title: 'For Spanish learners around the world',
        paragraphs: [
          'HolaLingo is especially helpful for beginners and intermediate learners who want to build a stronger foundation in Spanish.',
          'Whether you are learning Spanish for travel, work, study, culture, or personal interest, HolaLingo gives you a simple way to meet the language every day.',
          'Our mission is to make Spanish feel less distant and more familiar.',
        ],
      },
      {
        id: 'mission',
        title: 'Our mission',
        paragraphs: [
          'Our mission is to help people learn Spanish in a way that feels natural, memorable, and enjoyable.',
          'HolaLingo is not about rushing through lessons. It is about building real confidence, one sentence at a time.',
          'Spanish becomes easier when you hear it, see it, understand it, and use it again. That is the learning experience HolaLingo wants to create.',
        ],
      },
    ],
    images: {
      first: {
        alt: 'HolaLingo learning scene with Spanish sentence practice',
        caption: 'Images help learners hold onto meaning, then connect that meaning with listening and review.',
      },
      second: {
        alt: 'Spanish learning materials arranged for steady study',
        caption: 'Short sentences, visual context, and repeated practice create a calmer path for steady progress.',
      },
    },
    closingTitle: 'Welcome to HolaLingo',
    closingBody:
      'Start with one sentence. Listen carefully. Understand the meaning. Try again tomorrow. Little by little, Spanish will become part of your world.',
    closingButton: 'Start Learning',
  },
};

export default async function AboutPage() {
  const language = await getDisplayLanguage();
  const t = aboutCopy[language];
  const bodyClass = language === 'ko' ? 'break-keep font-medium' : '';

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 text-[#1f1b18] dark:text-zinc-100 sm:px-6">
      <article className="py-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-widest text-[#4f8a50] dark:text-emerald-300">
          {t.eyebrow}
        </p>
        <h1 className={getHeroTitleClass(language)}>{t.title}</h1>

        <div className={`mt-7 space-y-5 text-lg leading-8 text-zinc-650 dark:text-zinc-300 ${bodyClass}`}>
          {t.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <TrustImage
          src="/images/about_main.jpg"
          alt={t.images.first.alt}
          caption={t.images.first.caption}
          language={language}
          priority
        />

        <div className="mt-14 space-y-14">
          {t.sections.map((section, index) => (
            <div key={section.title} className="space-y-10">
              <AboutTextSection section={section} language={language} />
              {index === 1 ? (
                <TrustImage
                  src="/images/blog_horizontal.webp"
                  alt={t.images.second.alt}
                  caption={t.images.second.caption}
                  language={language}
                />
              ) : null}
            </div>
          ))}
        </div>

        <footer className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
          <h2 className={getSectionTitleClass(language)}>{t.closingTitle}</h2>
          <p className={`mt-4 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-300 ${bodyClass}`}>
            {t.closingBody}
          </p>
          <Link
            href="/bundles"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#57985a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#477f4a]"
          >
            {t.closingButton}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </footer>
      </article>
    </main>
  );
}

function AboutTextSection({ section, language }: { section: AboutSection; language: DisplayLanguage }) {
  const bodyClass = language === 'ko' ? 'break-keep font-medium' : '';

  return (
    <section id={section.id} className="scroll-mt-24">
      <h2 className={getSectionTitleClass(language)}>{section.title}</h2>
      <div className={`mt-5 space-y-4 text-base leading-8 text-zinc-600 dark:text-zinc-300 ${bodyClass}`}>
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {section.list ? (
        <ul className={`mt-6 grid gap-3 text-base leading-7 text-zinc-700 dark:text-zinc-200 sm:grid-cols-2 ${bodyClass}`}>
          {section.list.map((item) => (
            <li key={item} className="border-l-2 border-[#9bc79d] pl-4">
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {section.rhythm ? (
        <ol className={`mt-6 space-y-2 text-base leading-7 text-zinc-700 dark:text-zinc-200 ${bodyClass}`}>
          {section.rhythm.map((item, index) => (
            <li key={item} className="flex gap-3">
              <span className="min-w-6 font-semibold text-[#4f8a50] dark:text-emerald-300">
                {index + 1}.
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function TrustImage({
  src,
  alt,
  caption,
  language,
  priority = false,
}: {
  src: string;
  alt: string;
  caption: string;
  language: DisplayLanguage;
  priority?: boolean;
}) {
  const bodyClass = language === 'ko' ? 'break-keep font-medium' : '';

  return (
    <figure className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-[16/8] sm:aspect-[16/7]">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 896px, calc(100vw - 32px)"
          className="object-cover"
        />
      </div>
      <figcaption className={`px-4 py-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 ${bodyClass}`}>
        {caption}
      </figcaption>
    </figure>
  );
}

function getHeroTitleClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'mt-5 break-keep font-sans text-4xl font-bold leading-[1.28] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl'
    : 'mt-5 font-serif text-4xl font-semibold leading-tight tracking-normal text-zinc-950 dark:text-zinc-50 sm:text-5xl';
}

function getSectionTitleClass(language: DisplayLanguage) {
  return language === 'ko'
    ? 'break-keep font-sans text-2xl font-bold leading-[1.35] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl'
    : 'font-serif text-2xl font-semibold leading-tight tracking-normal text-zinc-950 dark:text-zinc-50 sm:text-3xl';
}
