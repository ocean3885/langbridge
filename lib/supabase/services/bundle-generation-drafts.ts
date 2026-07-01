'use server';

import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '../admin';

export type BundleGenerationDraftStatus = 'pending' | 'ready' | 'converted' | 'archived';

export type BundleGenerationPayloadItem = {
  sentence: string;
  translation: string;
  translation_en: string;
  speaker?: string;
  speaker_key?: string;
  speaker_name?: string;
  speaker_role?: string;
  metadata?: Record<string, unknown>;
};

export type BundleGenerationPayload = {
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  type?: string;
  speakers?: Record<string, unknown>[];
  items: BundleGenerationPayloadItem[];
};

export type BundleGenerationDraft = {
  id: string;
  category_id: string;
  payload: BundleGenerationPayload;
  status: BundleGenerationDraftStatus;
  notes: string | null;
  created_by: string | null;
  converted_bundle_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RegisteredBundleSource = {
  id: string;
  title_en: string | null;
  description_en: string | null;
  items: string[];
};

export type BundleGenerationPrompt = {
  category_id: string;
  prompt: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BundleGenerationDraftCount = {
  category_id: string;
  count: number;
};

async function assertAdmin(expectedUserId?: string) {
  const user = await getAppUserFromServer();
  if (!user || (expectedUserId && user.id !== expectedUserId)) {
    throw new Error('로그인이 필요합니다.');
  }

  const allowed = await isSuperAdmin({ userId: user.id, email: user.email });
  if (!allowed) {
    throw new Error('권한이 없습니다.');
  }
}

function normalizePayload(value: unknown): BundleGenerationPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  const title = String(source.title || '').trim();
  const titleEn = String(source.title_en || '').trim();
  const description = String(source.description || '').trim();
  const descriptionEn = String(source.description_en || '').trim();
  const rawItems = Array.isArray(source.items) ? source.items : [];
  const seen = new Set<string>();

  const items = rawItems.flatMap((rawItem) => {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) return [];

    const item = rawItem as Record<string, unknown>;
    const sentence = String(item.sentence || '').trim();
    const translation = String(item.translation || '').trim();
    const translationEn = String(item.translation_en || '').trim();
    const key = sentence.toLowerCase();
    if (!sentence || !translation || !translationEn || seen.has(key)) return [];

    seen.add(key);
    return [{
      ...item,
      sentence,
      translation,
      translation_en: translationEn,
    } as BundleGenerationPayloadItem];
  });

  if (!title || !titleEn || !description || !descriptionEn || items.length === 0) {
    return null;
  }

  const type = typeof source.type === 'string' ? source.type.trim() : undefined;
  const speakers = Array.isArray(source.speakers)
    ? source.speakers.filter(
        (speaker): speaker is Record<string, unknown> =>
          Boolean(speaker && typeof speaker === 'object' && !Array.isArray(speaker))
      )
    : undefined;

  if (type === 'conversation' && (!speakers?.length || items.some(item => !item.speaker && !item.speaker_key))) {
    return null;
  }

  return {
    ...source,
    title,
    title_en: titleEn,
    description,
    description_en: descriptionEn,
    ...(type ? { type } : {}),
    ...(speakers ? { speakers } : {}),
    items,
  } as BundleGenerationPayload;
}

export async function listRegisteredBundleSources(categoryId: string): Promise<RegisteredBundleSource[]> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { data: bundles, error: bundleError } = await supabase
    .from('bundle')
    .select('id, title_en, description_en, created_at')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true });

  if (bundleError) throw new Error(`등록 번들 조회 실패: ${bundleError.message}`);

  const bundleIds = (bundles || []).map(bundle => bundle.id);
  if (bundleIds.length === 0) return [];

  const { data: bundleItems, error: itemError } = await supabase
    .from('bundle_items')
    .select('bundle_id, order_index, sentences(sentence)')
    .in('bundle_id', bundleIds)
    .order('order_index', { ascending: true });

  if (itemError) throw new Error(`번들 문장 조회 실패: ${itemError.message}`);

  const sentencesByBundle = new Map<string, string[]>();
  for (const item of bundleItems || []) {
    const relation = Array.isArray(item.sentences) ? item.sentences[0] : item.sentences;
    const sentence = relation?.sentence?.trim();
    if (!sentence) continue;
    const sentences = sentencesByBundle.get(item.bundle_id) || [];
    sentences.push(sentence);
    sentencesByBundle.set(item.bundle_id, sentences);
  }

  return (bundles || []).map(bundle => ({
    id: bundle.id,
    title_en: bundle.title_en,
    description_en: bundle.description_en,
    items: sentencesByBundle.get(bundle.id) || [],
  }));
}

