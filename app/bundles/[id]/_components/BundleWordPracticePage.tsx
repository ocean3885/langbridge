import { notFound, redirect } from 'next/navigation';
import WordPracticeClient from '@/components/practice/WordPracticeClient';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { getBundleAccess } from '@/lib/bundle-access';
import { PRACTICE_REGISTRY, getPracticeWordTargets } from '@/lib/practice/registry';
import { getBundleProgressSummary } from '@/lib/supabase/services/bundle-progress';
import { getBundle, listBundleItems } from '@/lib/supabase/services/bundles';
import { listUserWordInteractions } from '@/lib/supabase/services/user-interactions';
import { listWordUsageDetails } from '@/lib/supabase/services/word-sentence-map';
import type { ReviewWordItem } from '@/lib/supabase/services/learning-review';
import { getBundleTitle } from '../../bundle-utils';
import PracticeSessionSelector from './PracticeSessionSelector';
import { filterPracticeItems, getPracticeSessionCounts, isPracticeSessionMode } from '../practice-session';

export interface BundleWordPracticePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; count?: string }>;
}

export default async function BundleWordPracticePage({ params, searchParams, practiceMode }: BundleWordPracticePageProps & { practiceMode: 'word_quiz' | 'word_flashcards' }) {
  const { id } = await params;
  const { mode, count } = await searchParams;
  const [bundle, items, language, user] = await Promise.all([
    getBundle(id), listBundleItems(id, true), getDisplayLanguage(), getAppUserFromServer(),
  ]);
  if (!bundle) notFound();
  const definition = PRACTICE_REGISTRY[practiceMode];
  const basePath = `/bundles/${bundle.id}/${definition.path}`;
  const access = await getBundleAccess(bundle, user);
  if (!access.canView) {
    if (access.reason === 'unpublished') notFound();
    redirect(`${access.reason === 'login_required' ? '/auth/login' : '/pricing'}?redirectTo=${encodeURIComponent(basePath)}`);
  }
  const targets = getPracticeWordTargets(items, practiceMode, language).map(target => ({ ...target, id: String(target.word.id) }));
  const [progress, interactions] = await Promise.all([
    getBundleProgressSummary(user?.id, bundle.id, items.length),
    user ? listUserWordInteractions(user.id, targets.map(target => target.word.id)) : Promise.resolve([]),
  ]);
  const title = getBundleTitle(bundle, language);
  const cursor = progress.currentPracticeItemIds[practiceMode];
  const effectiveMode = !user && !mode ? 'all' : mode;
  if (!isPracticeSessionMode(effectiveMode)) {
    return <PracticeSessionSelector bundleId={bundle.id} title={title} modeName={definition.label} basePath={basePath} language={language} target="word" counts={getPracticeSessionCounts(targets, interactions, practiceMode, cursor)} />;
  }
  let sessionTargets = filterPracticeItems(targets, interactions, effectiveMode, practiceMode);
  // Resume before applying the count so the saved word cannot fall outside the session.
  if (effectiveMode === 'resume' && cursor) {
    const index = sessionTargets.findIndex(target => target.id === cursor);
    if (index >= 0) sessionTargets = sessionTargets.slice(index);
  }
  const limit = Number.parseInt(count || '', 10);
  if (Number.isFinite(limit) && limit > 0) sessionTargets = sessionTargets.slice(0, limit);
  const details = await listWordUsageDetails(targets.map(target => target.word.id));
  const optionItems: ReviewWordItem[] = targets.map(({ word, meaning, audioUrl }) => ({
    id: word.id, word: word.word, lang_code: word.lang_code || 'es',
    meaning_ko: meaning, meaning_en: meaning,
    pos: details.find(detail => detail.word_id === word.id)?.pos || [],
    distractors: word.words_distractor?.map(d => ({ distractor: d.distractor, meaning_ko: d.meaning_ko || null, meaning_en: d.meaning_en || null })),
    audio_url: audioUrl, proficiency_level: 0, incorrect_count: 0, streak_count: 0,
  }));
  const byId = new Map(optionItems.map(item => [String(item.id), item]));
  return <WordPracticeClient
    key={`${practiceMode}:${effectiveMode}:${count || ''}`}
    initialItems={sessionTargets.map(target => byId.get(target.id)!)}
    optionItems={optionItems}
    wordUsageDetails={details}
    availableReviewCount={sessionTargets.length}
    language={language}
    bundleSession={{ bundleId: bundle.id, title, mode: practiceMode, isLoggedIn: Boolean(user), bundleItemIds: Object.fromEntries(targets.map(target => [target.word.id, target.bundleItemId])) }}
  />;
}
