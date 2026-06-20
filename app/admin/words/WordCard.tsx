import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { Word } from './words.types';
import { TARGET_DISTRACTOR_COUNT } from './words.constants';
import { formatDifficulty, formatPOS, getMeaningDisplay } from './words.utils';

interface WordCardProps {
  word: Word;
  deleting: boolean;
  onDelete: (id: number) => void;
}

export default function WordCard({ word, deleting, onDelete }: WordCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <Link href={`/admin/words/${word.id}`} className="block p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {word.lang_code}
            </span>
            {word.pos.map((pos, index) => (
              <span key={`${pos}-${index}`} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {formatPOS(pos)}
              </span>
            ))}
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              {formatDifficulty(word.difficulty)}
            </span>
            <span className={`${word.is_verified
              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            } rounded-full px-2 py-0.5 text-[10px] font-bold`}>
              {word.is_verified ? '검수 완료' : '검수 대기'}
            </span>
          </div>
          <div className="h-6 w-6" />
        </div>

        <h3 className="mb-1 flex items-baseline gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
          {word.word}
          {word.gender && word.gender !== 'null' && (
            <span className="text-xs font-normal text-gray-400">({word.gender})</span>
          )}
        </h3>

        <div className="space-y-0.5">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {getMeaningDisplay(word.meaning_ko)}
          </p>
          <p className="text-[11px] italic text-gray-400">
            {getMeaningDisplay(word.meaning_en)}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 text-[10px] text-gray-400 dark:border-gray-800">
          <div className="flex gap-2">
            <span>ID: {word.id}</span>
            <span>•</span>
            <span className="font-medium text-blue-500 dark:text-blue-400">문장 {word.sentence_count || 0}</span>
            <span>•</span>
            <span className={(word.distractor_count ?? 0) < TARGET_DISTRACTOR_COUNT ? 'font-bold text-red-500' : 'text-gray-400 dark:text-gray-500'}>
              오답 {word.distractor_count || 0}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute right-4 top-4 opacity-0 transition-all group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onDelete(word.id)}
          disabled={deleting}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
          title="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

