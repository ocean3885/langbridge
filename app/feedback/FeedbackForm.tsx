'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Send } from 'lucide-react';

type DisplayLanguage = 'ko' | 'en';
type FeedbackCategory = 'bug' | 'feature' | 'content' | 'other';

const copy = {
  ko: {
    category: '유형',
    subject: '제목',
    message: '내용',
    subjectPlaceholder: '짧게 요약해주세요',
    messagePlaceholder: '상황, 기대한 결과, 실제 결과를 편하게 적어주세요.',
    submit: '피드백 보내기',
    submitting: '보내는 중...',
    success: '피드백이 등록되었습니다. 꼼꼼히 확인할게요.',
    loginRequired: '피드백을 보내려면 로그인이 필요합니다.',
    login: '로그인하기',
    categories: {
      bug: '오류 제보',
      feature: '기능 제안',
      content: '콘텐츠 제안',
      other: '기타',
    },
    errors: {
      subject: '제목을 입력해주세요.',
      message: '내용을 입력해주세요.',
      network: '네트워크 오류가 발생했습니다.',
    },
  },
  en: {
    category: 'Type',
    subject: 'Subject',
    message: 'Details',
    subjectPlaceholder: 'Summarize it briefly',
    messagePlaceholder: 'Share what happened, what you expected, and what would help.',
    submit: 'Send feedback',
    submitting: 'Sending...',
    success: 'Thanks. Your feedback has been submitted.',
    loginRequired: 'Please sign in to send feedback.',
    login: 'Sign in',
    categories: {
      bug: 'Bug report',
      feature: 'Feature idea',
      content: 'Content suggestion',
      other: 'Other',
    },
    errors: {
      subject: 'Please enter a subject.',
      message: 'Please enter details.',
      network: 'A network error occurred.',
    },
  },
};

export default function FeedbackForm({ language, isLoggedIn }: { language: DisplayLanguage; isLoggedIn: boolean }) {
  const t = copy[language];
  const [category, setCategory] = useState<FeedbackCategory>('feature');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject.trim()) {
      setError(t.errors.subject);
      return;
    }
    if (!message.trim()) {
      setError(t.errors.message);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, message }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t.errors.network);
        return;
      }

      setSubject('');
      setMessage('');
      setCategory('feature');
      setSuccess(true);
    } catch {
      setError(t.errors.network);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
        <p>{t.loginRequired}</p>
        <Link href="/auth/login?redirectTo=/feedback" className="mt-4 inline-flex rounded-md bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800">
          {t.login}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <label htmlFor="feedback-category" className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {t.category}
        </label>
        <select
          id="feedback-category"
          value={category}
          onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-emerald-950"
        >
          {Object.entries(t.categories).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="feedback-subject" className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {t.subject}
        </label>
        <input
          id="feedback-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={160}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-emerald-950"
          placeholder={t.subjectPlaceholder}
        />
      </div>

      <div>
        <label htmlFor="feedback-message" className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {t.message}
        </label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={8}
          className="mt-2 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-emerald-950"
          placeholder={t.messagePlaceholder}
        />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{t.success}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? t.submitting : t.submit}
      </button>
    </form>
  );
}
