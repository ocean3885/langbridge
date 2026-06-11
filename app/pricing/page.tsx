import Link from 'next/link';
import { CharacterAsset } from '@/components/assets/CharacterAsset';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const copy = {
  ko: {
    badge: 'Premium',
    title: '구독 기능 준비 중',
    description: '유료 번들은 활성 구독 회원에게 제공됩니다. 결제 기능이 연결되면 이 페이지에서 구독을 시작하고 관리할 수 있습니다.',
    back: '번들 둘러보기',
  },
  en: {
    badge: 'Premium',
    title: 'Subscription is coming soon',
    description: 'Premium bundles are available to active subscribers. Once billing is connected, this page will let learners start and manage a subscription.',
    back: 'Browse Bundles',
  },
};

export default async function PricingPage() {
  const language = await getDisplayLanguage();
  const t = copy[language];

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col justify-center px-6 py-16 text-center">
      <CharacterAsset name="studyfull" width={170} height={126} className="mx-auto mb-5" priority />
      <span className="mx-auto inline-flex rounded-full bg-[#dff1e5] px-4 py-1.5 text-xs font-bold uppercase text-[#2f7d4a] dark:bg-emerald-950/60 dark:text-emerald-300">
        {t.badge}
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-normal text-zinc-950 dark:text-zinc-50 sm:text-5xl">
        {t.title}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
        {t.description}
      </p>
      <Link
        href="/bundles"
        className="mx-auto mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-[#3f8d54] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#347946] dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {t.back}
      </Link>
    </main>
  );
}
