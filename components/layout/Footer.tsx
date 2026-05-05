'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  language?: 'ko' | 'en';
}

const translations = {
  ko: {
    description: 'AI 음성(TTS) 생성과 영상 스크립트 반복 학습을 결합하여 원어 학습의 집중력과 지속성을 높여주는 플랫폼입니다.',
    tagline: '학습 집중 · 반복 효율 · 실전 회화 감각',
    features: '기능',
    feature1: '🔊 문장별 TTS 오디오 생성',
    feature2: '🎞 영상 스크립트 반복 학습',
    feature3: '🗂 사용자 지정 카테고리',
    feature4: '📌 메모 & 문장 관리',
    feature5: '📈 학습 진행도 체감',
    resources: '학습 리소스',
    resource1: '📹 나의 영상',
    resource2: '📝 스크립트 & 트랜스크립트',
    resource3: '💡 반복 학습 팁',
    resource4: '🛠 향후 기능 로드맵',
    shortcuts: '바로가기',
    upload: '업로드',
    videoStudy: '영상 학습',
    myVideos: '나의 영상',
    profile: '프로필',
    contact: '문의 / 피드백',
    feedback: '기능 제안 환영합니다!',
    terms: '이용약관',
    privacy: '개인정보 처리방침',
    cookie: '쿠키 정책',
    help: '도움말',
  },
  en: {
    description: 'A platform that combines AI voice (TTS) generation and video script repetition to enhance focus and sustainability in language learning.',
    tagline: 'Focused Learning · Efficient Repetition · Practical Conversation',
    features: 'Features',
    feature1: '🔊 Per-sentence TTS Audio',
    feature2: '🎞 Video Script Repetition',
    feature3: '🗂 Custom Categories',
    feature4: '📌 Notes & Sentences',
    feature5: '📈 Progress Tracking',
    resources: 'Learning Resources',
    resource1: '📹 My Videos',
    resource2: '📝 Scripts & Transcripts',
    resource3: '💡 Repetition Tips',
    resource4: '🛠 Roadmap',
    shortcuts: 'Shortcuts',
    upload: 'Upload',
    videoStudy: 'Videos',
    myVideos: 'My Videos',
    profile: 'Profile',
    contact: 'Contact / Feedback',
    feedback: 'Feedback is welcome!',
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
    <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-10">
        {/* 상단 그리드 */}
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* 브랜드 소개 */}
          <div className="space-y-2 min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">Lang Bridge</h2>
            <p className="text-sm leading-relaxed text-gray-400 line-clamp-3 break-words hyphens-auto">
              {t.description}
            </p>
            <p className="text-xs text-gray-500">{t.tagline}</p>
          </div>

          {/* 주요 기능 */}
          <div className="space-y-2 min-w-0">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">{t.features}</h3>
            <ul className="space-y-1 text-sm">
              <li className="hover:text-white transition-colors">{t.feature1}</li>
              <li className="hover:text-white transition-colors">{t.feature2}</li>
              <li className="hover:text-white transition-colors">{t.feature3}</li>
              <li className="hover:text-white transition-colors">{t.feature4}</li>
              <li className="hover:text-white transition-colors">{t.feature5}</li>
            </ul>
          </div>

          {/* 학습 리소스 */}
          <div className="space-y-2 min-w-0">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">{t.resources}</h3>
            <ul className="space-y-1 text-sm">
              <li className="hover:text-white transition-colors">{t.resource1}</li>
              <li className="hover:text-white transition-colors">{t.resource2}</li>
              <li className="hover:text-white transition-colors">{t.resource3}</li>
              <li className="hover:text-white transition-colors">{t.resource4}</li>
            </ul>
          </div>

          {/* 링크 & 연락 */}
          <div className="space-y-2 min-w-0">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">{t.shortcuts}</h3>
            <ul className="space-y-1 text-sm mb-4 sm:mb-6">
              <li className="hover:text-white transition-colors"><Link href="/upload">➡ {t.upload}</Link></li>
              <li className="hover:text-white transition-colors"><Link href="/videos">➡ {t.videoStudy}</Link></li>
              <li className="hover:text-white transition-colors"><Link href="/my-videos">➡ {t.myVideos}</Link></li>
              <li className="hover:text-white transition-colors"><Link href="/profile">➡ {t.profile}</Link></li>
            </ul>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400">{t.contact}</p>
              <p className="text-sm">
                ✉ <a className="underline decoration-dashed underline-offset-2 hover:text-white" href="mailto:ocean3885@gmail.com">ocean3885@gmail.com</a>
              </p>
              <p className="text-xs text-gray-500">{t.feedback}</p>
            </div>
          </div>
        </div>

        {/* 하단 바 */}
        <div className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t border-gray-800 text-[11px] sm:text-xs flex flex-col sm:flex-row gap-3 sm:gap-8 justify-between items-center">
          <p className="text-gray-400">&copy; {year} LangBridge. All rights reserved.</p>
          <div className="flex flex-wrap gap-2 sm:gap-4 text-gray-500">
            <span className="hover:text-gray-300 cursor-pointer">{t.terms}</span>
            <span className="hover:text-gray-300 cursor-pointer">{t.privacy}</span>
            <span className="hover:text-gray-300 cursor-pointer">{t.cookie}</span>
            <span className="hover:text-gray-300 cursor-pointer">{t.help}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}