import Link from 'next/link';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getLeaderboard } from '@/lib/supabase/services/leaderboard';
import ProgressMobileMenu from '../progress/ProgressMobileMenu';
import ProgressSidebar from '../progress/ProgressSidebar';
import RankingsClient from './RankingsClient';

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    loginRequired: '로그인이 필요합니다.',
    goToLogin: '로그인 페이지로 이동',
    title: '학습 랭킹',
    subtitle: '다른 학습자들과 함께 실력을 겨루고 꾸준한 학습 동기를 얻어보세요.',
  },
  en: {
    loginRequired: 'Login is required.',
    goToLogin: 'Go to Login Page',
    title: 'Leaderboard',
    subtitle: 'Compete with other learners and stay motivated every day.',
  },
};

export default async function LearnRankingsPage() {
  const [user, language] = await Promise.all([
    getAppUserFromServer(),
    getDisplayLanguage(),
  ]);
  const lang = (language as DisplayLanguage) || 'ko';
  const t = copy[lang];

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t.loginRequired}</h1>
        <Link
          href="/auth/login?redirectTo=/learn/rankings"
          className="mt-5 inline-flex rounded-lg bg-[#3f9657] px-5 py-3 text-sm font-bold text-white shadow hover:bg-[#2f7d4a]"
        >
          {t.goToLogin}
        </Link>
      </main>
    );
  }

  const initialLeaderboard = await getLeaderboard({
    period: 'weekly',
    metric: 'stars',
    currentUserId: user.id,
    limit: 50,
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ProgressSidebar language={lang} activeIndex={5} />
        <main className="min-w-0 px-4 py-6 sm:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                🏆 {t.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t.subtitle}
              </p>
            </div>
            <div className="lg:hidden">
              <ProgressMobileMenu language={lang} activeIndex={5} />
            </div>
          </div>

          <RankingsClient
            language={lang}
            currentUserId={user.id}
            initialData={initialLeaderboard}
          />
        </main>
      </div>
    </div>
  );
}
