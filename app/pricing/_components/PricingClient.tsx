'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializePaddle, type Environments } from '@paddle/paddle-js';
import { motion } from 'framer-motion';
import {
  Ban,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Infinity,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Zap,
} from 'lucide-react';
import type { AppUser } from '@/lib/auth/app-user';
import { Checkbox } from '@/components/ui/checkbox';

const copy = {
  ko: {
    eyebrow: 'Premium Access',
    heroTitle: (
      <>
        스페인어를 더 깊이,
        <br />
        <span className="text-[#E27D60]">배움에는 제한 없이</span>
      </>
    ),
    heroDescription: '모든 번들과 다양한 연습 모드, 스마트 복습 기능을 한 번에 열어보세요.',
    heroPoints: ['원하는 시간, 어디서든 학습', '스마트 학습 도구로 꾸준한 동기 부여', '매일 눈에 보이는 성장'],
    whyTitle: '프리미엄을 선택하는 이유',
    benefitCards: [
      { title: '모든 콘텐츠 잠금 해제', description: '모든 번들과 연습 모드를 제한 없이 이용하세요.' },
      { title: '더 똑똑한 연습', description: '개인화된 복습으로 꼭 필요한 부분에 집중하세요.' },
      { title: '성장을 한눈에', description: '학습 기록과 성취를 확인하며 꾸준히 성장하세요.' },
      { title: '몰입을 방해하지 않게', description: '광고 없이 오롯이 학습에만 집중할 수 있어요.' },
    ],
    planName: '프리미엄 월간 멤버십',
    period: '/ 월',
    monthly: '월간',
    annual: '연간',
    annualPlanName: '프리미엄 연간 멤버십',
    annualPeriod: '/ 년',
    cancelShort: '자동 갱신 · 언제든 해지 가능',
    purchaseSummaryMonthly: '월간 멤버십 · 매월 $4',
    purchaseSummaryAnnual: '연간 멤버십 · 매년 $40',
    immediateAccess: '결제 완료 후 즉시 이용할 수 있습니다. 해지 후에도 현재 결제 기간 종료일까지 이용할 수 있습니다.',
    taxNotice: '지역에 따라 세금이 포함되거나 결제 단계에서 추가될 수 있습니다. 최종 금액은 Paddle 결제창에서 확인하세요.',
    agreementPrefix: '',
    termsLabel: '이용약관',
    agreementMiddle: ' 및 ',
    refundLabel: '환불정책',
    agreementSuffix: '을 확인했으며, 선택한 주기의 자동 갱신 결제에 동의합니다.',
    agreementRequired: '결제 전 이용약관 및 환불정책에 동의해 주세요.',
    included: '포함된 혜택',
    features: [
      '모든 프리미엄 번들 무제한 이용',
      '전체 학습 및 연습 모드',
      '취약 단어와 문장을 위한 맞춤 복습',
      '학습 기록과 상세 성장 리포트',
      '광고 없는 몰입형 학습 경험',
    ],
    ctaSubscribe: '월간 멤버십 시작하기 · $4',
    ctaSubscribeAnnual: '연간 멤버십 시작하기 · $40',
    ctaLogin: '로그인하고 시작하기',
    ctaActive: '프리미엄 이용 중',
    ctaUpdatePayment: '결제수단 업데이트',
    secure: 'Paddle이 안전하게 결제를 처리합니다',
    comparisonTitle: '무료 vs 프리미엄',
    comparisonDescription: '프리미엄으로 얼마나 더 깊게 배울 수 있는지 비교해 보세요.',
    free: '무료',
    premium: '프리미엄',
    comparisonRows: [
      ['번들 이용', '일부 번들', '모든 번들'],
      ['연습 모드', '기본 연습', '전체 연습 모드'],
      ['복습 도구', '수동 복습', '스마트 맞춤 복습'],
      ['학습 분석', '기본 통계', '상세 리포트와 기록'],
      ['광고', '광고 포함', '광고 없음'],
    ],
    faqTitle: '자주 묻는 질문',
    faqs: [
      ['결제 후 환불을 요청할 수 있나요?', '네. 이용 여부와 관계 법령에 따라 환불 가능 여부와 금액이 달라질 수 있습니다. 자세한 내용은 환불정책에서 확인해 주세요.'],
      ['결제하면 바로 이용할 수 있나요?', '결제가 완료되는 즉시 모든 프리미엄 번들과 학습 기능을 이용할 수 있습니다.'],
      ['자동으로 다시 결제되나요?', '네. 선택한 월간 또는 연간 주기로 자동 갱신됩니다. 프로필에서 언제든 해지할 수 있으며, 해지 후에도 현재 결제 기간 종료일까지 이용할 수 있습니다.'],
      ['초보자에게도 프리미엄이 도움이 되나요?', '물론이에요. 왕초보부터 고급 학습자까지 자신의 수준에 맞는 번들과 연습을 선택할 수 있습니다.'],
    ],
    paymentError: '결제 요청 중 오류가 발생했습니다. 다시 시도해 주세요.',
  },
  en: {
    eyebrow: 'Premium Access',
    heroTitle: (
      <>
        Learn Spanish more deeply,
        <br />
        <span className="text-[#E27D60]">without limits</span>
      </>
    ),
    heroDescription: 'Unlock every bundle, practice mode, smart review tool, and progress feature in one place.',
    heroPoints: ['Learn anytime, anywhere', 'Stay motivated with smart tools', 'See real progress, every day'],
    whyTitle: 'Why learners love Premium',
    benefitCards: [
      { title: 'Everything, unlocked', description: 'Access every bundle and practice mode without limits.' },
      { title: 'Smarter practice', description: 'Focus on what matters most with personalized review.' },
      { title: 'Track real progress', description: 'See your learning history and achievements grow.' },
      { title: 'Distraction-free learning', description: 'Stay in the flow with a clean, ad-free experience.' },
    ],
    planName: 'Premium Monthly Membership',
    period: '/ month',
    monthly: 'Monthly',
    annual: 'Yearly',
    annualPlanName: 'Premium Yearly Membership',
    annualPeriod: '/ year',
    cancelShort: 'Cancel anytime · Renews automatically',
    purchaseSummaryMonthly: 'Monthly membership · $4/month',
    purchaseSummaryAnnual: 'Yearly membership · $40/year',
    immediateAccess: 'Access starts immediately after payment. If you cancel, access continues until the end of the current billing period.',
    taxNotice: 'Taxes may be included or added at checkout depending on your location. The final amount is shown in Paddle Checkout.',
    agreementPrefix: 'I have read and agree to the ',
    termsLabel: 'Terms of Use',
    agreementMiddle: ' and ',
    refundLabel: 'Refund Policy',
    agreementSuffix: ', and I authorize recurring charges for the selected billing period.',
    agreementRequired: 'Please agree to the Terms of Use and Refund Policy before payment.',
    included: "What's included",
    features: [
      'Unlimited access to every premium bundle',
      'Full learning and practice modes',
      'Personalized review for weak words and sentences',
      'Learning history and detailed progress reports',
      'A completely ad-free learning experience',
    ],
    ctaSubscribe: 'Start Monthly Membership · $4',
    ctaSubscribeAnnual: 'Start Yearly Membership · $40',
    ctaLogin: 'Log in to Start',
    ctaActive: 'Premium Active',
    ctaUpdatePayment: 'Update Payment Method',
    secure: 'Secure checkout powered by Paddle',
    comparisonTitle: 'Free vs Premium',
    comparisonDescription: 'See how Premium helps you learn with more depth and confidence.',
    free: 'Free',
    premium: 'Premium',
    comparisonRows: [
      ['Bundle access', 'Selected bundles', 'Every bundle'],
      ['Practice modes', 'Basic practice', 'All practice modes'],
      ['Review tools', 'Manual review', 'Smart personalized review'],
      ['Progress analytics', 'Basic stats', 'Detailed reports & history'],
      ['Ads', 'Ads included', 'Ad-free'],
    ],
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      ['Can I request a refund?', 'Yes. Eligibility and the refund amount may vary based on usage and applicable law. See the Refund Policy for details.'],
      ['What do I get immediately?', 'Every premium bundle and learning feature is available as soon as your payment is confirmed.'],
      ['Will I be charged again automatically?', 'Yes. Your membership renews monthly or yearly until canceled. You can cancel from your profile at any time and keep access through the current billing period.'],
      ['Is Premium good for beginners?', 'Absolutely. Learners at every level can choose bundles and practices that match their ability.'],
    ],
    paymentError: 'Error requesting payment. Please try again.',
  },
};

