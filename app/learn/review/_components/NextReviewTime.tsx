'use client';
import { useEffect, useState } from 'react';
export function NextReviewTime({ value, language }: { value: string | null; language: 'ko' | 'en' }) {
  const [label, setLabel] = useState('');
  useEffect(() => { setLabel(value ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''); }, [value, language]);
  if (!value) return null;
  return <p className="mt-3 text-sm text-zinc-500">{language === 'ko' ? '다음 예정 복습: ' : 'Next scheduled review: '}<time dateTime={value}>{label || (language === 'ko' ? '일정 확인 중…' : 'Loading schedule…')}</time></p>;
}
