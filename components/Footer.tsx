import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">
        {/* 상단 그리드 */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* 브랜드 소개 */}
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-3">Lang Bridge</h2>
            <p className="text-sm leading-relaxed text-gray-400">
              AI 음성(TTS) 생성과 영상 스크립트 반복 학습을 결합하여
              원어 학습의 집중력과 지속성을 높여주는 플랫폼입니다.
            </p>
            <div className="mt-4 space-y-1 text-xs text-gray-500">
              <p>학습 집중 · 반복 효율 · 실전 회화 감각</p>
            </div>
          </div>

          {/* 주요 기능 */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">기능</h3>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white transition-colors">🔊 문장별 TTS 오디오 생성</li>
              <li className="hover:text-white transition-colors">🎞 영상 스크립트 반복 학습</li>
              <li className="hover:text-white transition-colors">🗂 사용자 지정 카테고리</li>
              <li className="hover:text-white transition-colors">📌 메모 & 문장 관리</li>
              <li className="hover:text-white transition-colors">📈 학습 진행도 체감</li>
            </ul>
          </div>

            {/* 학습 리소스 */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">학습 리소스</h3>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white transition-colors">🎧 나의 오디오</li>
              <li className="hover:text-white transition-colors">📹 나의 영상</li>
              <li className="hover:text-white transition-colors">📝 스크립트 & 트랜스크립트</li>
              <li className="hover:text-white transition-colors">💡 반복 학습 팁</li>
              <li className="hover:text-white transition-colors">🛠 향후 기능 로드맵</li>
            </ul>
          </div>

          {/* 링크 & 연락 */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">바로가기</h3>
            <ul className="space-y-2 text-sm mb-6">
              <li className="hover:text-white transition-colors"><Link href="/upload">➡ 오디오/영상 업로드</Link></li>
              <li className="hover:text-white transition-colors"><Link href="/videos">➡ 영상 학습</Link></li>
              <li className="hover:text-white transition-colors"><Link href="/my-audio">➡ 나의 오디오</Link></li>
              <li className="hover:text-white transition-colors"><Link href="/my-videos">➡ 나의 영상</Link></li>
              <li className="hover:text-white transition-colors"><Link href="/profile">➡ 프로필</Link></li>
            </ul>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400">문의 / 피드백</p>
              <p className="text-sm">
                ✉ <a className="underline decoration-dashed underline-offset-2 hover:text-white" href="mailto:ocean3885@gmail.com">ocean3885@gmail.com</a>
              </p>
              <p className="text-xs text-gray-500">기능 제안 환영합니다!</p>
            </div>
            <div className="mt-4 flex gap-4 text-lg">
              <span className="hover:text-white cursor-pointer" aria-label="Twitter">🐦</span>
              <span className="hover:text-white cursor-pointer" aria-label="GitHub">💻</span>
              <span className="hover:text-white cursor-pointer" aria-label="YouTube">▶️</span>
            </div>
          </div>
        </div>

        {/* 하단 바 */}
        <div className="mt-12 pt-6 border-t border-gray-800 text-xs flex flex-col sm:flex-row gap-4 sm:gap-8 justify-between items-center">
          <p className="text-gray-400">&copy; {year} LangBridge. All rights reserved.</p>
          <div className="flex flex-wrap gap-4 text-gray-500">
            <span className="hover:text-gray-300 cursor-pointer">이용약관</span>
            <span className="hover:text-gray-300 cursor-pointer">개인정보 처리방침</span>
            <span className="hover:text-gray-300 cursor-pointer">쿠키 정책</span>
            <span className="hover:text-gray-300 cursor-pointer">도움말</span>
          </div>
        </div>
      </div>
    </footer>
  );
}