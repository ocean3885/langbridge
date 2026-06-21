'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import type { AppUser } from '@/lib/auth/app-user';

const copy = {
  ko: {
    title: '프리미엄 멤버십',
    subtitle: '랭브릿지와 함께 가장 아늑하고 깊이 있는 스페인어 학습을 시작해보세요.',
    badge: 'PREMIUM ACCESS',
    planName: '1개월 프리미엄 패스',
    price: '₩9,900',
    period: '/ 월',
    ctaSubscribe: '프리미엄 구독하기',
    ctaLogin: '로그인하고 구독하기',
    ctaActive: '구독 이용 중',
    featuresTitle: '멤버십 포함 혜택',
    features: [
      '모든 레슨 및 번들 무제한 학습',
      '새로운 테마 & 단어 번들 우선 공개',
      '원어민 오디오 발음 실습 & 작문 도구 제공',
      'AI 기반 개인 맞춤 퀴즈 및 상세 복습',
      '학습 리포트 및 상세 통계 대시보드',
      '광고가 없는 완전한 몰입 환경',
    ],
    terms: '구독 기간 종료 전 언제든 취소 가능하며, 결제 완료 시 바로 프리미엄 혜택을 이용할 수 있습니다.',
  },
  en: {
    title: 'Premium Membership',
    subtitle: 'Unlock a cozy and in-depth Spanish learning journey with LangBridge.',
    badge: 'PREMIUM ACCESS',
    planName: '1-Month Premium Pass',
    price: '₩9,900',
    period: '/ month',
    ctaSubscribe: 'Subscribe to Premium',
    ctaLogin: 'Log in to Subscribe',
    ctaActive: 'Active Subscription',
    featuresTitle: "What's included",
    features: [
      'Unlimited access to all lessons & bundles',
      'Priority access to new learning themes',
      'Native speaker audio & writing tools',
      'AI personalized quizzes & detailed review',
      'Detailed learning analytics & dashboard',
      'Completely ad-free learning experience',
    ],
    terms: 'Cancel anytime. Immediate access to all premium features upon confirmation.',
  }
};

interface PricingClientProps {
  language: 'ko' | 'en';
  user: AppUser | null;
  isActiveSubscription: boolean;
  clientKey: string;
}

export function PricingClient({
  language,
  user,
  isActiveSubscription,
  clientKey,
}: PricingClientProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = copy[language];

  const handleSubscribe = async () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/pricing`);
      return;
    }

    if (isActiveSubscription) {
      return;
    }

    setLoading(true);
    try {
      // Dynamically load the Toss Payments SDK
      const tossPayments = await loadTossPayments(clientKey);
      
      // Use user's ID as customerKey for identifying payment transactions
      const payment = tossPayments.payment({ customerKey: user.id });

      await payment.requestPayment({
        method: 'CARD',
        amount: {
          currency: 'KRW',
          value: 9900,
        },
        orderId: `order_${user.id}_${Date.now()}`,
        orderName: language === 'ko' ? '랭브릿지 프리미엄 구독 (1개월)' : 'LangBridge Premium Subscription (1 Month)',
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (error) {
      console.error('Failed to trigger Toss Payments Checkout:', error);
      alert(language === 'ko' ? '결제 요청 중 오류가 발생했습니다. 다시 시도해 주세요.' : 'Error requesting payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header section with entrance animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50">
          <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
          {t.subtitle}
        </p>
      </motion.div>

      {/* Subscription Card Section */}
      <div className="mt-12 flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-emerald-950/20 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)]"
        >
          {/* Accent colored top bar gradient */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
          
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* Premium Plan Badge */}
              <div className="flex items-center gap-1.5 w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.badge}
              </div>

              {/* Plan Name & Pricing */}
              <h2 className="mt-4 text-2xl font-black text-zinc-900 dark:text-zinc-50">
                {t.planName}
              </h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {t.price}
                </span>
                <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                  {t.period}
                </span>
              </div>

              {/* Pricing Divider */}
              <hr className="my-6 border-zinc-100 dark:border-zinc-800" />

              {/* Benefits list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t.featuresTitle}
                </h3>
                <ul className="mt-4 space-y-3">
                  {t.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Subscribe Action Button */}
            <div className="mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubscribe}
                disabled={loading || isActiveSubscription}
                className={`relative flex w-full items-center justify-center rounded-2xl py-4 text-center text-base font-extrabold text-white shadow-md transition-all duration-300 ${
                  isActiveSubscription
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-700/25 active:scale-95'
                }`}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isActiveSubscription ? (
                  t.ctaActive
                ) : !user ? (
                  t.ctaLogin
                ) : (
                  t.ctaSubscribe
                )}
              </motion.button>

              {/* Terms text */}
              <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                {t.terms}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
