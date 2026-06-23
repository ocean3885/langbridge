'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, BookOpen, Clock3 } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'verifying' | 'processing' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [language, setLanguage] = useState<'ko' | 'en'>('en');
  const [paymentData, setPaymentData] = useState<{
    provider?: string;
    currentPeriodEnd?: string | null;
    billingPeriod?: string;
    orderName?: string;
    totalAmount?: number;
    processing?: boolean;
  } | null>(null);

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const provider = searchParams.get('provider');
  const transactionId = searchParams.get('transactionId');
  const isKorean = language === 'ko';

  useEffect(() => {
    const languageCookie = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('lb_display_language='))
      ?.split('=')[1];
    setLanguage(languageCookie === 'ko' ? 'ko' : 'en');
  }, []);

  useEffect(() => {
    const paymentIsKorean = document.cookie.includes('lb_display_language=ko');

    if (provider === 'paddle') {
      if (!transactionId) {
        setStatus('error');
        setErrorMessage(paymentIsKorean ? '결제 거래 정보를 확인할 수 없습니다.' : 'Payment transaction information is missing.');
        return;
      }

      async function waitForPaddleWebhook() {
        let checkoutWasFound = false;

        for (let attempt = 0; attempt < 60; attempt += 1) {
          try {
            const response = await fetch(
              `/api/paddle/checkout/status?transactionId=${encodeURIComponent(transactionId!)}`,
              { cache: 'no-store' }
            );
            const data = await response.json();

            if (response.status === 404) {
              setStatus('error');
              setErrorMessage(paymentIsKorean ? '이 계정의 결제 거래를 찾을 수 없습니다.' : 'This payment transaction does not belong to your account.');
              return;
            }

            checkoutWasFound = response.ok;
            if (response.ok && data.isActive) {
              setPaymentData({
                provider: 'paddle',
                currentPeriodEnd: data.currentPeriodEnd,
                billingPeriod: data.billingPeriod,
              });
              setStatus('success');
              return;
            }

            if (response.ok && data.checkoutStatus === 'failed') {
              setStatus('error');
              setErrorMessage(paymentIsKorean ? '결제가 완료되지 않았습니다. 멤버십 페이지에서 다시 시도해 주세요.' : 'The payment was not completed. Please try again from the membership page.');
              return;
            }
          } catch (error) {
            console.error('Paddle subscription status check failed:', error);
          }

          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }

        if (checkoutWasFound) {
          setStatus('processing');
          setPaymentData({ provider: 'paddle', processing: true });
        } else {
          setStatus('error');
          setErrorMessage(paymentIsKorean ? '결제 상태를 확인하지 못했습니다. 잠시 후 프로필에서 구독 상태를 확인해 주세요.' : 'We could not verify the payment status. Please check your subscription in your profile shortly.');
        }
      }

      void waitForPaddleWebhook();
      return;
    }

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
  }, [paymentKey, orderId, amount, provider, transactionId]);

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
          {isKorean ? '결제 승인을 검증하고 있습니다' : 'Verifying your payment'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
          {isKorean ? '안전하게 결제 처리를 마무리하고 있으니 잠시만 기다려 주세요.' : 'Please wait while we securely finish processing your payment.'}
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
          {isKorean ? '결제 검증 오류' : 'Payment verification error'}
        </h2>
        <p className="mt-2 max-w-md text-sm text-rose-600 dark:text-rose-400">
          {errorMessage}
        </p>
        <Link
          href="/pricing"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-900 hover:bg-zinc-800 px-6 text-sm font-bold text-white transition dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          {isKorean ? '멤버십 페이지로 돌아가기' : 'Return to membership'}
        </Link>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center text-center px-4">
        <Clock3 className="h-12 w-12 text-amber-500 dark:text-amber-400" />
        <h2 className="mt-6 text-2xl font-black text-zinc-900 dark:text-zinc-50">
          {isKorean ? '결제 정보를 동기화하고 있습니다' : 'Syncing your payment'}
        </h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          {isKorean
            ? '결제 거래는 확인되었습니다. Paddle 웹훅 처리 후 프리미엄 권한이 활성화되며, 잠시 후 프로필에서 상태를 확인할 수 있습니다.'
            : 'Your transaction was found. Premium access will activate after Paddle finishes sending the subscription update.'}
        </p>
        <Link
          href="/profile"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-900 px-6 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          {isKorean ? '프로필에서 확인하기' : 'Check your profile'}
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
          {isKorean ? '결제가 완료되었습니다!' : 'Payment complete!'}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {isKorean ? '홀라링고 프리미엄 구독이 활성화되었습니다.' : 'Your HolaLingo Premium subscription is active.'}
        </p>

        {paymentData?.provider === 'paddle' ? (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-300">
            {isKorean
              ? `구독이 활성화되었습니다${paymentData.currentPeriodEnd ? ` · 다음 갱신일 ${new Date(paymentData.currentPeriodEnd).toLocaleDateString('ko-KR')}` : ''}.`
              : `Your subscription is active${paymentData.currentPeriodEnd ? ` · Next renewal ${new Date(paymentData.currentPeriodEnd).toLocaleDateString('en-US')}` : ''}.`}
          </div>
        ) : paymentData ? (
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
                {paymentData.currentPeriodEnd
                  ? new Date(paymentData.currentPeriodEnd).toLocaleDateString()
                  : '-'}{' '}
                ({paymentData.billingPeriod === 'annual' ? '12개월권' : '30일권'})
              </span>
            </div>
          </div>
        ) : null}

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
            {isKorean ? '스페인어 학습하러 가기' : 'Start learning Spanish'}
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
