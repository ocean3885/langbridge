import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './helpers/load-module.mjs';

test('review completion summary retains bundle scope and authenticates before querying', async () => {
  const calls = [];
  let user = { id: 'u1' };
  const scoped = { availableTotal: 0, availableWords: 0, availableSentences: 0, nextReviewAt: null };
  const global = { ...scoped, availableTotal: 8, availableWords: 8 };
  const route = loadModules({
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/auth/app-user': { getAppUserFromRequest: async () => user },
    '@/lib/supabase/services/learning-review': {
      getBundleReviewSummary: async (...args) => { calls.push(args); return scoped; },
      getReviewNeededSummary: async (...args) => { calls.push(args); return global; },
    },
  })('app/api/review/summary/route.ts');
  const request = query => ({ nextUrl: new URL(`https://example.test/api/review/summary${query}`) });
  assert.deepEqual((await route.GET(request('?bundleId=b1'))).body, scoped);
  assert.deepEqual(calls[0], ['u1', 'b1']);
  assert.deepEqual((await route.GET(request(''))).body, global);
  user = null;
  assert.equal((await route.GET(request('?bundleId=b1'))).status, 401);
  assert.equal(calls.length, 2);
});

test('review recommendation retains overview return destination with either review type', () => {
  const { getReviewHref } = loadModules()('lib/learning/review-recommendation.ts');
  for (const type of ['words', 'sentences']) {
    for (const otherCount of [0, 3]) {
      const url = new URL(getReviewHref(type, otherCount, '/learn/progress'), 'https://example.test');
      assert.equal(url.pathname, `/learn/review/${type}`);
      assert.equal(url.searchParams.get('returnTo'), '/learn/progress');
    }
  }
});

test('mode-specific selection finds eligible sentences beyond the first forty', () => {
  const { buildSentenceReviewSession, sentenceReviewItems, parseReviewSettings } = loadModules()('lib/learning/review-session.ts');
  const items = Array.from({ length: 45 }, (_, index) => ({
    id: index + 1, sentence: 'hola amigo', translation: `뜻 ${index}`, translation_en: `meaning ${index}`,
    word_maps: index < 40 ? [] : [{ word_id: 11, words: { id: 11, word: 'hola', meaning_ko: '안녕', meaning_en: 'hello' } }],
  }));
  const session = buildSentenceReviewSession(items, 'ko', items);
  assert.equal(session.counts.wordfill, 5);
  assert.equal(session.counts.scramble, 45);
  assert.deepEqual(sentenceReviewItems(session.items, 'wordfill', 'ko', items).map(item => item.id), [41,42,43,44,45]);
  const exhausted = buildSentenceReviewSession(items.slice(0, 40), 'ko', items);
  assert.equal(exhausted.counts.wordfill, 0);
  assert.equal(exhausted.counts.scramble, 40);
  assert.equal(parseReviewSettings({ count: '40' }, 'sentences').count, 40);
  assert.equal(parseReviewSettings({ count: '3' }, 'sentences').count, 3);
  assert.equal(parseReviewSettings({ count: '41' }, 'sentences').count, 10);
});

test('stalled review writes time out and can retry the identical answer', async () => {
  const { requestReviewJson } = loadModules()('lib/learning/review-request.ts');
  const originalFetch = globalThis.fetch;
  const payload = JSON.stringify({ attemptId: 'same-attempt', correct: true });
  const bodies = [];
  try {
    globalThis.fetch = async (_url, init) => {
      bodies.push(init.body);
      return { ok: true, status: 200, json: () => new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('Timed out')), { once: true });
      }) };
    };
    await assert.rejects(requestReviewJson('/api/review/results', { method: 'POST', body: payload }, 10), /Timed out/);
    globalThis.fetch = async (_url, init) => {
      bodies.push(init.body);
      return { ok: true, status: 200, json: async () => ({ saved: true }) };
    };
    assert.equal((await requestReviewJson('/api/review/results', { method: 'POST', body: payload })).body.saved, true);
    assert.deepEqual(bodies, [payload, payload]);
  } finally { globalThis.fetch = originalFetch; }
});
