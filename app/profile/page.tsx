import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getUserSubscriptionSummary, type UserSubscriptionSummary } from '@/lib/supabase/services/subscriptions';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const translations = {
  ko: {
    title: '내 프로필',
    accountInfo: '계정 정보',
    accountDesc: '현재 로그인된 계정의 정보입니다.',
    email: '이메일',
    joinDate: '가입일',
    subscriptionInfo: '구독 정보',
    subscriptionDesc: '현재 계정의 프리미엄 이용 상태입니다.',
    plan: '플랜',
    status: '상태',
    periodStart: '구독 시작일',
    periodEnd: '이용 가능 기간',
    freePlan: 'Free',
    premiumPlan: 'Premium',
    monthlyPlan: 'Premium 월간',
    yearlyPlan: 'Premium 연간',
    premiumActive: '프리미엄 번들 이용 가능',
    premiumPastDue: '결제 확인 필요 · 현재 이용 가능',
    premiumPaused: '구독 일시정지',
    freeActive: '무료 회원',
    noSubscription: '구독 없음',
    cancelAtPeriodEnd: '현재 기간 종료 후 해지 예정',
    manageBilling: 'Paddle의 안전한 고객 포털에서 구독과 결제 정보를 관리할 수 있습니다.',
    manageUnavailable: 'Paddle로 결제한 구독이 있으면 결제 관리 기능을 이용할 수 있습니다.',
    paymentHistory: '결제 내역 및 영수증',
    changePaymentMethod: '결제수단 변경',
    cancelSubscription: '구독 해지',
    billingError: '결제 관리 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.',
    billingNotFound: '관리할 Paddle 구독 정보를 찾지 못했습니다.',
    billingUnavailable: '현재 구독에서는 요청한 관리 기능을 사용할 수 없습니다.',
    syncNotice: 'Paddle에서 변경한 내용은 웹훅 처리 후 반영됩니다. 상태가 바로 바뀌지 않으면 잠시 후 이 페이지를 새로고침해 주세요.',
    managedExternally: '이 구독은 Paddle 외부에서 관리됩니다.',
    subscribe: '구독하기',
    footerNote: '향후 프로필 편집, 비밀번호 변경 등이 추가될 예정입니다.',
    loginRequired: '로그인이 필요합니다.',
    goToLogin: '로그인 페이지로 이동',
    unknown: '알 수 없음'
  },
  en: {
    title: 'My Profile',
    accountInfo: 'Account Information',
    accountDesc: 'Details of the currently logged-in account.',
    email: 'Email',
    joinDate: 'Joined Date',
    subscriptionInfo: 'Subscription',
    subscriptionDesc: 'Premium access status for this account.',
    plan: 'Plan',
    status: 'Status',
    periodStart: 'Subscription started',
    periodEnd: 'Access until',
    freePlan: 'Free',
    premiumPlan: 'Premium',
    monthlyPlan: 'Premium Monthly',
    yearlyPlan: 'Premium Yearly',
    premiumActive: 'Premium bundles available',
    premiumPastDue: 'Payment required · Access temporarily available',
    premiumPaused: 'Subscription paused',
    freeActive: 'Free member',
    noSubscription: 'No subscription',
    cancelAtPeriodEnd: 'Cancels at the end of the current period',
    manageBilling: 'Manage your subscription and billing securely in the Paddle customer portal.',
    manageUnavailable: 'Billing management is available for subscriptions purchased through Paddle.',
    paymentHistory: 'Payments & Receipts',
    changePaymentMethod: 'Change Payment Method',
    cancelSubscription: 'Cancel Subscription',
    billingError: 'Could not open billing management. Please try again shortly.',
    billingNotFound: 'No manageable Paddle subscription was found.',
    billingUnavailable: 'This billing action is unavailable for the current subscription.',
    syncNotice: 'Changes made in Paddle appear after webhook processing. Refresh this page shortly if the status has not updated yet.',
    managedExternally: 'This subscription is managed outside Paddle.',
    subscribe: 'Subscribe',
    footerNote: 'Profile editing and password changes will be added in the future.',
    loginRequired: 'Login required.',
    goToLogin: 'Go to Login Page',
    unknown: 'Unknown'
  }
};

interface ProfilePageProps {
  searchParams: Promise<{ billing?: string }>;
}

