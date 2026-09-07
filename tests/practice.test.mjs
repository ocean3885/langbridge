import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const testDirectory = fileURLToPath(new URL('.', import.meta.url));

// Compile the actual TS modules in isolation; no Next server or live database is needed.
function loadPracticeModules(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(testDirectory, '..', filename);
    if (!path.extname(filename)) filename += '.ts';
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(name.slice(2));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
      return nodeRequire(name);
    };
    new Function('require', 'module', 'exports', code)(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}
const load = loadPracticeModules();
const { getBundleStarProgress, hasEarnedPracticeStar } = load('lib/practice/progress');
const { getPracticeModeStarProgress, filterPracticeItems } = load('app/bundles/[id]/practice-session');
const { getEligiblePracticeItems, isPracticeMode } = load('lib/practice/registry');
const metadata = (mode, correct, last) => ({ practice_modes: { [mode]: { correct_count: correct, last_is_correct: last } } });
const wordA = { id: 11, word: 'hola', meaning_ko: '안녕' };
const wordB = { id: 12, word: 'amigo', meaning_ko: '친구' };
const sentence = { id: 's1', sentence_id: 1, sentences: { sentence: 'hola amigo', translation: '안녕 친구', word_sentence_map: [{ words: wordA }, { words: wordB }] } };

test('earned stars survive incorrect answers and repeated correct answers', () => {
  const interactions = [{ bundle_item_id: 's1', metadata: metadata('quiz', 7, false) }];
  assert.equal(hasEarnedPracticeStar(interactions[0].metadata, 'quiz'), true);
  assert.deepEqual(getPracticeModeStarProgress([sentence], interactions, 'quiz'), { earned: 1, max: 1 });
  assert.deepEqual(filterPracticeItems([sentence], interactions, 'incorrect', 'quiz'), [sentence]);
  assert.deepEqual(filterPracticeItems([sentence], interactions, 'correct', 'quiz'), []);
});

test('maximum stars matches eligible questions, excludes spelling and unreplaceable word mappings', () => {
  const unavailable = { id: 's2', sentences: { sentence: 'adios', word_sentence_map: [{ words: wordA }] } };
  const interactions = [{ bundle_item_id: 's1', metadata: { practice_modes: {
    quiz: { correct_count: 1 }, scramble: { correct_count: 1 }, wordfill: { correct_count: 1 }, spelling: { correct_count: 99 },
  } } }];
  const result = getBundleStarProgress([sentence, unavailable], interactions, 'ko');
  assert.equal(result.max, 3);
  assert.equal(result.earned, 3);
  for (const mode of result.modes) assert.equal(mode.max, getEligiblePracticeItems([sentence, unavailable], mode.mode, 'ko').length);
  assert.equal(isPracticeMode('toString'), false);
});

test('words from the same sentence have independent status and do not inherit Word Fill results', () => {
  const words = [{ id: 's1-11', progressId: '11' }, { id: 's1-12', progressId: '12' }];
  const rows = [{ word_id: 11, metadata: metadata('spelling', 1, true) }, { word_id: 12, metadata: metadata('wordfill', 1, true) }];
  assert.deepEqual(filterPracticeItems(words, rows, 'correct', 'spelling'), [words[0]]);
  assert.deepEqual(filterPracticeItems(words, rows, 'incomplete', 'spelling'), [words[1]]);
});

