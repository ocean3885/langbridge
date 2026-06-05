import Link from 'next/link';
import Image from 'next/image';

interface HeroSectionProps {
  userCount: number;
  lang?: 'ko' | 'en';
}

const translations = {
  ko: {
    badge: "머릿속 지식을 '말할 수 있는 언어'로 바꾸는 시간",
    title: (
      <>
        우리의 <span className="text-[#E27D60]">일상</span>이<br />
        스페인어가 됩니다
      </>
    ),
    titleSub: "Nuestra vida diaria se convierte en español",
    description: (
      <>
        일상 회화부터 몰입감 넘치는 숏 스토리까지, 다채로운 테마로 스페인어를 경험하세요.<br />
        단순한 인풋을 넘어선 능동적인 훈련이 당신을 '진짜 말할 수 있는' 단계로 이끕니다.
      </>
    ),
    features: [
      { title: 'Diverse Bundles', desc: '매일 업데이트되는 다채로운 테마의 학습 콘텐츠' },
      { title: 'Active Learning', desc: '직접 문장을 완성하며 체득하는 아웃풋 중심 설계' },
      { title: 'Step-by-Step', desc: '왕초보부터 고급까지 내 수준에 딱 맞는 맞춤형 구성' },
    ],
    primaryCta: '학습 시작하기',
    secondaryCta: '번들 둘러보기',
    usersLearning: '명 함께 학습 중',
  },
  en: {
    badge: 'From Passive Input to Active Output',
    title: (
      <>
        Turn everyday moments<br />
        into <span className="text-[#E27D60]">natural Spanish</span>
      </>
    ),
    titleSub: "Nuestra vida diaria se convierte en español",
    description: (
      <>
        From everyday conversations to immersive stories, experience Spanish through diverse themes.<br />
        Active output training transforms passive knowledge into a language you can confidently speak.
      </>
    ),
    features: [
      { title: 'Diverse Bundles', desc: 'Engaging learning themes updated daily.' },
      { title: 'Active Learning', desc: 'Output-centric design focusing on completing sentences.' },
      { title: 'Step-by-Step', desc: 'Tailored content perfectly matching your current level.' },
    ],
    primaryCta: 'Start Learning',
    secondaryCta: 'Browse Bundles',
    usersLearning: ' users learning together',
  }
};

export default function HeroSection({ userCount, lang = 'ko' }: HeroSectionProps) {
  const t = translations[lang];
  const titleLeadingClass = lang === 'ko' ? 'leading-[1.4] sm:leading-[1.34]' : 'leading-[1.2]';

  return (
    <section className="relative overflow-hidden px-6 pt-12 pb-8 sm:pt-20 sm:pb-12 transition-colors duration-300">

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Content */}
        <div className="space-y-6 text-center lg:text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[#85A094] dark:text-emerald-300 text-xs sm:text-sm font-medium border border-emerald-100 dark:border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#85A094] dark:bg-emerald-400"></span>
            </span>
            {t.badge}
          </div>

          <div>
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black ${titleLeadingClass} tracking-tight text-zinc-900 dark:text-zinc-100 break-keep`}>
              {t.title}
            </h1>
            <p className="text-lg sm:text-xl font-bold text-[#E27D60] mt-3">
              {t.titleSub}
            </p>
          </div>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium break-keep">
            {t.description}
          </p>

          {/* Mobile Hero Image */}
          <div className="lg:hidden relative w-full aspect-[16/10] sm:aspect-[2/1] rounded-[1.5rem] overflow-hidden shadow-lg border border-zinc-100 dark:border-zinc-800">
            <Image
              src="/images/heroimg_land.jpg"
              alt="Learning Spanish"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>

          {/* Feature Highlights */}
          <div className="flex flex-col gap-4 pt-2">
            {t.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 text-left">
                <div className="mt-0.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-full">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 mr-2 text-sm sm:text-base">[{feature.title}]</span>
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">{feature.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-6">
            <Link
              href="/bundles"
              className="w-full sm:w-auto px-8 py-4 bg-[#E27D60] hover:bg-[#c96a4f] text-white hover:text-orange-100 text-lg font-bold rounded-[1.25rem] flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {t.primaryCta}
            </Link>
            <Link
              href="/bundles"
              className="group w-full sm:w-auto px-8 py-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-lg font-bold rounded-[1.25rem] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {t.secondaryCta}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right: Hero Image Visual */}
        <div className="relative hidden lg:block h-full min-h-[600px]">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Decorative background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-emerald-50/50 to-orange-50/50 dark:from-emerald-900/10 dark:to-orange-900/10 rounded-full blur-3xl -z-10" />

            {/* Main Image Container */}
            <div className="relative w-[400px] h-[540px] group">
              {/* Background accent frame */}
              <div className="absolute -inset-4 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] -rotate-3 group-hover:rotate-0 transition-transform duration-500" />

              <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform rotate-2 group-hover:rotate-0 transition-transform duration-500 border border-white/20">
                <Image
                  src="/images/heroimg_port.jpg"
                  alt="Student studying Spanish"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                />

              </div>
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
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function Check({ size, className, strokeWidth = 2 }: { size: number, className?: string, strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
