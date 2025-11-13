'use client';

import Link from 'next/link';

type Props = {
  className?: string;
};

// 간단한 언어 포커스 배너 (현재: 스페인어)
export default function LanguageFocusBanner({ className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4 text-center sm:text-left">
        <div className="text-2xl sm:text-3xl" aria-hidden>
          🇪🇸
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-orange-800">
            지금은 스페인어 학습에 집중하고 있어요
          </h3>
          <p className="text-sm text-orange-700/90">
            문장을 업로드하면 스페인어 음성(TTS)으로 자동 생성되고, 반복 학습 플레이어로 청취/쉐도잉을 도와드립니다.
          </p>
        </div>
        <div className="mt-2 sm:mt-0">
          <Link
            href="/upload"
            className="inline-flex items-center rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 shadow"
          >
            스페인어 오디오 만들기
          </Link>
        </div>
      </div>
    </div>
  );
}
