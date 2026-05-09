import Link from 'next/link';

interface HeroSectionProps {
  userCount: number;
  lang?: 'ko' | 'en';
}

const translations = {
  ko: {
    description: (
      <>
        문장 TTS 반복 학습 · 영상 스크립트 학습 · 스크립트 공유 게시판까지,
        <br className="hidden sm:block" />
        다양한 언어를 하나의 플랫폼에서 체계적으로 익혀보세요.
      </>
    ),
    badges: ['🎯 문장 학습', '🎬 영상 학습', '📝 스크립트 공유', '🔁 반복 훈련'],
    cta: '콘텐츠 생성',
    usersLearning: '명 함께 학습 중',
  },
  en: {
    description: (
      <>
        Sentence TTS repetition · Video script learning · Script sharing board,
        <br className="hidden sm:block" />
        Systematically master multiple languages on a single platform.
      </>
    ),
    badges: ['🎯 Sentence Learning', '🎬 Video Learning', '📝 Script Sharing', '🔁 Repetition Training'],
    cta: 'Create Content',
    usersLearning: ' users learning together',
  }
};

export default function HeroSection({ userCount, lang = 'ko' }: HeroSectionProps) {
  const t = translations[lang];

  return (
    <section className="px-4 pt-6 pb-4 sm:pt-10 sm:pb-6">
      <div className="max-w-5xl mx-auto text-center space-y-5">
        {/* 타이틀 */}
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-700 via-sky-600 to-indigo-600">
          Unlock Global Opportunities with LangBridge
        </h1>

        {/* 한 줄 소개 */}
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          {t.description}
        </p>

        {/* 기능 요약 칩 */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs sm:text-sm font-medium rounded-full border border-violet-200 dark:border-violet-800/50">
            {t.badges[0]}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium rounded-full border border-emerald-200 dark:border-emerald-800/50">
            {t.badges[1]}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-medium rounded-full border border-blue-200 dark:border-blue-800/50">
            {t.badges[2]}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 text-xs sm:text-sm font-medium rounded-full border border-cyan-200 dark:border-cyan-800/50">
            {t.badges[3]}
          </span>
        </div>

        {/* CTA + 유저 수 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/upload"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition"
          >
            {t.cta}
          </Link>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {lang === 'ko' ? (
              <><span className="font-semibold text-blue-600 dark:text-blue-400">{userCount}</span>{t.usersLearning}</>
            ) : (
              <><span className="font-semibold text-blue-600 dark:text-blue-400">{userCount}</span>{t.usersLearning}</>
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
