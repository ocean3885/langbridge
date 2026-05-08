'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  language?: 'ko' | 'en';
  href?: string;
}

const translations = {
  ko: '뒤로가기',
  en: 'Back'
};

export default function BackButton({ language = 'ko', href }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      aria-label={language === 'ko' ? '이전 페이지로' : 'Go back'}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="inline">{translations[language] || translations.ko}</span>
    </button>
  );
}
