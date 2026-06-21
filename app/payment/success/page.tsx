'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorMessage('필수 결제 정보가 누락되었습니다.');
      return;
    }

    async function confirmPayment() {
      try {
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setPaymentData(data.data);
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.message || '결제 승인 검증에 실패했습니다.');
        }
      } catch (err) {
        console.error('Payment confirmation error:', err);
        setStatus('error');
        setErrorMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    }

    confirmPayment();
  }, [paymentKey, orderId, amount]);

  if (status === 'verifying') {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center text-center px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="text-emerald-600 dark:text-emerald-400"
        >
          <Loader2 className="h-12 w-12" />
        </motion.div>
        <h2 className="mt-6 text-xl font-black text-zinc-900 dark:text-zinc-50">
          결제 승인을 검증하고 있습니다
        </h2>
        <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
          안전하게 결제 처리를 마무리하고 있으니 잠시만 기다려 주세요.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center text-center px-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-2xl font-black text-zinc-900 dark:text-zinc-50">
          결제 검증 오류
        </h2>
        <p className="mt-2 max-w-md text-sm text-rose-600 dark:text-rose-400">
          {errorMessage}
        </p>
        <Link
          href="/pricing"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-900 hover:bg-zinc-800 px-6 text-sm font-bold text-white transition dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          멤버십 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-10 w-10" />
        </motion.div>

        <h2 className="mt-6 text-2xl font-black text-zinc-900 dark:text-zinc-50">
          결제가 완료되었습니다!
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          홀라링고 프리미엄 이용권이 활성화되었습니다.
        </p>

        {paymentData && (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-left text-xs text-zinc-500 dark:bg-zinc-800/40 dark:text-zinc-400 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-zinc-400">주문명</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">{paymentData.orderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-zinc-400">결제 금액</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">
                {Number(paymentData.totalAmount || amount).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-zinc-400">구독 시작일</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-zinc-400">만료 예정일</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">
                {new Date(paymentData.currentPeriodEnd).toLocaleDateString()}{' '}
                ({paymentData.billingPeriod === 'annual' ? '12개월권' : '30일권'})
              </span>
            </div>
          </div>
        )}

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-8"
        >
          <Link
            href="/bundles"
            className="flex w-full h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-6 text-sm font-bold text-white shadow-md transition-all duration-300 hover:shadow-lg hover:shadow-emerald-700/20"
          >
            <BookOpen className="h-4 w-4" />
            스페인어 학습하러 가기
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center text-center px-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600 dark:text-emerald-400" />
        <h2 className="mt-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">로딩 중...</h2>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
