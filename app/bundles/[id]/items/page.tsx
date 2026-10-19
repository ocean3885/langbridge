import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, BookOpen, CheckCircle2, Headphones, Star, StickyNote } from 'lucide-react';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleAccess } from '@/lib/bundle-access';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { listUserSentenceInteractions } from '@/lib/supabase/services/user-interactions';
import { listWordsForSentences, listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateSentenceStars, getBundleStarProgress } from '@/lib/practice/progress';
import { formatWordMeaning } from '@/lib/word-meaning';
import { getPublicUrl } from '@/lib/utils';
import { WordUsageBadges } from '@/components/words/WordUsageBadges';
import { getBundleDescription, getBundleTitle } from '../../bundle-utils';
import ItemActions from './ItemActions';

interface BundleItemsPageProps {
  params: Promise<{ id: string }>;
}

const copy = {
  ko: {
    back: '뒤로',
    title: '전체 문장 목록',
    count: (count: number, plays?: number) =>
      plays && plays > 0 ? `총 ${count}개 문장 · 누적 ${plays}회 청취` : `총 ${count}개 문장`,
    playCount: (count: number) => `${count}회 청취`,
    progressCount: (earned: number, max: number, percent: number) => `⭐ 마스터리 스타 ${earned}/${max} (${percent}%)`,
    mastered: '마스터 완료',
    recentListening: '최근 청취',
    empty: '등록된 학습 항목이 없습니다.',
    audio: '오디오 재생',
    saveSentence: '문장 저장',
    unsaveSentence: '문장 저장 해제',
    memo: '학습 메모',
    words: '연결 단어',
    memoPlaceholder: '이 문장에 대한 학습 메모를 입력하세요.',
    save: '저장',
    cancel: '취소',
    saveFailed: '메모 저장에 실패했습니다.',
    noTranslation: '번역이 등록되지 않았습니다.',
    noSentence: '문장이 등록되지 않았습니다.',
    sheetTitle: '단어 정보',
    usedForm: '사용 형태',
    meaning: '뜻',
    examples: '사용된 문장',
    noExamples: '아직 연결된 문장이 없습니다.',
    close: '닫기',
    pos: '품사',
  },
  en: {
    back: 'Back',
    title: 'All Sentences',
    count: (count: number, plays?: number) =>
      plays && plays > 0 ? `Total ${count} sentences · ${plays} total plays` : `Total ${count} sentences`,
    playCount: (count: number) => `${count} plays`,
    progressCount: (earned: number, max: number, percent: number) => `⭐ Stars ${earned}/${max} (${percent}%)`,
    mastered: 'Mastered',
    recentListening: 'Recent playback',
    empty: 'No learning items yet.',
    audio: 'Play audio',
    saveSentence: 'Save sentence',
    unsaveSentence: 'Unsave sentence',
    memo: 'Learning memo',
    words: 'Related words',
    memoPlaceholder: 'Add a learning memo for this sentence.',
    save: 'Save',
    cancel: 'Cancel',
    saveFailed: 'Failed to save memo.',
    noTranslation: 'No translation provided.',
    noSentence: 'No sentence provided.',
    sheetTitle: 'Word info',
    usedForm: 'Used form',
    meaning: 'Meaning',
    examples: 'Example sentences',
    noExamples: 'No linked sentences yet.',
    close: 'Close',
    pos: 'POS',
  },
};