function database() {
  const tables = {
    bundle_items: [{ ...sentence, bundle_id: 'b1' }, { bundle_id: 'b1', id: 'w1', word_id: 11, sentence_id: null, words: wordA }],
    user_bundle_item_interactions: [], user_bundle_interactions: [], user_sentence_interactions: [],
    user_word_interactions: [], user_learning_stats: [],
  };
  function from(table) {
    const conditions = [];
    let operation = 'select', values, conflict, countRequested = false, head = false, single = false;
    const query = {
      select(_columns, options = {}) { countRequested = Boolean(options.count); head = Boolean(options.head); return query; },
      eq(key, value) { conditions.push(row => row[key] === value); return query; },
      not(key, _op, value) { conditions.push(row => value === null ? row[key] != null : row[key] !== value); return query; },
      gte(key, value) { conditions.push(row => row[key] >= value); return query; },
      maybeSingle() { single = true; return query; },
      upsert(data, options) { operation = 'upsert'; values = data; conflict = options.onConflict.split(','); return query; },
      insert(data) { operation = 'insert'; values = data; return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (operation === 'upsert') {
            let row = tables[table].find(row => conflict.every(key => row[key] === values[key]));
            if (!row) { row = {}; tables[table].push(row); }
            Object.assign(row, structuredClone(values));
          } else if (operation === 'insert') tables[table].push(structuredClone(values));
          const rows = tables[table].filter(row => conditions.every(condition => condition(row)));
          return { data: head ? null : single ? structuredClone(rows[0] || null) : structuredClone(rows), count: countRequested ? rows.length : null, error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  }
  return { tables, from, async rpc(_name, values) {
    const stats = tables.user_learning_stats.find(row => row.user_id === values.p_user_id);
    for (const [column, parameter] of Object.entries({ completed_sentences: 'completed_sentences', earned_stars: 'earned_stars', practiced_words: 'practiced_words', total_correct_count: 'total_correct', total_incorrect_count: 'total_incorrect' })) {
      stats[column] += values[`p_${parameter}_delta`];
    }
    return { error: null };
  } };
}
function serviceFixture() {
  const db = database();
  const service = loadPracticeModules({
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/supabase/services/learning-daily-activity': { recordLearningDailyActivity: async () => {} },
    './learning-review': {},
  })('lib/supabase/services/bundle-progress');
  return { db, service };
}

test('Spelling saves word outcomes and a word cursor without completing the sentence', async () => {
  const { db, service } = serviceFixture();
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', true, 11);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', false, 12);
  assert.equal(db.tables.user_bundle_item_interactions.length, 0);
  assert.equal(db.tables.user_sentence_interactions.length, 0);
  assert.equal(db.tables.user_word_interactions.length, 2);
  assert.equal(db.tables.user_bundle_interactions[0].current_practice_item_ids.spelling, '12');
  const stats = db.tables.user_learning_stats[0];
  assert.equal(stats.earned_stars, 0);
  assert.equal(stats.completed_sentences, 0);
  assert.equal(stats.practiced_words, 2);
  assert.equal(stats.total_correct_count, 1);
  assert.equal(stats.total_incorrect_count, 1);
});

test('sentence results award once, Word Fill updates proficiency without double-counting accuracy', async () => {
  const { db, service } = serviceFixture();
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', true);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', false);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', true);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'wordfill', true, 11);
  const stats = db.tables.user_learning_stats[0];
  assert.equal(stats.earned_stars, 2);
  assert.equal(stats.completed_sentences, 1);
  assert.equal(stats.total_correct_count, 3);
  assert.equal(stats.total_incorrect_count, 1);
  assert.equal(stats.practiced_words, 1);
  assert.equal(db.tables.user_bundle_interactions[0].progress_ratio, 1);
  assert.equal(db.tables.user_word_interactions[0].proficiency_level, 1);
});

test('server rejects unrelated words and unavailable activities before saving', async () => {
  const { db, service } = serviceFixture();
  await assert.rejects(service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', true, 99), /Word does not belong/);
  await assert.rejects(service.recordBundleItemPractice('u1', 'b1', 'w1', 'quiz', true), /not available/);
  await assert.rejects(service.recordBundleItemPractice('u1', 'b1', 's1', 'flashcards', true), /does not accept/);
  assert.equal(db.tables.user_learning_stats.length, 0);
});

test('rebuilding statistics matches live counts for mixed sentence and word activities', async () => {
  const { db, service } = serviceFixture();
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', true);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'wordfill', true, 11);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', false, 11);
  await service.recordWordReviewResult('u1', 12, true, 'word_quiz');
  const before = await service.getLearningProgressSummary('u1');
  db.tables.user_learning_stats.length = 0;
  assert.deepEqual(await service.getLearningProgressSummary('u1'), before);
});

test('word target catalog deduplicates linked words and prefers directly included words', () => {
  const { getPracticeWordTargets } = load('lib/practice/registry');
  const targets = getPracticeWordTargets([sentence, { id: 'direct', words: wordA }], 'spelling', 'en');
  assert.equal(targets.length, 2);
  assert.equal(targets.find(target => target.word.id === 11).bundleItemId, 'direct');
  assert.equal(targets.find(target => target.word.id === 12).bundleItemId, 's1');
});

test('word API accepts registered word modes and rejects sentence modes', async () => {
  const saved = [];
  const route = loadPracticeModules({
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/auth/app-user': { getAppUserFromRequest: async () => ({ id: 'u1' }) },
    '@/lib/supabase/services/bundle-progress': { recordWordReviewResult: async (...args) => { saved.push(args); return { success: true }; } },
  })('app/api/word-progress/route');
  const request = mode => ({ json: async () => ({ word_id: 11, practice_mode: mode, is_correct: true }) });
  assert.equal((await route.POST(request('word_quiz'))).status, 200);
  assert.equal((await route.POST(request('quiz'))).status, 400);
  assert.deepEqual(saved, [['u1', 11, true, 'word_quiz']]);
});

test('word cursors and session counts use word IDs even for a shared sentence', async () => {
  const { db, service } = serviceFixture();
  await service.recordBundlePracticeAccess('u1', 'b1', 'spelling', 's1', 12);
  const { getPracticeSessionCounts } = load('app/bundles/[id]/practice-session');
  const cursor = db.tables.user_bundle_interactions[0].current_practice_item_ids.spelling;
  const items = [{ id: '11', progressId: '11' }, { id: '12', progressId: '12' }];
  const counts = getPracticeSessionCounts(items, [], 'spelling', cursor);
  assert.equal(cursor, '12');
  assert.equal(counts.resume, 2);
  assert.equal(counts.incomplete, 2);
});

for (const mode of ['word_quiz', 'word_flashcards']) {
  test(`${mode} shares bundle and review word progress without sentence rewards`, async () => {
    const { db, service } = serviceFixture();
    const { getPracticeWordTargets, isBundlePracticeMode } = load('lib/practice/registry');
    assert.equal(isBundlePracticeMode(mode), true);
    assert.equal(getPracticeWordTargets([sentence, { id: 'direct', words: wordA }], mode, 'ko').length, 2);
    await service.recordBundleItemPractice('u1', 'b1', 's1', mode, true, 11);
    await service.recordWordReviewResult('u1', 11, false, mode);
    const word = db.tables.user_word_interactions[0];
    assert.equal(db.tables.user_word_interactions.length, 1);
    assert.equal(word.metadata.practice_modes[mode].correct_count, 1);
    assert.equal(word.metadata.practice_modes[mode].incorrect_count, 1);
    assert.equal(word.metadata.practice_modes[mode].last_is_correct, false);
    assert.equal(db.tables.user_bundle_interactions[0].current_practice_item_ids[mode], '11');
    assert.equal(db.tables.user_bundle_item_interactions.length, 0);
    assert.equal(db.tables.user_sentence_interactions.length, 0);
    assert.equal(db.tables.user_learning_stats[0].earned_stars, 0);
    assert.equal(db.tables.user_learning_stats[0].total_correct_count, 1);
    assert.equal(db.tables.user_learning_stats[0].total_incorrect_count, 1);
    await assert.rejects(service.recordBundleItemPractice('u1', 'b1', 's1', mode, true, 99), /Word does not belong/);
  });
}
