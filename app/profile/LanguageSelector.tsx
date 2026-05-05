'use client';

import { useState } from 'react';
import { setLanguageAction } from './actions';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: 'ko' | 'en';
}

export default function LanguageSelector({ currentLanguage }: LanguageSelectorProps) {
  const [isPending, setIsPending] = useState(false);

  const handleLanguageChange = async (lang: 'ko' | 'en') => {
    if (lang === currentLanguage) return;
    setIsPending(true);
    try {
      await setLanguageAction(lang);
    } catch (error) {
      alert('언어 설정 변경 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex gap-4 mt-2">
      <Button
        variant={currentLanguage === 'ko' ? 'default' : 'outline'}
        onClick={() => handleLanguageChange('ko')}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2"
      >
        한국어 {currentLanguage === 'ko' && <Check className="w-4 h-4" />}
      </Button>
      <Button
        variant={currentLanguage === 'en' ? 'default' : 'outline'}
        onClick={() => handleLanguageChange('en')}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2"
      >
        English {currentLanguage === 'en' && <Check className="w-4 h-4" />}
      </Button>
    </div>
  );
}