const benefitIcons = [Infinity, Star, BarChart3, Ban];
const benefitColors = [
  'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
  'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
  'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300',
  'bg-orange-50 text-[#E27D60] dark:bg-orange-950/50 dark:text-orange-300',
];
const faqIcons = [HelpCircle, Zap, ShieldCheck, UserRound];

interface PricingClientProps {
  language: 'ko' | 'en';
  user: AppUser | null;
  isActiveSubscription: boolean;
  subscriptionStatus: string | null;
  paddleEnvironment: Environments;
  paddleClientToken: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  initialBillingPeriod: 'monthly' | 'annual';
}

export function PricingClient({
  language,
  user,
  isActiveSubscription,
  subscriptionStatus,
  paddleEnvironment,
  paddleClientToken,
  monthlyPriceId,
  yearlyPriceId,
  initialBillingPeriod,
}: PricingClientProps) {
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>(initialBillingPeriod);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const completedTransactionRef = useRef<string | null>(null);
  const router = useRouter();
  const t = copy[language];
  const isKorean = language === 'ko';
  const displayWeight = isKorean ? 'font-bold' : 'font-black';
  const emphasisWeight = isKorean ? 'font-medium' : 'font-bold';
  const actionWeight = isKorean ? 'font-bold' : 'font-extrabold';
  const bodyWeight = isKorean ? 'font-normal' : 'font-medium';
  const heroTitleSize = isKorean
    ? 'text-[2.15rem] leading-[1.3] tracking-[-0.025em] sm:text-5xl lg:text-[3.4rem]'
    : 'text-4xl leading-[1.16] tracking-[-0.04em] sm:text-5xl lg:text-[3.55rem]';
  const isAnnual = billingPeriod === 'annual';
  const requiresPaymentMethodUpdate = subscriptionStatus === 'past_due';

  const basePrice = '$4';
  const baseAnnualPrice = '$40';
  const baseAnnualOriginalPrice = '$48';
  const baseAnnualDiscount = isKorean ? '17% 할인' : '17% off';
  const baseAnnualSavings = isKorean ? '$8 절약' : 'Save $8';
  
  const purchaseSummaryMonthlyText = t.purchaseSummaryMonthly;
  const purchaseSummaryAnnualText = t.purchaseSummaryAnnual;

  const ctaSubscribeText = t.ctaSubscribe;
  const ctaSubscribeAnnualText = t.ctaSubscribeAnnual;

  const selectedPrice = isAnnual ? baseAnnualPrice : basePrice;
  const selectedPeriod = isAnnual ? t.annualPeriod : t.period;
  const selectedPlanName = isAnnual ? t.annualPlanName : t.planName;
  const selectedCta = isAnnual ? ctaSubscribeAnnualText : ctaSubscribeText;
  const purchaseSummary = isAnnual ? purchaseSummaryAnnualText : purchaseSummaryMonthlyText;

  const handleSubscribe = async () => {
    if (!user) {
      const redirectTo = `/pricing?billing=${billingPeriod}`;
      router.push(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }
    if (requiresPaymentMethodUpdate) {
      window.location.href = '/api/paddle/portal?target=payment-method';
      return;
    }
    if (isActiveSubscription) return;
    if (!hasAcceptedTerms) return;

    const selectedPriceId = isAnnual ? yearlyPriceId : monthlyPriceId;
    if (!paddleClientToken || !selectedPriceId) {
      console.error('Paddle environment variables are not configured.');
      alert(t.paymentError);
      return;
    }

    setLoading(true);
    try {
      const paddle = await initializePaddle({
        environment: paddleEnvironment,
        token: paddleClientToken,
        eventCallback: (event) => {
          if (event.name === 'checkout.completed' && event.data?.transaction_id) {
            completedTransactionRef.current = event.data.transaction_id;
            window.location.href = `/payment/success?provider=paddle&transactionId=${encodeURIComponent(event.data.transaction_id)}`;
          }
          if (
            event.name === 'checkout.closed' &&
            event.data?.transaction_id &&
            completedTransactionRef.current !== event.data.transaction_id
          ) {
            void fetch('/api/paddle/checkout/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionId: event.data.transaction_id,
                action: 'abandon',
              }),
              keepalive: true,
            });
          }
        },
      });

      if (!paddle) throw new Error('Paddle failed to initialize.');

      const transactionResponse = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingPeriod, termsAccepted: hasAcceptedTerms }),
      });
      const transaction = await transactionResponse.json() as {
        transactionId?: string;
        error?: string;
        code?: string;
      };

      if (!transactionResponse.ok || !transaction.transactionId) {
        if (transaction.code === 'PAYMENT_METHOD_UPDATE_REQUIRED') {
          window.location.href = '/api/paddle/portal?target=payment-method';
          return;
        }
        throw new Error(transaction.error || 'Paddle transaction creation failed.');
      }

      paddle.Checkout.open({
        transactionId: transaction.transactionId,
        customer: user.email ? { email: user.email } : undefined,
        settings: {
          displayMode: 'overlay',
          locale: language,
          successUrl: `${window.location.origin}/payment/success?provider=paddle&transactionId=${encodeURIComponent(transaction.transactionId)}`,
        },
      });
    } catch (error) {
      console.error('Failed to open Paddle Checkout:', error);
      alert(t.paymentError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#FCFAF6] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl dark:bg-orange-950/10" />
      <div className="pointer-events-none absolute right-[-8rem] top-80 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-950/15" />

      <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <section className="grid items-center gap-12 lg:grid-cols-[1fr_0.92fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className={`inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ${emphasisWeight}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.eyebrow}
            </div>
            <h1 className={`mt-5 break-keep ${heroTitleSize} ${displayWeight}`}>
              {t.heroTitle}
            </h1>
            <p className={`mt-5 max-w-xl break-keep text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 sm:text-base ${bodyWeight}`}>
              {t.heroDescription}
            </p>
            <ul className="mt-7 space-y-3.5">
              {t.heroPoints.map((point) => (
                <li key={point} className={`flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 ${isKorean ? 'font-medium' : 'font-semibold'}`}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="relative mx-auto w-full max-w-[500px]"
          >
            <div className="absolute -right-5 top-12 h-24 w-24 rounded-full bg-[#F19A79] dark:bg-[#9D513D]" />
            <div className="absolute -bottom-6 -left-7 h-24 w-36 rounded-[50%] bg-[#C8DDB5] dark:bg-emerald-900/60" />
            <div className="absolute -left-10 top-1/2 hidden grid-cols-3 gap-2 sm:grid">
              {Array.from({ length: 12 }).map((_, index) => (
                <span key={index} className="h-1.5 w-1.5 rounded-full bg-[#D79A58]" />
              ))}
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_24px_70px_rgba(75,56,42,0.18)] dark:border-zinc-900">
              <Image
                src="/images/pricing_hero.webp"
                alt="Spanish learner studying at a desk"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 500px"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-4 right-5 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
              <Sparkles className="h-4 w-4 text-[#E27D60]" />
              <span className="text-xs font-extrabold">¡Tú puedes!</span>
            </div>
          </motion.div>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:gap-12">
          <div>
            <h2 className={`text-2xl tracking-tight ${displayWeight}`}>{t.whyTitle}</h2>
            <div className="mt-5 space-y-3">
              {t.benefitCards.map((benefit, index) => {
                const Icon = benefitIcons[index];
                return (
                  <div key={benefit.title} className="flex gap-4 rounded-2xl border border-zinc-200/80 bg-white/75 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${benefitColors[index]}`}>
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </span>
                    <div>
                      <h3 className={`text-sm ${emphasisWeight}`}>{benefit.title}</h3>
                      <p className={`mt-1 text-[13px] leading-[1.65] text-zinc-500 dark:text-zinc-400 ${bodyWeight}`}>{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-[0_20px_50px_rgba(51,48,43,0.13)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <div className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ${emphasisWeight}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.eyebrow}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800/80">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                aria-pressed={!isAnnual}
                className={`rounded-xl px-3 py-3 text-sm transition ${emphasisWeight} ${
                  !isAnnual
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {t.monthly}
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('annual')}
                aria-pressed={isAnnual}
                className={`relative rounded-xl px-3 py-3 text-sm transition ${emphasisWeight} ${
                  isAnnual
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-zinc-700 dark:text-emerald-300'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {t.annual}
                <span className="absolute -right-1.5 -top-2 rounded-full bg-[#E27D60] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {baseAnnualDiscount}
                </span>
              </button>
            </div>

            <h2 className={`mt-5 text-2xl ${displayWeight}`}>{selectedPlanName}</h2>
            <div className="mt-3 flex items-end gap-2">
              <span className={`text-4xl tracking-tight sm:text-5xl ${displayWeight}`}>{selectedPrice}</span>
              <span className={`pb-1 text-sm text-zinc-400 ${isKorean ? 'font-medium' : 'font-semibold'}`}>{selectedPeriod}</span>
            </div>
            {isAnnual && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-zinc-400 line-through">{baseAnnualOriginalPrice}</span>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 font-bold text-[#D6684C] dark:bg-orange-950/40 dark:text-orange-300">
                  {baseAnnualDiscount}
                </span>
                <span className={`text-emerald-600 dark:text-emerald-400 ${isKorean ? 'font-medium' : 'font-semibold'}`}>{baseAnnualSavings}</span>
              </div>
            )}
            <p className={`mt-3 text-[13px] text-zinc-500 ${bodyWeight}`}>{t.cancelShort}</p>
            <div className="my-6 h-px bg-zinc-100 dark:bg-zinc-800" />
            <h3 className={`${isKorean ? 'text-xs tracking-normal' : 'text-[11px] uppercase tracking-[0.08em]'} text-zinc-400 ${emphasisWeight}`}>{t.included}</h3>
            <ul className="mt-4 space-y-3">
              {t.features.map((feature) => (
                <li key={feature} className={`flex items-start gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300 ${bodyWeight}`}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className={`text-sm text-zinc-800 dark:text-zinc-100 ${emphasisWeight}`}>{purchaseSummary}</p>
              <p className={`mt-1 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400 ${bodyWeight}`}>
                {t.immediateAccess}
              </p>
              <p className={`mt-2 text-[12px] leading-5 text-zinc-400 dark:text-zinc-500 ${bodyWeight}`}>
                {t.taxNotice}
              </p>
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={hasAcceptedTerms}
                  onCheckedChange={(checked) => setHasAcceptedTerms(checked === true)}
                  className="mt-0.5 border-zinc-400 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                />
                <span className={`text-[13px] leading-5 text-zinc-600 dark:text-zinc-300 ${bodyWeight}`}>
                  {t.agreementPrefix}
                  <Link href="/terms" target="_blank" className={`${isKorean ? 'font-medium' : 'font-semibold'} text-emerald-700 underline underline-offset-2 dark:text-emerald-300`}>
                    {t.termsLabel}
                  </Link>
                  {t.agreementMiddle}
                  <Link href="/refund-policy" target="_blank" className={`${isKorean ? 'font-medium' : 'font-semibold'} text-emerald-700 underline underline-offset-2 dark:text-emerald-300`}>
                    {t.refundLabel}
                  </Link>
                  {t.agreementSuffix}
                </span>
              </label>
            </div>

            <motion.button
              whileHover={isActiveSubscription || (user && !hasAcceptedTerms && !requiresPaymentMethodUpdate) ? undefined : { y: -2 }}
              whileTap={isActiveSubscription || (user && !hasAcceptedTerms && !requiresPaymentMethodUpdate) ? undefined : { scale: 0.985 }}
              onClick={handleSubscribe}
              disabled={loading || (isActiveSubscription && !requiresPaymentMethodUpdate) || Boolean(user && !hasAcceptedTerms && !requiresPaymentMethodUpdate)}
              className={`mt-7 flex w-full items-center justify-center rounded-xl py-3.5 text-[15px] text-white shadow-sm transition ${actionWeight} ${
                (isActiveSubscription && !requiresPaymentMethodUpdate) || (user && !hasAcceptedTerms && !requiresPaymentMethodUpdate)
                  ? 'cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-lg hover:shadow-emerald-700/20'
              }`}
            >
              {loading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : requiresPaymentMethodUpdate
                    ? t.ctaUpdatePayment
                    : isActiveSubscription
                      ? t.ctaActive
                    : user
                      ? selectedCta
                      : t.ctaLogin}
            </motion.button>
            {user && !isActiveSubscription && !requiresPaymentMethodUpdate && !hasAcceptedTerms && (
              <p className={`mt-2 text-center text-xs text-[#C65D47] ${bodyWeight}`}>{t.agreementRequired}</p>
            )}
            <p className={`mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-400 ${bodyWeight}`}>
              <LockKeyhole className="h-3 w-3" />
              {t.secure}
            </p>
          </motion.div>
        </section>

        <section className="mt-20">
          <div className="text-center">
            <h2 className={`text-3xl tracking-tight ${displayWeight}`}>{t.comparisonTitle}</h2>
            <p className={`mt-2 text-sm text-zinc-500 dark:text-zinc-400 ${bodyWeight}`}>{t.comparisonDescription}</p>
          </div>
          <div className="mt-7 overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/75">
            <div className="grid grid-cols-[1.1fr_0.9fr_1.15fr] text-xs sm:text-sm">
              <div className="border-b border-zinc-200 p-4 font-bold dark:border-zinc-800 sm:px-6" />
              <div className={`border-b border-l border-zinc-200 bg-orange-50/50 p-4 text-center dark:border-zinc-800 dark:bg-orange-950/10 ${emphasisWeight}`}>{t.free}</div>
              <div className={`flex items-center justify-center gap-2 border-b border-l border-zinc-200 bg-emerald-50/70 p-4 text-center text-emerald-800 dark:border-zinc-800 dark:bg-emerald-950/25 dark:text-emerald-300 ${emphasisWeight}`}>
                <Star className="h-4 w-4 fill-current" />
                {t.premium}
              </div>
              {t.comparisonRows.map(([feature, free, premium]) => (
                <div key={feature} className="contents">
                  <div className={`border-b border-zinc-100 p-4 last:border-b-0 dark:border-zinc-800 sm:px-6 ${isKorean ? 'font-medium' : 'font-bold'}`}>{feature}</div>
                  <div className={`border-b border-l border-zinc-100 bg-orange-50/25 p-4 text-center text-zinc-500 dark:border-zinc-800 dark:bg-orange-950/5 dark:text-zinc-400 ${bodyWeight}`}>{free}</div>
                  <div className={`flex items-center justify-center gap-2 border-b border-l border-zinc-100 bg-emerald-50/35 p-4 text-center text-emerald-800 dark:border-zinc-800 dark:bg-emerald-950/10 dark:text-emerald-300 ${isKorean ? 'font-medium' : 'font-semibold'}`}>
                    <CheckCircle2 className="hidden h-4 w-4 shrink-0 text-emerald-500 sm:block" />
                    {premium}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-5xl">
          <h2 className={`text-center text-2xl tracking-tight ${displayWeight}`}>{t.faqTitle}</h2>
          <div className="mt-6 space-y-3">
            {t.faqs.map(([question, answer], index) => {
              const Icon = faqIcons[index];
              return (
                <details key={question} className="group rounded-2xl border border-zinc-200 bg-white/80 px-5 py-4 shadow-sm open:bg-white dark:border-zinc-800 dark:bg-zinc-900/70 dark:open:bg-zinc-900">
                  <summary className="flex cursor-pointer list-none items-center gap-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${benefitColors[index]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`flex-1 text-sm ${emphasisWeight}`}>{question}</span>
                    <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className={`ml-14 mt-2 pr-8 text-[13px] leading-[1.65] text-zinc-500 dark:text-zinc-400 ${bodyWeight}`}>{answer}</p>
                </details>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
