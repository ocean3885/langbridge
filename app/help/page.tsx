import Link from 'next/link';
import { BookOpen, CreditCard, HelpCircle, MessageSquare, RotateCcw, ShieldCheck } from 'lucide-react';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const content = {
  ko: {
    eyebrow: 'Resources',
    title: 'Help Center',
    intro: '학습, 결제, 계정 이용 중 자주 막히는 지점을 빠르게 확인하세요.',
    sections: [
      {
        title: '학습 시작',
        icon: BookOpen,
        items: [
          ['번들은 어디서 시작하나요?', 'Bundles에서 원하는 주제를 고른 뒤 Learn, Quiz, Flashcards 등 원하는 방식으로 학습할 수 있습니다.'],
          ['연습 모드는 무엇인가요?', 'Flashcards, Quick Quiz, Word Scramble, Word Fill, Spelling으로 같은 문장을 여러 방식으로 복습합니다.'],
        ],
      },
      {
        title: '진도와 복습',
        icon: RotateCcw,
        items: [
          ['진도는 어디서 보나요?', 'Learn Home과 Progress 페이지에서 완료한 항목, 복습이 필요한 단어와 문장을 확인할 수 있습니다.'],
          ['복습은 언제 하면 좋나요?', '틀렸거나 오래 보지 않은 항목을 Review에서 먼저 처리하면 학습 흐름이 부드럽습니다.'],
        ],
      },
      {
        title: '결제와 이용권',
        icon: CreditCard,
        items: [
          ['결제는 어떻게 처리되나요?', 'HolaLingo 결제는 Paddle을 통해 안전하게 처리될 수 있습니다.'],
          ['구독은 어디서 관리하나요?', '로그인 후 Profile에서 구독 상태를 확인하고 관리할 수 있습니다.'],
        ],
      },
      {
        title: '계정과 보안',
        icon: ShieldCheck,
        items: [
          ['비밀번호를 잊었어요.', '로그인 화면의 비밀번호 재설정 기능을 사용해 이메일로 재설정 링크를 받을 수 있습니다.'],
          ['개인정보 요청은 어디로 보내나요?', '개인정보 열람, 정정, 삭제 요청은 Contact 페이지의 이메일로 보내주세요.'],
        ],
      },
    ],
    ctaTitle: '원하는 답을 찾지 못했나요?',
    feedback: '피드백 보내기',
    contact: '문의하기',
  },
  en: {
    eyebrow: 'Resources',
    title: 'Help Center',
    intro: 'Find quick answers for learning, billing, account access, and common HolaLingo questions.',
    sections: [
      {
        title: 'Getting started',
        icon: BookOpen,
        items: [
          ['Where do I start a bundle?', 'Open Bundles, choose a topic, then learn with modes like Learn, Quiz, and Flashcards.'],
          ['What are practice modes?', 'Flashcards, Quick Quiz, Word Scramble, Word Fill, and Spelling help you review the same material in different ways.'],
        ],
      },
      {
        title: 'Progress and review',
        icon: RotateCcw,
        items: [
          ['Where can I see progress?', 'Learn Home and Progress show completed items plus words and sentences that need review.'],
          ['When should I review?', 'Start with Review when you want to revisit missed or older items before learning something new.'],
        ],
      },
      {
        title: 'Billing and access',
        icon: CreditCard,
        items: [
          ['How are payments handled?', 'HolaLingo payments may be securely processed through Paddle.'],
          ['Where can I manage a subscription?', 'After signing in, open Profile to check and manage subscription status.'],
        ],
      },
      {
        title: 'Account and security',
        icon: ShieldCheck,
        items: [
          ['I forgot my password.', 'Use the password reset option on the login page to receive a reset link by email.'],
          ['Where do I send privacy requests?', 'Send access, correction, or deletion requests through the email on the Contact page.'],
        ],
      },
    ],
    ctaTitle: 'Still looking for an answer?',
    feedback: 'Send feedback',
    contact: 'Contact us',
  },
};

export default async function HelpPage() {
  const language = await getDisplayLanguage();
  const t = content[language];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-zinc-950 dark:text-zinc-50 sm:px-6">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">{t.intro}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {t.sections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>
              <div className="mt-5 space-y-5">
                {section.items.map(([question, answer]) => (
                  <div key={question}>
                    <h3 className="text-sm font-semibold">{question}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{answer}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <h2 className="text-base font-semibold">{t.ctaTitle}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/feedback" className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              <MessageSquare className="h-4 w-4" />
              {t.feedback}
            </Link>
            <Link href="/contact" className="inline-flex rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-white dark:text-emerald-200 dark:hover:bg-zinc-900">
              {t.contact}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
