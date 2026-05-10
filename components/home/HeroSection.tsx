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
    cta: '학습 시작하기',
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
    cta: "Let's Learn",
    usersLearning: ' users learning together',
  }
};

export default function HeroSection({ userCount, lang = 'ko' }: HeroSectionProps) {
  const t = translations[lang];

  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 transition-colors duration-300">
      {/* Decorative Background Blob */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[500px] h-[500px] bg-orange-100/50 dark:bg-orange-950/10 rounded-full blur-3xl -z-10" />
      
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Content */}
        <div className="space-y-8 text-center lg:text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-[#85A094] text-xs sm:text-sm font-bold border border-emerald-100 dark:border-emerald-800/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#85A094]"></span>
            </span>
            {lang === 'ko' ? '글로벌 기회의 문을 여는 첫 걸음' : 'Unlock Global Opportunities'}
          </div>

          <h1 className="text-4xl sm:text-6xl font-black leading-[1.1] tracking-tight text-zinc-900 dark:text-zinc-100">
            Unlock Global<br />
            <span className="text-[#E27D60]">Opportunities</span><br />
            with HolaLingo
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            {t.description}
          </p>

          {/* Feature Badges - Refined */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-2">
            {t.badges.map((badge, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                {badge}
              </span>
            ))}
          </div>

          {/* CTA + User Count */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 pt-4">
            <Link
              href="/bundles"
              className="group w-full sm:w-auto px-8 py-4 bg-[#E27D60] hover:bg-[#d16d51] text-white text-lg font-bold rounded-[1.25rem] shadow-xl shadow-orange-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {t.cta}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <div className="flex flex-col items-center lg:items-start">
               <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <span className="text-[#E27D60]">{userCount.toLocaleString()}</span>
                {t.usersLearning}
              </span>
              <div className="flex -space-x-2 mt-1.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Tutor Visual */}
        <div className="relative hidden lg:block">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-orange-200/40 to-emerald-100/40 dark:from-orange-900/10 dark:to-emerald-950/10 rounded-full blur-[100px] -z-10" />
          
          <div className="relative aspect-square max-w-lg ml-auto flex items-end justify-center overflow-hidden">
            {/* The AI Tutor Image with Nuki (Cut-out) effect */}
            <img 
              src="/images/tutor-elena-v2.png" 
              alt="AI Tutor" 
              className="relative z-20 w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] mix-blend-multiply dark:mix-blend-normal rounded-b-[3rem]"
            />
            
            {/* Overlay Greeting Card - Adjusted Position */}
            <div className="absolute top-1/4 -left-4 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-6 rounded-[2rem] shadow-2xl border border-white/20 transform -rotate-6 hover:rotate-0 transition-all duration-500 cursor-default">
              <p className="text-[#E27D60] font-black text-xl mb-1">¡Hola a todos!</p>
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                {lang === 'ko' ? '모두 반가워요! 함께 배워요.' : 'Hello everyone! Let\'s learn.'}
              </p>
            </div>

            {/* Floating Info Card */}
            <div className="absolute bottom-10 right-0 z-30 bg-[#85A094] text-white p-5 rounded-[2rem] shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">AI Tutor</p>
              <p className="text-lg font-black leading-tight">Elena de Madrid</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper for Arrow icon if not imported
function ArrowRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}
