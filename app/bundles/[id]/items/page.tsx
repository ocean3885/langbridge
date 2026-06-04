import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, StickyNote } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { listUserSentenceInteractions } from '@/lib/supabase/services/user-interactions';
import { listWordsForSentences } from '@/lib/supabase/services/word-sentence-map';
import { formatWordMeaning } from '@/lib/word-meaning';
import { getPublicUrl } from '@/lib/utils';
import { getBundleDescription, getBundleTitle } from '../../bundle-utils';
import ItemActions from './ItemActions';

interface BundleItemsPageProps {
  params: Promise<{ id: string }>;
}

const copy = {
  ko: {
    back: '뒤로',
    title: '전체 항목',
    count: (count: number) => `${count}개 항목`,
    empty: '등록된 학습 항목이 없습니다.',
    audio: '오디오 재생',
    memo: '학습 메모',
    words: '연결 단어',
    memoPlaceholder: '이 문장에 대한 학습 메모를 입력하세요.',
    save: '저장',
    cancel: '취소',
    saveFailed: '메모 저장에 실패했습니다.',
    noTranslation: '번역이 등록되지 않았습니다.',
    noSentence: '문장이 등록되지 않았습니다.',
  },
  en: {
    back: 'Back',
    title: 'All Items',
    count: (count: number) => `${count} items`,
    empty: 'No learning items yet.',
    audio: 'Play audio',
    memo: 'Learning memo',
    words: 'Related words',
    memoPlaceholder: 'Add a learning memo for this sentence.',
    save: 'Save',
    cancel: 'Cancel',
    saveFailed: 'Failed to save memo.',
    noTranslation: 'No translation provided.',
    noSentence: 'No sentence provided.',
  },
};

export default async function BundleItemsPage({ params }: BundleItemsPageProps) {
  const { id } = await params;
  const [bundle, user, language] = await Promise.all([getBundle(id), getAppUserFromServer(), getDisplayLanguage()]);

  if (!bundle) notFound();

  const isAdminUser = user ? await isSuperAdmin({ userId: user.id, email: user.email }) : false;
  if (!bundle.is_published && !isAdminUser) notFound();

  const items = await listBundleItems(id);
  const sentenceIds = items
    .map((item) => item.sentence_id)
    .filter((sentenceId): sentenceId is number => typeof sentenceId === 'number');
  const [interactions, mappedWords] = await Promise.all([
    user && sentenceIds.length > 0 ? listUserSentenceInteractions(user.id, sentenceIds) : [],
    listWordsForSentences(sentenceIds),
  ]);
  const interactionBySentenceId = new Map(interactions.map((interaction) => [interaction.sentence_id, interaction]));
  const wordsBySentenceId = mappedWords.reduce((groups, word) => {
    const words = groups.get(word.sentence_id) || [];
    words.push(word);
    groups.set(word.sentence_id, words);
    return groups;
  }, new Map<number, typeof mappedWords>());
  const t = copy[language];
  const title = getBundleTitle(bundle, language);
  const description = getBundleDescription(bundle, language);
  const isConversationBundle = bundle.bundle_type?.code === 'conversation';

  return (
    <div className="mx-auto max-w-5xl pb-12 text-[#191715]">
      <header className="mb-5">
        <Link href={`/bundles/${bundle.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-[#2f7d4a]">
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Link>
        <div className="mt-5 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm md:p-7">
          <p className="inline-flex rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-black text-[#2f7d4a]">{t.title}</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight text-zinc-950 md:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-600 md:text-base">{description}</p>
            </div>
            <p className="shrink-0 text-sm font-black text-zinc-500">{t.count(items.length)}</p>
          </div>
        </div>
      </header>

      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item, index) => {
            const sentence = item.sentences?.sentence || item.words?.word || t.noSentence;
            const translation =
              (language === 'en' ? item.sentences?.translation_en : item.sentences?.translation) ||
              item.sentences?.translation ||
              item.sentences?.translation_en ||
              formatWordMeaning(language === 'en' ? item.words?.meaning_en : item.words?.meaning_ko) ||
              formatWordMeaning(item.words?.meaning_ko) ||
              formatWordMeaning(item.words?.meaning_en) ||
              t.noTranslation;
            const audioUrl = getPublicUrl(item.audio_url || item.sentences?.audio_url);
            const memo = item.sentence_id ? interactionBySentenceId.get(item.sentence_id)?.memo || null : null;
            const words = item.sentence_id ? wordsBySentenceId.get(item.sentence_id) || [] : [];

            return (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition hover:border-[#d3ead9] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dff1e5] text-xs font-black text-[#2f7d4a]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      {isConversationBundle && (item.speaker_name || item.speaker_role || item.speaker_key) && (
                        <div className="mb-1.5 inline-flex max-w-full items-center rounded-full bg-[#f2eee5] px-3 py-1 text-xs font-black text-zinc-800">
                          {(item.speaker_name || item.speaker_key) && (
                            <span className="truncate">{item.speaker_name || item.speaker_key}</span>
                          )}
                          {item.speaker_role && (
                            <span className="text-zinc-500">
                              {(item.speaker_name || item.speaker_key) && ' · '}
                              {item.speaker_role}
                            </span>
                          )}
                        </div>
                      )}
                      <h2 className="text-lg font-bold leading-8 text-zinc-950 md:text-xl">{sentence}</h2>
                      <p className="mt-1 text-base font-medium leading-7 text-zinc-600">{translation}</p>
                      {words.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2" aria-label={t.words}>
                          {words.map((word) => {
                            const meaning =
                              (language === 'en' ? word.meaning_en : word.meaning_ko) ||
                              word.meaning_ko ||
                              word.meaning_en;

                            return (
                              <span
                                key={`${word.sentence_id}-${word.word_id}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700"
                              >
                                {word.used_as || word.word}
                                {meaning && <span className="font-medium text-zinc-500">· {meaning}</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {memo && (
                        <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium leading-6 text-[#2f7d4a]">
                          <StickyNote className="mt-1 h-3.5 w-3.5 shrink-0 fill-current" />
                          {memo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <ItemActions
                  audioUrl={audioUrl}
                  sentenceId={item.sentence_id || null}
                  initialMemo={memo}
                  isLoggedIn={Boolean(user)}
                  copy={{
                    audio: t.audio,
                    memo: t.memo,
                    memoPlaceholder: t.memoPlaceholder,
                    save: t.save,
                    cancel: t.cancel,
                    saveFailed: t.saveFailed,
                  }}
                />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-500">{t.empty}</p>
        </div>
      )}
    </div>
  );
}
