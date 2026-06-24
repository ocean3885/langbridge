import { notFound, redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleAccess } from '@/lib/bundle-access';
import { getBundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import { getBundle, listBundleItemsWithDistractors } from '@/lib/supabase/services/bundles';
import { getBundleTitle } from '../../bundle-utils';
import { formatWordMeaning } from '@/lib/word-meaning';
import PracticeSessionSelector from '../_components/PracticeSessionSelector';
import { filterPracticeItems, getPracticeModeStarProgress, getPracticeSessionCounts, isPracticeSessionMode } from '../practice-session';
import BundleWordFillClient from './BundleWordFillClient';

interface BundleWordFillPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; count?: string }>;
}

export default async function BundleWordFillPage({ params, searchParams }: BundleWordFillPageProps) {
  const { id } = await params;
  const { mode, count } = await searchParams;
  const [bundle, items, language, user] = await Promise.all([
    getBundle(id),
    listBundleItemsWithDistractors(id),
    getDisplayLanguage(),
    getAppUserFromServer(),
  ]);

  if (!bundle) notFound();

  const access = await getBundleAccess(bundle, user);
  if (!access.canView) {
    if (access.reason === 'unpublished') notFound();
    const redirectTo = `/bundles/${bundle.id}/wordfill`;
    redirect(access.reason === 'login_required' ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}` : `/pricing?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  // 문장별로 word_sentence_map을 통해 연결된 단어 정보가 있는 아이템만 추출
  const wordFillItems = items
    .filter((item: any) => {
      const sentence = item.sentences;
      if (!sentence) return false;
      const maps = sentence.word_sentence_map || [];
      return getWordFillMapCandidates(sentence.sentence, maps).length > 0;
    })
    .map((item: any) => {
      const sentence = item.sentences;
      const maps = sentence.word_sentence_map || [];
      // 세션이 시작될 때 문장에 연결된 단어 중 하나를 랜덤으로 선택
      const map = pickRandomMap(getWordFillMapCandidates(sentence.sentence, maps));
      const targetWord = map.words.word;
      const targetMeaning = formatWordMeaning(language === 'en' ? map.words.meaning_en : map.words.meaning_ko) || '';
      const usedAs = map.used_as || targetWord;
      const wordId = map.words.id;

      // 오답 목록 추출
      const distractors = (map.words.words_distractor || [])
        .map((d: any) => ({
          word: d.distractor,
          meaning: (language === 'en' ? d.meaning_en : d.meaning_ko) || d.meaning_ko || '',
        }))
        .filter((d: any) => {
          const distractor = normalizeOptionWord(d.word);
          return distractor && distractor !== normalizeOptionWord(targetWord) && distractor !== normalizeOptionWord(usedAs);
        });

      return {
        id: item.id,
        sentence: sentence.sentence,
        translation: (language === 'en' ? sentence.translation_en : sentence.translation) || sentence.translation || '',
        audioUrl: item.audio_url || sentence.audio_url || null,
        targetWord,
        targetMeaning,
        usedAs,
        wordId,
        distractors,
      };
    });

  const progress = await getBundleProgressSummary(user?.id, bundle.id, items.length);
  const title = getBundleTitle(bundle, language);
  const effectiveMode = !user && !mode ? 'all' : mode;

  if (!isPracticeSessionMode(effectiveMode)) {
    return (
      <PracticeSessionSelector
        bundleId={bundle.id}
        title={title}
        modeName="Word Fill"
        basePath={`/bundles/${bundle.id}/wordfill`}
        language={language}
        counts={getPracticeSessionCounts(wordFillItems, progress.itemInteractions, 'wordfill', progress.currentPracticeItemIds.wordfill)}
        starProgress={getPracticeModeStarProgress(wordFillItems, progress.itemInteractions, 'wordfill')}
      />
    );
  }

  const filteredItems = filterPracticeItems(wordFillItems, progress.itemInteractions, effectiveMode, 'wordfill');
  const sessionItems = limitPracticeItems(filteredItems, count);
  const initialItemId =
    effectiveMode === 'resume' &&
    progress.currentPracticeItemIds.wordfill &&
    sessionItems.some((item) => item.id === progress.currentPracticeItemIds.wordfill)
      ? progress.currentPracticeItemIds.wordfill
      : null;

  return (
    <BundleWordFillClient
      bundleId={bundle.id}
      title={title}
      items={sessionItems}
      optionItems={wordFillItems}
      language={language}
      initialItemId={initialItemId}
      isLoggedIn={Boolean(user)}
    />
  );
}

function limitPracticeItems<T>(items: T[], count?: string) {
  const parsedCount = count ? Number.parseInt(count, 10) : NaN;
  return Number.isFinite(parsedCount) && parsedCount > 0 ? items.slice(0, parsedCount) : items;
}

function getWordFillMapCandidates(sentence: string, maps: any[]) {
  const validMaps = maps.filter((map: any) => map.words?.word);
  const replaceableMaps = validMaps.filter((map: any) => {
    const target = map.used_as || map.words.word;
    return sentenceIncludesTarget(sentence, target);
  });

  return replaceableMaps.length > 0 ? replaceableMaps : validMaps;
}

function sentenceIncludesTarget(sentence: string, target: string) {
  const escaped = escapeRegex(target);
  const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i');

  return wordBoundaryRegex.test(sentence) || new RegExp(escaped, 'i').test(sentence);
}

function escapeRegex(value: string) {
  return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function pickRandomMap<T>(maps: T[]) {
  return maps[Math.floor(Math.random() * maps.length)];
}

function normalizeOptionWord(value: string) {
  return value.toLowerCase().trim();
}
