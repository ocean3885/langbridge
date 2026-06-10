import { redirect } from 'next/navigation';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';
import { listBundles } from '@/lib/supabase/services/bundles';
import { createAdminClient } from '@/lib/supabase/admin';
import ActiveLearningsClient from './_components/ActiveLearningsClient';
import type { BundleWithProgress } from './_components/ActiveLearningsClient';

export const dynamic = 'force-dynamic';

export default async function ActiveLearningsPage() {
  const user = await getAppUserFromServer();

  if (!user) {
    redirect('/auth/login?redirectTo=/learn/active');
  }

  const language = await getDisplayLanguage();
  const supabase = createAdminClient();

  // Fetch all data in parallel
  const [
    allBundles,
    { data: userInteractions },
    { data: completedItems },
    { count: sentenceReviewCount },
    { count: wordReviewCount },
    { data: stats }
  ] = await Promise.all([
    listBundles({ publishedOnly: true }),
    supabase
      .from('user_bundle_interactions')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('user_bundle_item_interactions')
      .select('bundle_item_id, bundle_id')
      .eq('user_id', user.id)
      .eq('is_completed', true),
    supabase
      .from('user_sentence_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('proficiency_level', 5)
      .gt('proficiency_level', 0),
    supabase
      .from('user_word_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('proficiency_level', 5)
      .gt('proficiency_level', 0),
    supabase
      .from('user_learning_stats')
      .select('completed_sentences')
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  const interactions = userInteractions || [];
  const completedItemsList = completedItems || [];

  // Map bundles to BundleWithProgress
  const processedBundles: BundleWithProgress[] = allBundles.map((bundle: any) => {
    const interaction = interactions.find((i: any) => i.bundle_id === bundle.id);
    const categoryName = language === 'ko'
      ? bundle.bundle_category?.name || bundle.bundle_category?.name_en || bundle.bundle_type?.name || '학습 번들'
      : bundle.bundle_category?.name_en || bundle.bundle_category?.name || bundle.bundle_type?.name || 'Learning Bundle';
    const typeName = bundle.bundle_type?.name || '';
    
    // Total items in bundle
    const totalItems = bundle.bundle_items?.[0]?.count || 0;
    // Completed items for this bundle
    const completedCount = completedItemsList.filter((ci) => ci.bundle_id === bundle.id).length;

    // Calculate progress ratio
    const progressRatio = totalItems > 0 ? completedCount / totalItems : 0;
    const progressPercent = Math.min(100, Math.max(0, Math.round(progressRatio * 100)));

    // Determine status
    let status: BundleWithProgress['status'] = 'Not Started';
    if (interaction?.is_completed || (totalItems > 0 && completedCount === totalItems)) {
      status = 'Completed';
    } else if (interaction?.is_started || completedCount > 0) {
      status = 'In Progress';
    }

    return {
      id: bundle.id,
      title: bundle.title || bundle.title_en || 'Untitled',
      title_en: bundle.title_en || bundle.title || 'Untitled',
      thumbnail_url: bundle.thumbnail_url || null,
      categoryName,
      typeName,
      totalItems,
      completedItems: completedCount,
      progressPercent,
      lastStudiedAt: interaction?.last_studied_at || null,
      status,
      lastPracticeItemId: interaction?.current_bundle_item_id || null,
    };
  });

  // Calculate summary counts
  const inProgressCount = processedBundles.filter((b) => b.status === 'In Progress').length;
  const completedCount = processedBundles.filter((b) => b.status === 'Completed').length;
  const notStartedCount = processedBundles.filter((b) => b.status === 'Not Started').length;
  const activeCount = inProgressCount + notStartedCount; // Active = In Progress + Not Started

  const totalSentencesDone = stats?.completed_sentences || completedItemsList.length || 0;

  return (
    <ActiveLearningsClient
      bundles={processedBundles}
      language={language}
      stats={{
        activeBundles: activeCount,
        inProgress: inProgressCount,
        completed: completedCount,
        sentencesDone: totalSentencesDone,
      }}
      reviewNeeded={{
        sentences: sentenceReviewCount || 0,
        words: wordReviewCount || 0,
      }}
    />
  );
}

