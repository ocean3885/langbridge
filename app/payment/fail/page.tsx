'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function FailContent() {
  const searchParams = useSearchParams();

  const code = searchParams.get('code') || 'PAYMENT_FAILED';
  const message = searchParams.get('message') || '결제 진행 중 오류가 발생했습니다. 다시 시도해 주세요.';

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400">
          <XCircle className="h-10 w-10" />
        </div>

        <h2 className="mt-6 text-2xl font-black text-zinc-900 dark:text-zinc-50">
          결제에 실패했습니다
        </h2>
        <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
          결제 처리 중 아래와 같은 문제가 발생했습니다.
        </p>

        {/* Error Detail Box */}
        <div className="mt-6 rounded-2xl bg-zinc-50 p-5 text-left dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
            Error Details
          </p>
          <p className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-relaxed">
            {message}
          </p>
          <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-400">
            <span>에러 코드</span>
            <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-650 dark:bg-zinc-800 dark:text-zinc-300">
              {code}
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/pricing"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 px-6 text-sm font-bold text-white transition dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            다시 시도하기
          </Link>
          <Link
            href="/bundles"
            className="flex h-12 w-full items-center justify-center text-sm font-bold text-zinc-550 hover:text-zinc-700 transition dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            홈으로 이동
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function FailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center text-center px-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">로딩 중...</h2>
      </div>
    }>
      <FailContent />
    </Suspense>
  );
}
