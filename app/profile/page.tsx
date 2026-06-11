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
    periodEnd: '이용 가능 기간',
    freePlan: 'Free',
    premiumPlan: 'Premium',
    premiumActive: '프리미엄 번들 이용 가능',
    freeActive: '무료 회원',
    noSubscription: '구독 없음',
    cancelAtPeriodEnd: '현재 기간 종료 후 해지 예정',
    manageUnavailable: '구독 관리 기능은 결제 연동 후 제공됩니다.',
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
    periodEnd: 'Access until',
    freePlan: 'Free',
    premiumPlan: 'Premium',
    premiumActive: 'Premium bundles available',
    freeActive: 'Free member',
    noSubscription: 'No subscription',
    cancelAtPeriodEnd: 'Cancels at the end of the current period',
    manageUnavailable: 'Subscription management will be available after billing is connected.',
    subscribe: 'Subscribe',
    footerNote: 'Profile editing and password changes will be added in the future.',
    loginRequired: 'Login required.',
    goToLogin: 'Go to Login Page',
    unknown: 'Unknown'
  }
};

// 프로필 페이지
export default async function ProfilePage() {
  const user = await getAppUserFromServer();
  const lang = await getDisplayLanguage();

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
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t.plan}</p>
                <p className="mt-1 text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                  {subscription.isActive ? t.premiumPlan : t.freePlan}
                </p>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${subscription.isActive ? 'bg-[#dff1e5] text-[#2f7d4a] dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                {subscription.isActive ? t.premiumActive : t.freeActive}
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">{t.status}</p>
              <p className="text-sm text-gray-600 dark:text-zinc-300">
                {getSubscriptionStatusLabel(subscription, lang, t.noSubscription)}
              </p>
            </div>

            {subscription.currentPeriodEnd && (
              <div>
                <p className="text-sm font-medium text-gray-500">{t.periodEnd}</p>
                <p className="text-sm text-gray-600 dark:text-zinc-300">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
                  {subscription.cancelAtPeriodEnd ? ` · ${t.cancelAtPeriodEnd}` : ''}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-gray-500 dark:text-zinc-400">{t.manageUnavailable}</p>
              <Link
                href="/pricing"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#3f8d54] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {t.subscribe}
              </Link>
            </div>
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
      canceled: '해지됨',
      expired: '만료됨',
    },
    en: {
      active: 'Active',
      trialing: 'Trialing',
      past_due: 'Past due',
      canceled: 'Canceled',
      expired: 'Expired',
    },
  };

  return labels[lang][subscription.status] || subscription.status;
}