// 프로필 페이지
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();
  const { billing } = await searchParams;

  if (!user) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Profile</h1>
        <p className="mb-4">Login is required.</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">Go to Login Page</Link>
      </div>
    );
  }

  const t = translations[lang];
  const subscription = await getUserSubscriptionSummary(user.id);
  const isPastDue = subscription.status === 'past_due';
  const isPaused = subscription.status === 'paused';
  const canChangePaymentMethod = subscription.canManageWithPaddle &&
    ['active', 'trialing', 'past_due'].includes(subscription.status || '');
  const canCancel = subscription.canManageWithPaddle &&
    ['active', 'trialing'].includes(subscription.status || '') &&
    !subscription.cancelAtPeriodEnd;
  const planName = subscription.providerPriceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY
    ? t.monthlyPlan
    : subscription.providerPriceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY
      ? t.yearlyPlan
      : subscription.isActive || isPaused
        ? t.premiumPlan
        : t.freePlan;
  const billingMessage = billing === 'not-found' || billing === 'subscription-not-found'
    ? t.billingNotFound
    : billing === 'link-unavailable' || billing === 'invalid-action'
      ? t.billingUnavailable
      : t.billingError;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">{t.title}</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.accountInfo}</CardTitle>
            <CardDescription>{t.accountDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">{t.email}</p>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t.joinDate}</p>
              <p className="text-sm text-gray-600">
                {user.createdAt ? new Date(user.createdAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US') : t.unknown}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.subscriptionInfo}</CardTitle>
            <CardDescription>{t.subscriptionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {billing && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {billingMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t.plan}</p>
                <p className="mt-1 text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {planName}
                </p>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                isPastDue
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : subscription.isActive
                    ? 'bg-[#dff1e5] text-[#2f7d4a] dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              }`}>
                {isPastDue ? t.premiumPastDue : isPaused ? t.premiumPaused : subscription.isActive ? t.premiumActive : t.freeActive}
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">{t.status}</p>
              <p className="text-sm text-gray-600 dark:text-zinc-300">
                {getSubscriptionStatusLabel(subscription, lang, t.noSubscription)}
              </p>
            </div>

            {subscription.currentPeriodStart && (
              <div>
                <p className="text-sm font-medium text-gray-500">{t.periodStart}</p>
                <p className="text-sm text-gray-600 dark:text-zinc-300">
                  {new Date(subscription.currentPeriodStart).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                </p>
              </div>
            )}

            {subscription.currentPeriodEnd && (
              <div>
                <p className="text-sm font-medium text-gray-500">{t.periodEnd}</p>
                <p className="text-sm text-gray-600 dark:text-zinc-300">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                  {subscription.cancelAtPeriodEnd ? ` · ${t.cancelAtPeriodEnd}` : ''}
                </p>
              </div>
            )}

            {subscription.canManageWithPaddle ? (
              <div className="space-y-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <p className="text-xs leading-5 text-gray-500 dark:text-zinc-400">{t.manageBilling}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    href="/api/paddle/portal?target=overview"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {t.paymentHistory}
                  </Link>
                  {canChangePaymentMethod && (
                    <Link
                      href="/api/paddle/portal?target=payment-method"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {t.changePaymentMethod}
                    </Link>
                  )}
                  {canCancel && (
                    <Link
                      href="/api/paddle/portal?target=cancel"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 sm:col-span-2"
                    >
                      {t.cancelSubscription}
                    </Link>
                  )}
                </div>
                <p className="text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">{t.syncNotice}</p>
              </div>
            ) : subscription.isActive || isPaused ? (
              <div className="border-t border-zinc-100 pt-5 text-xs leading-5 text-gray-500 dark:border-zinc-800 dark:text-zinc-400">
                {t.managedExternally}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-500 dark:text-zinc-400">{t.manageUnavailable}</p>
                <Link
                  href="/pricing"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#3f8d54] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {t.subscribe}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <p className="text-gray-500 text-sm">{t.footerNote}</p>
      </div>
    </div>
  );
}

function getSubscriptionStatusLabel(subscription: UserSubscriptionSummary, lang: 'ko' | 'en', fallback: string) {
  if (!subscription.status) return fallback;

  const labels: Record<'ko' | 'en', Record<string, string>> = {
    ko: {
      active: '활성',
      trialing: '체험 중',
      past_due: '결제 확인 필요',
      paused: '일시정지',
      canceled: '해지됨',
      expired: '만료됨',
    },
    en: {
      active: 'Active',
      trialing: 'Trialing',
      past_due: 'Past due',
      paused: 'Paused',
      canceled: 'Canceled',
      expired: 'Expired',
    },
  };

  return labels[lang][subscription.status] || subscription.status;
}
