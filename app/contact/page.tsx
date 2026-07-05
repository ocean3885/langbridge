import Link from 'next/link';
import { Mail, MapPin, MessageSquare, UserRound } from 'lucide-react';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const content = {
  ko: {
    eyebrow: 'Resources',
    title: 'Contact',
    intro: '서비스 문의, 결제 문의, 개인정보 요청은 아래 연락처로 보내주세요.',
    emailLabel: '이메일',
    businessLabel: '사업자 정보',
    representativeLabel: '대표',
    addressLabel: '주소',
    response: '보통 영업일 기준으로 확인 후 답변합니다.',
    feedbackTitle: '기능 제안이나 오류 제보인가요?',
    feedbackBody: '서비스 개선과 관련된 의견은 피드백 페이지로 보내주시면 더 정리해서 확인할 수 있습니다.',
    feedbackLink: '피드백 보내기',
  },
  en: {
    eyebrow: 'Resources',
    title: 'Contact',
    intro: 'For service questions, billing questions, or privacy requests, use the contact details below.',
    emailLabel: 'Email',
    businessLabel: 'Business',
    representativeLabel: 'Representative',
    addressLabel: 'Address',
    response: 'We usually review and respond on business days.',
    feedbackTitle: 'Reporting a bug or suggesting a feature?',
    feedbackBody: 'Use the feedback page for product ideas, content suggestions, and issue reports so they can be reviewed clearly.',
    feedbackLink: 'Send feedback',
  },
};

export default async function ContactPage() {
  const language = await getDisplayLanguage();
  const t = content[language];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-950 dark:text-zinc-50 sm:px-6">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">{t.intro}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Mail className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
          <h2 className="mt-4 text-lg font-semibold">{t.emailLabel}</h2>
          <a href="mailto:pheebok6256@gmail.com" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
            pheebok6256@gmail.com
          </a>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{t.response}</p>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <UserRound className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
          <h2 className="mt-4 text-lg font-semibold">{t.businessLabel}</h2>
          <dl className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <dt className="font-semibold text-zinc-900 dark:text-zinc-100">langbridge</dt>
              <dd>264-34-01855</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-900 dark:text-zinc-100">{t.representativeLabel}</dt>
              <dd>Park Heebok</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <MapPin className="h-4 w-4" />
                {t.addressLabel}
              </dt>
              <dd className="mt-1">39 Samdeok-ro, Sasang-gu, Republic of Korea</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
        <MessageSquare className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
        <h2 className="mt-3 text-lg font-semibold">{t.feedbackTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{t.feedbackBody}</p>
        <Link href="/feedback" className="mt-4 inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          {t.feedbackLink}
        </Link>
      </section>
    </main>
  );
}