export async function getBundleGenerationPrompt(categoryId: string): Promise<BundleGenerationPrompt | null> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_generation_prompts')
    .select('*')
    .eq('category_id', categoryId)
    .maybeSingle();

  if (error) throw new Error(`카테고리 프롬프트 조회 실패: ${error.message}`);
  return data as BundleGenerationPrompt | null;
}

export async function saveBundleGenerationPrompt(
  userId: string,
  categoryId: string,
  prompt: string
) {
  await assertAdmin(userId);
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) throw new Error('저장할 프롬프트를 입력해주세요.');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_generation_prompts')
    .upsert({
      category_id: categoryId,
      prompt: normalizedPrompt,
      updated_by: userId,
    }, {
      onConflict: 'category_id',
    })
    .select()
    .single();

  if (error) throw new Error(`카테고리 프롬프트 저장 실패: ${error.message}`);
  return data as BundleGenerationPrompt;
}

export async function listBundleGenerationDrafts(categoryId: string): Promise<BundleGenerationDraft[]> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_generation_drafts')
    .select('*')
    .eq('category_id', categoryId)
    .in('status', ['pending', 'ready'])
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`등록 대기 번들 조회 실패: ${error.message}`);

  return (data || []).flatMap(draft => {
    const payload = normalizePayload(draft.payload);
    return payload ? [{ ...draft, payload } as BundleGenerationDraft] : [];
  });
}

export async function listBundleGenerationDraftCounts(): Promise<BundleGenerationDraftCount[]> {
  await assertAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_generation_drafts')
    .select('category_id')
    .in('status', ['pending', 'ready']);

  if (error) throw new Error(`등록 대기 번들 카운트 조회 실패: ${error.message}`);

  const counts = new Map<string, number>();
  for (const draft of data || []) {
    if (!draft.category_id) continue;
    counts.set(draft.category_id, (counts.get(draft.category_id) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([category_id, count]) => ({
    category_id,
    count,
  }));
}

export async function createBundleGenerationDrafts(
  userId: string,
  categoryId: string,
  payloads: unknown[]
) {
  await assertAdmin(userId);
  const rows = payloads.flatMap(value => {
    const payload = normalizePayload(value);
    return payload ? [{
      category_id: categoryId,
      payload,
      created_by: userId,
      status: 'pending' as const,
    }] : [];
  });

  if (rows.length === 0) throw new Error('저장할 유효한 번들 JSON이 없습니다.');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_generation_drafts')
    .insert(rows)
    .select();

  if (error) throw new Error(`등록 대기 번들 저장 실패: ${error.message}`);
  return data;
}

export async function updateBundleGenerationDraft(
  draftId: string,
  input: {
    payload: unknown;
    notes?: string | null;
    status?: BundleGenerationDraftStatus;
  }
) {
  await assertAdmin();
  const payload = normalizePayload(input.payload);
  if (!payload) throw new Error('유효한 일반형 또는 대화형 번들 JSON이 필요합니다.');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bundle_generation_drafts')
    .update({
      payload,
      notes: input.notes?.trim() || null,
      ...(input.status ? { status: input.status } : {}),
    })
    .eq('id', draftId)
    .select()
    .single();

  if (error) throw new Error(`등록 대기 번들 수정 실패: ${error.message}`);
  return data;
}

export async function deleteBundleGenerationDraft(draftId: string) {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from('bundle_generation_drafts').delete().eq('id', draftId);
  if (error) throw new Error(`등록 대기 번들 삭제 실패: ${error.message}`);
}

export async function archiveBundleGenerationDraft(draftId: string) {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bundle_generation_drafts')
    .update({ status: 'archived' })
    .eq('id', draftId);

  if (error) throw new Error(`등록 대기 번들 숨김 처리 실패: ${error.message}`);
}

export async function markBundleGenerationDraftConverted(draftId: string, bundleId: string) {
  await assertAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bundle_generation_drafts')
    .update({ status: 'converted', converted_bundle_id: bundleId })
    .eq('id', draftId);

  if (error) throw new Error(`등록 대기 번들 완료 처리 실패: ${error.message}`);
}
