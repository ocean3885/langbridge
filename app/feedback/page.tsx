import { MessageSquareText } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import FeedbackForm from './FeedbackForm';

const content = {
  ko: {
    eyebrow: 'Resources',
    title: 'Feedback',
    intro: '오류 제보, 기능 제안, 콘텐츠 아이디어를 편하게 보내주세요. 보내주신 내용은 서비스 개선 검토에 사용됩니다.',
    note: '피드백은 공개 게시판에 노출되지 않고 내부 검토용으로 저장됩니다.',
  },
  en: {
    eyebrow: 'Resources',
    title: 'Feedback',
    intro: 'Send bug reports, feature ideas, and content suggestions. Your feedback helps shape what gets improved next.',
    note: 'Feedback is stored for internal review and is not shown in the public board list.',
  },
};

export default async function FeedbackPage() {
  const [language, user] = await Promise.all([getDisplayLanguage(), getAppUserFromServer()]);
  const t = content[language];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-950 dark:text-zinc-50 sm:px-6">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{t.intro}</p>

      <div className="mt-8 flex items-start gap-3 rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
        <p>{t.note}</p>
      </div>

      <div className="mt-6">
        <FeedbackForm language={language} isLoggedIn={Boolean(user)} />
      </div>
    </main>
  );
}
