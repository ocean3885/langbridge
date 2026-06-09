'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Instagram, Youtube, Mail } from 'lucide-react';

interface Props {
  language?: 'ko' | 'en';
}

const translations = {
  ko: {
    tagline: '가장 아늑한 스페인어 학습.',
    description: '짧은 레슨, 따뜻한 이야기, 생생한 표현.',
    learn: 'LEARN',
    learnHome: 'Learn Home',
    bundles: 'Bundles',
    progress: 'Progress',
    review: 'Review',
    practice: 'PRACTICE',
    flashcards: 'Flashcards',
    quickQuiz: 'Quick Quiz',
    listenRepeat: 'Listen & Repeat',
    wordScramble: 'Word Scramble',
    resources: 'RESOURCES',
    helpCenter: 'Help Center',
    roadmap: 'Roadmap',
    feedback: 'Feedback',
    contact: 'Contact',
    about: 'ABOUT',
    aboutHolaLingo: 'About HolaLingo',
    ourStory: 'Our Story',
    blog: 'Blog',
    terms: 'Terms',
    privacy: 'Privacy',
    cookie: 'Cookie',
    help: 'Help',
  },
  en: {
    tagline: 'Learn Spanish, the cozy way.',
    description: 'Small lessons, warm stories, real expressions.',
    learn: 'LEARN',
    learnHome: 'Learn Home',
    bundles: 'Bundles',
    progress: 'Progress',
    review: 'Review',
    practice: 'PRACTICE',
    flashcards: 'Flashcards',
    quickQuiz: 'Quick Quiz',
    listenRepeat: 'Listen & Repeat',
    wordScramble: 'Word Scramble',
    resources: 'RESOURCES',
    helpCenter: 'Help Center',
    roadmap: 'Roadmap',
    feedback: 'Feedback',
    contact: 'Contact',
    about: 'ABOUT',
    aboutHolaLingo: 'About HolaLingo',
    ourStory: 'Our Story',
    blog: 'Blog',
    terms: 'Terms',
    privacy: 'Privacy',
    cookie: 'Cookie',
    help: 'Help',
  }
};

export default function Footer({ language = 'ko' }: Props) {
  const t = translations[language];
  const pathname = usePathname();
  const year = new Date().getFullYear();

  // 관리자 페이지에서는 푸터를 표시하지 않음
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-[#1e3024] text-[#eae6df] mt-auto border-t border-[#2a3f30] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        
        {/* 상단 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8">
          
          {/* 1. 브랜드 정보 컬럼 (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6 flex flex-col justify-between h-full min-h-[160px] lg:border-r lg:border-white/10 lg:pr-8">
            <div className="space-y-4">
              {/* 로고 */}
              <Link href="/" className="flex items-center gap-3 active:scale-95 transition-transform group w-fit">
                <div className="relative h-8 w-9 overflow-hidden rounded-sm shadow-sm">
                  <Image
                    src="/images/logo_bg.png"
                    alt="HolaLingo Logo"
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  HolaLingo
                </span>
              </Link>

              {/* 태그라인 & 설명 */}
              <div className="text-sm leading-relaxed text-[#eae6df]/90 font-medium">
                <p>{t.tagline}</p>
                <p className="opacity-85 font-normal">{t.description}</p>
              </div>
            </div>

            {/* 소셜 링크 */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#2a3f31] hover:bg-[#34513e] flex items-center justify-center text-[#eae6df] hover:text-white transition-colors border border-white/5"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#2a3f31] hover:bg-[#34513e] flex items-center justify-center text-[#eae6df] hover:text-white transition-colors border border-white/5"
                aria-label="YouTube"
              >
                <Youtube size={18} />
              </a>
              <a
                href="mailto:ocean3885@gmail.com"
                className="w-9 h-9 rounded-full bg-[#2a3f31] hover:bg-[#34513e] flex items-center justify-center text-[#eae6df] hover:text-white transition-colors border border-white/5"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* 2. 네비게이션 메뉴 컬럼들 (lg:col-span-8) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-4 lg:pl-8 self-start">
            
            {/* LEARN */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-white uppercase underline underline-offset-[6px] decoration-1 decoration-white/60">
                {t.learn}
              </h3>
              <ul className="space-y-2 text-sm text-[#eae6df]/85">
                <li><Link href="/learn" className="hover:text-white hover:underline transition-colors">{t.learnHome}</Link></li>
                <li><Link href="/bundles" className="hover:text-white hover:underline transition-colors">{t.bundles}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.progress}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.review}</Link></li>
              </ul>
            </div>

            {/* PRACTICE */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-white uppercase underline underline-offset-[6px] decoration-1 decoration-white/60">
                {t.practice}
              </h3>
              <ul className="space-y-2 text-sm text-[#eae6df]/85">
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.flashcards}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.quickQuiz}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.listenRepeat}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.wordScramble}</Link></li>
              </ul>
            </div>

            {/* RESOURCES */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-white uppercase underline underline-offset-[6px] decoration-1 decoration-white/60">
                {t.resources}
              </h3>
              <ul className="space-y-2 text-sm text-[#eae6df]/85">
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.helpCenter}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.roadmap}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.feedback}</Link></li>
                <li><a href="mailto:ocean3885@gmail.com" className="hover:text-white hover:underline transition-colors">{t.contact}</a></li>
              </ul>
            </div>

            {/* ABOUT */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-white uppercase underline underline-offset-[6px] decoration-1 decoration-white/60">
                {t.about}
              </h3>
              <ul className="space-y-2 text-sm text-[#eae6df]/85">
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.aboutHolaLingo}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.ourStory}</Link></li>
                <li><Link href="#" className="hover:text-white hover:underline transition-colors">{t.blog}</Link></li>
              </ul>
            </div>

          </div>

        </div>

        {/* 하단 바 */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs text-[#eae6df]/75">
          <p>&copy; {year} HolaLingo. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-1 text-[#eae6df]/75">
            <span className="hover:text-white hover:underline cursor-pointer">{t.terms}</span>
            <span className="mx-2 text-[#eae6df]/30">&middot;</span>
            <span className="hover:text-white hover:underline cursor-pointer">{t.privacy}</span>
            <span className="mx-2 text-[#eae6df]/30">&middot;</span>
            <span className="hover:text-gray-300 cursor-pointer">{t.cookie}</span>
            <span className="mx-2 text-[#eae6df]/30">&middot;</span>
            <span className="hover:text-gray-300 cursor-pointer">{t.help}</span>
          </div>
        </div>

      </div>
    </footer>
  );
}