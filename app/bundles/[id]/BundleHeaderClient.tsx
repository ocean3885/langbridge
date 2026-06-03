'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getBundleLevelDisplay } from '@/lib/bundle-level';

interface BundleHeaderClientProps {
  bundle: any;
  itemsCount: number;
  language: 'ko' | 'en';
}

const translations = {
  ko: {
    general: '일반',
    noDescription: '이 번들에 대한 설명이 없습니다.',
    totalItems: (count: number) => `${count}개 항목`,
  },
  en: {
    general: 'General',
    noDescription: 'No description provided for this bundle.',
    totalItems: (count: number) => `${count} items`,
  }
};

export default function BundleHeaderClient({ bundle, itemsCount, language }: BundleHeaderClientProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[language] || translations['ko'];
  const level = getBundleLevelDisplay(bundle.level, language);
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US');
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-4 md:mb-8 transition-all duration-300">
      <div className="p-4 md:p-8 flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3">
          <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] md:text-xs font-black rounded-full uppercase tracking-wider">
            {level.label}
          </span>
          <span className="px-2 py-0.5 md:px-3 md:py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] md:text-xs font-bold rounded-full">
            {(language === 'en' ? bundle.bundle_category?.name_en : bundle.bundle_category?.name) || bundle.bundle_category?.name || t.general}
          </span>
          <span className="hidden md:inline-block w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-1"></span>
          <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-medium">
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md text-gray-500 dark:text-gray-400 font-bold">{t.totalItems(itemsCount)}</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">{formatDate(bundle.created_at)}</span>
          </div>
        </div>
        
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {(language === 'en' ? bundle.title_en : bundle.title) || bundle.title}
          </h1>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors flex-shrink-0"
            aria-label="Toggle description"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {isExpanded && (
          <p className="mt-4 text-sm md:text-base lg:text-lg text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-50 dark:border-gray-800 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {(language === 'en' ? bundle.description_en : bundle.description) || bundle.description || t.noDescription}
          </p>
        )}
      </div>
    </div>
  );
}