export default async function BundleItemsPage({ params }: BundleItemsPageProps) {
  const { id } = await params;
  const [bundle, user, language] = await Promise.all([getBundle(id), getAppUserFromServer(), getDisplayLanguage()]);

  if (!bundle) notFound();

  const access = await getBundleAccess(bundle, user);
  if (!access.canView) {
    if (access.reason === 'unpublished') notFound();
    const redirectTo = `/bundles/${bundle.id}/items`;
    redirect(access.reason === 'login_required' ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : `/pricing?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const items = await listBundleItems(id);
  const sentenceIds = items
    .map((item) => item.sentence_id)
    .filter((sentenceId): sentenceId is number => typeof sentenceId === 'number');

  const supabase = createAdminClient();
  const [interactions, mappedWords, itemInteractionsRes, bundleInteractionRes] = await Promise.all([
    user && sentenceIds.length > 0 ? listUserSentenceInteractions(user.id, sentenceIds) : [],
    listWordsForSentences(sentenceIds),
    user
      ? supabase
          .from('user_bundle_item_interactions')
          .select('bundle_item_id, is_completed, play_count, metadata')
          .eq('user_id', user.id)
          .eq('bundle_id', bundle.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from('user_bundle_interactions')
          .select('current_bundle_item_id')
          .eq('user_id', user.id)
          .eq('bundle_id', bundle.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const itemInteractions = (itemInteractionsRes.data || []) as any[];
  const currentListeningItemId = bundleInteractionRes.data?.current_bundle_item_id || null;
  const itemProgressMap = new Map(itemInteractions.map((row) => [row.bundle_item_id, row]));
  const totalPlayCount = itemInteractions.reduce((sum, item) => sum + (Number(item.play_count) || 0), 0);
  const practiceStars = getBundleStarProgress(items, itemInteractions, language);
  const starProgressPercent = practiceStars.max > 0
    ? Math.min(100, Math.round((practiceStars.earned / practiceStars.max) * 100))
    : 0;

  const wordUsageDetails = await listWordUsageDetails(mappedWords.map((word) => word.word_id));
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
    <div className="mx-auto max-w-5xl pb-12 text-[#191715] dark:text-zinc-100">
      <header className="mb-5">
        <Link href={`/bundles/${bundle.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-[#2f7d4a] dark:text-zinc-400 dark:hover:text-emerald-400">
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Link>
        <div className="mt-5 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 md:p-7">
          <p className="inline-flex rounded-full bg-[#dff1e5] px-3 py-1 text-xs font-bold text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300">{t.title}</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-tight text-zinc-950 dark:text-zinc-50 md:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm font-normal leading-6 text-zinc-600 dark:text-zinc-300 md:text-base">{description}</p>
            </div>
            <div className="shrink-0 flex flex-col items-start md:items-end gap-1">
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t.count(items.length, totalPlayCount)}</p>
              {user && practiceStars.max > 0 && (
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {t.progressCount(practiceStars.earned, practiceStars.max, starProgressPercent)}
                </p>
              )}
            </div>
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
            const interaction = item.sentence_id ? interactionBySentenceId.get(item.sentence_id) : null;
            const memo = interaction?.memo || null;
            const isPinned = Boolean(interaction?.is_pinned);
            const words = item.sentence_id ? wordsBySentenceId.get(item.sentence_id) || [] : [];
            const itemProgress = itemProgressMap.get(item.id);
            const playCount = Number(itemProgress?.play_count) || 0;
            const earnedStars = calculateSentenceStars((itemProgress?.metadata as Record<string, unknown>) || null);
            const isMastered = earnedStars >= 3 || Boolean(itemProgress?.is_completed);
            const isRecentPlayback = currentListeningItemId === item.id;

            return (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition hover:border-[#d3ead9] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:border-emerald-900 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dff1e5] text-xs font-bold text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {isConversationBundle && (item.speaker_name || item.speaker_role || item.speaker_key) && (
                          <div className="inline-flex max-w-full items-center rounded-full bg-[#f2eee5] px-3 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            {(item.speaker_name || item.speaker_key) && (
                              <span className="truncate">{item.speaker_name || item.speaker_key}</span>
                            )}
                            {item.speaker_role && (
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {(item.speaker_name || item.speaker_key) && ' · '}
                                {item.speaker_role}
                              </span>
                            )}
                          </div>
                        )}
                        {isMastered && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#dff1e5] px-2.5 py-0.5 text-xs font-bold text-[#2f7d4a] dark:bg-emerald-950/80 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t.mastered}
                          </span>
                        )}
                        {earnedStars > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200/60 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {earnedStars}/3
                          </span>
                        )}
                        {playCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f8f3] px-2.5 py-0.5 text-xs font-semibold text-[#2f7d4a] border border-[#d2ead7] dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <Headphones className="h-3 w-3" />
                            {t.playCount(playCount)}
                          </span>
                        )}
                        {isRecentPlayback && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                            🎧 {t.recentListening}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold leading-8 text-zinc-950 dark:text-zinc-50 md:text-xl">{sentence}</h2>
                      <p className="mt-1 text-base font-medium leading-7 text-zinc-600 dark:text-zinc-300">{translation}</p>
                      {words.length > 0 && (
                        <WordUsageBadges
                          words={words}
                          details={wordUsageDetails}
                          language={language}
                          copy={{
                            words: t.words,
                            sheetTitle: t.sheetTitle,
                            usedForm: t.usedForm,
                            meaning: t.meaning,
                            examples: t.examples,
                            noExamples: t.noExamples,
                            close: t.close,
                            pos: t.pos,
                          }}
                        />
                      )}
                      {memo && (
                        <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium leading-6 text-[#2f7d4a] dark:bg-emerald-950/50 dark:text-emerald-300">
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
                  bundleId={bundle.id}
                  bundleItemId={item.id}
                  initialMemo={memo}
                  initialIsPinned={isPinned}
                  isLoggedIn={Boolean(user)}
                  copy={{
                    audio: t.audio,
                    saveSentence: t.saveSentence,
                    unsaveSentence: t.unsaveSentence,
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
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{t.empty}</p>
        </div>
      )}
    </div>
  );
}
