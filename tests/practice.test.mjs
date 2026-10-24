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
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
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
const { getBundleStarProgress, hasEarnedPracticeStar, calculateBundleWordProgress } = load('lib/practice/progress');
const { getPracticeModeStarProgress, filterPracticeItems, getNextIncompletePracticeMode } = load('app/bundles/[id]/practice-session');
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
    user_word_interactions: [], user_learning_stats: [], bundle_words: [],
  };
  function from(table) {
    const conditions = [];
    let operation = 'select', values, conflict, countRequested = false, head = false, single = false, first = 0, last = Infinity;
    const query = {
      select(_columns, options = {}) { countRequested = Boolean(options.count); head = Boolean(options.head); return query; },
      eq(key, value) { conditions.push(row => key === 'metadata' ? JSON.stringify(row[key]) === value : row[key] === value); return query; },
      is(key, value) { conditions.push(row => value === null ? row[key] == null : row[key] === value); return query; },
      update(data) { operation = 'update'; values = data; return query; },
      in(key, values) { conditions.push(row => Array.isArray(values) && values.includes(row[key])); return query; },
      order() { return query; },
      range(start, end) { first = start; last = end; return query; },
      limit(count) { last = count - 1; return query; },
      not(key, op, value) { conditions.push(row => op === 'in' ? !value.slice(1, -1).split(',').includes(String(row[key])) : value === null ? row[key] != null : row[key] !== value); return query; },
      gte(key, value) { conditions.push(row => row[key] >= value); return query; },
      maybeSingle() { single = true; return query; },
      upsert(data, options) { operation = 'upsert'; values = data; conflict = options.onConflict.split(','); return query; },
      insert(data) { operation = 'insert'; values = data; return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (operation === 'update') {
            const matched = tables[table].filter(row => conditions.every(condition => condition(row)));
            for (const row of matched) Object.assign(row, structuredClone(values));
            return { data: structuredClone(matched), error: null };
          }
          if (operation === 'upsert') {
            let row = tables[table].find(row => conflict.every(key => row[key] === values[key]));
            if (!row) { row = {}; tables[table].push(row); }
            Object.assign(row, structuredClone(values));
          } else if (operation === 'insert') tables[table].push(structuredClone(values));
          const rows = tables[table].filter(row => conditions.every(condition => condition(row)));
          return { data: head ? null : single ? structuredClone(rows[0] || null) : structuredClone(rows.slice(first, last + 1)), count: countRequested ? rows.length : null, error: null };
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
  assert.equal(db.tables.user_bundle_interactions[0].is_completed, false);
  assert.ok(db.tables.user_bundle_interactions[0].progress_ratio < 1);
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

test('getPracticeWordTargets filters and respects order when selectedWordIds is provided', () => {
  const { getPracticeWordTargets } = load('lib/practice/registry');
  const items = [sentence, { id: 'direct', words: wordA }];
  const targetsFiltered = getPracticeWordTargets(items, 'spelling', 'ko', [12]);
  assert.equal(targetsFiltered.length, 1);
  assert.equal(targetsFiltered[0].word.id, 12);

  const targetsOrdered = getPracticeWordTargets(items, 'spelling', 'ko', [12, 11]);
  assert.equal(targetsOrdered.length, 2);
  assert.equal(targetsOrdered[0].word.id, 12);
  assert.equal(targetsOrdered[1].word.id, 11);

  assert.equal(getPracticeWordTargets(items, 'spelling', 'ko', []).length, 2);
  assert.equal(getPracticeWordTargets(items, 'spelling', 'ko', null).length, 2);
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

function reviewFixture(overrides = {}, cap = 73, failTable = null) {
  const old = '2020-01-01T00:00:00Z';
  const interaction = { user_id: 'u1', proficiency_level: 1, incorrect_count: 0, streak_count: 1, last_reviewed_at: old, metadata: { last_practice_is_correct: true } };
  const tables = {
    user_sentence_interactions: [{ ...interaction, id: 'si1', sentence_id: 1, sentences: { id: 1, sentence: 'hola', translation: '안녕' } }],
    user_word_interactions: [{ ...interaction, id: 'wi1', word_id: 11, words: wordA }],
    user_bundle_item_interactions: [{ id: 'hi1', user_id: 'u1', bundle_id: 'b1', bundle_item_id: 'item1', last_practiced_at: old }],
    user_bundle_interactions: [{ id: 'hb1', user_id: 'u1', bundle_id: 'b1', last_studied_at: old }],
    bundle_items: [{ id: 'item1', sentence_id: 1, bundle_id: 'b1', bundle: { is_published: true, access_level: 'free' } }],
    ...overrides,
  };
  const db = { from(table) {
    const filters = [];
    let start = 0, end = cap - 1;
    const q = {
      select() { return q; },
      eq(k, v) { filters.push(r => r[k] === v); return q; },
      gte(k, v) { filters.push(r => r[k] >= v); return q; },
      lt(k, v) { filters.push(r => r[k] < v); return q; },
      in(k, v) { filters.push(r => v.includes(r[k])); return q; },
      not(k, _op, v) { filters.push(r => r[k] !== v); return q; },
      order() { return q; },
      range(a, b) { start = a; end = Math.min(b, a + cap - 1); return q; },
      then(resolve, reject) {
        if (table === failTable) return Promise.resolve({ data: null, error: new Error('database unavailable') }).then(resolve, reject);
        const source = tables[table] || (table === 'sentences' ? tables.user_sentence_interactions.map(r => r.sentences) : table === 'words' ? tables.user_word_interactions.map(r => r.words) : []);
        const data = source.filter(Boolean).filter(r => filters.every(f => f(r))).sort((a, b) => String(a.id).localeCompare(String(b.id))).slice(start, end + 1);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return q;
  } };
  const service = loadPracticeModules({
    react: { cache: fn => fn },
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/bundle-access': { getBundleAccess: async bundle => ({ canView: bundle.is_published && bundle.access_level === 'free' }) },
  })('lib/supabase/services/learning-review');
  return { service, tables, interaction };
}

test('review chooses a practiced, accessible sentence item deterministically', async () => {
  const { service, tables } = reviewFixture();
  tables.bundle_items.push(
    { id: 'aaa', sentence_id: 1, bundle_id: 'unlearned', bundle: { is_published: true, access_level: 'free' } },
    { id: 'zzz', sentence_id: 1, bundle_id: 'private', bundle: { is_published: false, access_level: 'free' } },
    { id: 'premium', sentence_id: 1, bundle_id: 'premium', bundle: { is_published: true, access_level: 'premium' } },
    { id: 'new', sentence_id: 1, bundle_id: 'new', bundle: { is_published: true, access_level: 'free' } },
  );
  for (const bundle_id of ['private', 'premium', 'new']) tables.user_bundle_interactions.push({ id: bundle_id, user_id: 'u1', bundle_id, last_studied_at: '2026-01-01' });
  tables.user_bundle_item_interactions.push({ id: 'private-history', user_id: 'u1', bundle_id: 'private', bundle_item_id: 'zzz', last_practiced_at: '2026-01-01' });
  assert.equal((await service.getReviewSentences('u1'))[0].bundle_item_id, 'item1');
  tables.bundle_items.reverse();
  assert.equal((await service.getReviewSentences('u1'))[0].bundle_item_id, 'item1');
  tables.bundle_items.find(r => r.id === 'item1').bundle.is_published = false;
  assert.equal((await service.getReviewSentences('u1'))[0].bundle_item_id, 'new');
});

test('initial wrong answers enter review after one day and are not unstarted', async () => {
  const { service, tables } = reviewFixture();
  for (const table of ['user_sentence_interactions', 'user_word_interactions']) {
    Object.assign(tables[table][0], { proficiency_level: 0, incorrect_count: 1, metadata: { last_practice_is_correct: false } });
  }
  assert.equal((await service.getReviewSentences('u1')).length, 1);
  assert.equal((await service.getReviewWords('u1')).length, 1);
  assert.equal((await service.getReviewWords('u1', 20, 'unstarted')).length, 0);
  assert.equal((await service.getReviewNeededSummary('u1')).availableTotal, 2);
  for (const table of ['user_sentence_interactions', 'user_word_interactions']) tables[table][0].last_reviewed_at = new Date().toISOString();
  assert.equal((await service.getReviewNeededSummary('u1')).availableTotal, 0);
  const { isReviewDue } = load('lib/learning/review-schedule');
  const row = { proficiency_level: 0, last_reviewed_at: '2026-01-01T00:00:00Z', metadata: { last_practice_is_correct: false } };
  assert.equal(isReviewDue(row, new Date('2026-01-01T23:59:59Z')), false);
  assert.equal(isReviewDue(row, new Date('2026-01-02T00:00:00Z')), true);
});

test('counts exclude invalid content and limits apply after validation', async () => {
  const { service, tables, interaction } = reviewFixture();
  tables.user_word_interactions.unshift({ ...interaction, id: 'a', word_id: 90, words: null }, { ...interaction, id: 'b', word_id: 91, words: { word: 'empty', meaning_ko: '' } });
  tables.user_sentence_interactions.unshift({ ...interaction, id: 'a', sentence_id: 90, sentences: { sentence: 'unlinked', translation: '연결 없음' } }, { ...interaction, id: 'b', sentence_id: 91, sentences: null });
  const summary = await service.getReviewNeededSummary('u1');
  assert.equal(summary.availableSentences, 1);
  assert.equal(summary.availableWords, 1);
  assert.equal((await service.getReviewWords('u1', 1))[0].id, 11);
  assert.equal((await service.getReviewSentences('u1', 1))[0].id, 1);
  tables.bundle_items.length = 0;
  assert.equal((await service.getReviewNeededSummary('u1')).availableSentences, 0);
});

test('review exhausts capped pages before due filtering, counts and limits', async () => {
  const { service, tables, interaction } = reviewFixture({}, 73);
  tables.user_sentence_interactions = [];
  tables.user_word_interactions = [];
  tables.bundle_items = [];
  for (let i = 0; i < 1105; i++) {
    const id = String(i).padStart(5, '0');
    const timing = i < 1000 ? { last_reviewed_at: new Date().toISOString() } : {};
    tables.user_word_interactions.push({ ...interaction, ...timing, id, word_id: i, words: { ...wordA, id: i } });
    tables.user_sentence_interactions.push({ ...interaction, ...timing, id, sentence_id: i, sentences: { id: i, sentence: 'hola', translation: '안녕' } });
    tables.bundle_items.push({ id, sentence_id: i, bundle_id: 'b1', bundle: { is_published: true, access_level: 'free' } });
  }
  const summary = await service.getReviewNeededSummary('u1');
  assert.equal(summary.availableWords, 105);
  assert.equal(summary.availableSentences, 105);
  assert.equal((await service.getReviewWords('u1', 2000)).length, 105);
  assert.equal((await service.getReviewSentences('u1', 2000)).length, 105);
  assert.equal((await service.getReviewSentences('u1', 40)).length, 40);
});

test('review fails explicitly on database errors rather than reporting an empty queue', async () => {
  const { service } = reviewFixture({}, 73, 'user_word_interactions');
  await assert.rejects(service.getReviewNeededSummary('u1'), /database unavailable/);
});

test('review distinguishes new, mastered and first-wrong records and falls back across display languages', async () => {
  const { service, tables, interaction } = reviewFixture();
  tables.user_word_interactions = [
    { ...interaction, id: 'new', word_id: 21, proficiency_level: 0, last_reviewed_at: null, metadata: {}, words: { ...wordA, id: 21 } },
    { ...interaction, id: 'mastered', word_id: 22, proficiency_level: 5, words: { ...wordA, id: 22 } },
    { ...interaction, id: 'english', word_id: 23, words: { id: 23, word: 'hola', meaning_en: 'hello' } },
  ];
  assert.deepEqual((await service.getReviewWords('u1', 20, 'unstarted')).map(r => r.id), [21]);
  const words = await service.getReviewWords('u1');
  assert.deepEqual(words.map(r => r.id), [23]);
  assert.equal(words[0].meaning_ko, 'hello');
  assert.equal((await service.getReviewNeededSummary('u1')).availableWords, 1);
});

test('pinning a bundle alone does not make it a sentence result destination', async () => {
  const { service, tables } = reviewFixture();
  tables.user_bundle_item_interactions = [];
  tables.user_bundle_interactions = [{ id: 'pin', user_id: 'u1', bundle_id: 'b1', is_started: false, last_studied_at: null }];
  assert.equal((await service.getReviewSentences('u1')).length, 0);
  assert.equal((await service.getReviewNeededSummary('u1')).availableSentences, 0);
});

const { buildScrambleQuestion, isScrambleAnswerCorrect, normalizeScrambleWords } = load('lib/practice/scramble');

test('scramble beginners get groups and a fixed first piece; familiar sentences use words', () => {
  const text = 'Hoy quiero tomar un café con mis amigos';
  for (const level of [undefined, 0, 1]) {
    const question = buildScrambleQuestion(text, level);
    assert.equal(question.grouped, true);
    assert.deepEqual(question.tokens.map(t => t.text), ['hoy quiero', 'tomar un', 'café con', 'mis amigos']);
    assert.deepEqual(question.fixedTokens, question.tokens.slice(0, 1));
    assert.equal(isScrambleAnswerCorrect(question, question.selectableTokens), true);
    assert.equal(isScrambleAnswerCorrect(question, [...question.selectableTokens].reverse()), false);
  }
  for (const level of [2, 3, 4, 5]) {
    const question = buildScrambleQuestion(text, level);
    assert.equal(question.grouped, false);
    assert.equal(question.tokens.length, 8);
    assert.equal(question.fixedTokens.length, 0);
  }
});

test('scramble limits pieces without dropping words in long sentences', () => {
  for (const length of [9, 13, 20, 51]) {
    const text = Array.from({ length }, (_, i) => `word${i}`).join(' ');
    for (const level of [0, 1, 2, 5]) {
      const question = buildScrambleQuestion(text, level);
      assert.ok(question.tokens.length <= (level < 2 ? 6 : 8));
      assert.equal(question.tokens.map(t => t.text).join(' '), text);
      assert.equal(isScrambleAnswerCorrect(question, question.selectableTokens), true);
      assert.equal(isScrambleAnswerCorrect(question, question.selectableTokens.slice(1)), false);
      assert.deepEqual(question, buildScrambleQuestion(text, level));
    }
  }
});

test('scramble handles punctuation, spacing, accented words and repeated words', () => {
  const question = buildScrambleQuestion('¿Tú, tú quieres café?  Sí, café.', 3);
  assert.deepEqual(normalizeScrambleWords('¿Tú, tú quieres café?  Sí, café.'), ['tú', 'tú', 'quieres', 'café', 'sí', 'café']);
  const selected = [...question.selectableTokens];
  [selected[0], selected[1]] = [selected[1], selected[0]];
  assert.equal(isScrambleAnswerCorrect(question, selected), true);
  assert.equal(new Set(question.tokens.map(t => t.id)).size, question.tokens.length);
  const duplicate = [...selected];
  duplicate[1] = duplicate[0];
  assert.equal(isScrambleAnswerCorrect(question, duplicate), false);
  assert.equal(isScrambleAnswerCorrect(question, selected.map(t => ({ ...t, text: t.text === 'tú' ? 'tu' : t.text }))), false);
});

test('scramble never supplies the whole answer and rejects empty questions', () => {
  for (const text of ['', ' ¿ ? ']) {
    const question = buildScrambleQuestion(text, 0);
    assert.equal(question.tokens.length, 0);
    assert.equal(isScrambleAnswerCorrect(question, []), false);
  }
  for (const text of ['¡Hola!', 'Buenos días', 'Me gusta café']) {
    const question = buildScrambleQuestion(text, 0);
    assert.ok(question.selectableTokens.length > 0);
    assert.equal(isScrambleAnswerCorrect(question, []), false);
    assert.equal(isScrambleAnswerCorrect(question, question.selectableTokens), true);
  }
});

// Exercise client event handlers with a minimal hook runner (no DOM or network).
function practiceClientHarness(file, props) {
  const slots = [], effects = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, n) => !Object.is(v, slots[i].deps[n]))) slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, n) => !Object.is(v, slots[i][n]))) { slots[i] = deps; effects.push(fn); }
    },
  };
  const component = loadPracticeModules({
    react,
    'next/link': { __esModule: true, default: 'a' },
    '@/lib/utils': { getPublicUrl: x => x },
    '@/components/assets/CharacterAsset': { CharacterAsset: 'CharacterAsset' },
    '@/components/practice/ScrambleQuestion': { ScrambleQuestion: 'ScrambleQuestion' },
    '@/components/practice/MultipleChoiceQuestion': { MultipleChoiceQuestion: 'MultipleChoiceQuestion' },
    '@/components/practice/PracticeCountSelector': { PracticeCountSelector: 'PracticeCountSelector' },
    '@/components/practice/PracticeScorePills': { PracticeScorePills: 'PracticeScorePills' },
    '@/components/practice/ScrambleReveal': { ScrambleRevealActions: 'RevealActions', ScrambleRevealedAnswer: 'RevealedAnswer' },
  })(file).default;
  function render() {
    cursor = 0;
    let tree = component(props);
    if (effects.length) { effects.splice(0).forEach(fn => fn()); cursor = 0; tree = component(props); }
    return tree;
  }
  return { render };
}
function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
function textOf(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  return tree?.props ? textOf(tree.props.children) : '';
}

test('bundle scramble reveal records one wrong answer; skip and guest reveal do not save results', async () => {
  const originalFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async (_url, options) => { calls.push(options); return {}; };
  try {
    const props = { bundleId: 'b1', title: 'Test', items: [{ id: 's1', sentence: 'hola amigo', translation: '안녕 친구', audioUrl: null }, { id: 's2', sentence: 'buenos días', translation: '좋은 아침', audioUrl: null }], language: 'en', isLoggedIn: true };
    const h = practiceClientHarness('app/bundles/[id]/scramble/BundleScrambleClient.tsx', props);
    let tree = h.render();
    elements(tree).find(e => e.type === 'RevealActions').props.onReveal();
    tree = h.render();
    assert.equal(elements(tree).find(e => e.type === 'RevealedAnswer').props.sentence, 'hola amigo');
    assert.equal(elements(tree).find(e => e.type === 'ScrambleQuestion').props.result, null);
    assert.equal(elements(tree).some(e => e.type === 'RevealActions'), false);
    assert.deepEqual(calls.filter(c => c.method === 'POST').map(c => JSON.parse(c.body).is_correct), [false]);
    elements(tree).find(e => e.type === 'button' && textOf(e) === 'Next').props.onClick();
    tree = h.render();
    elements(tree).find(e => e.type === 'RevealActions').props.onSkip();
    assert.match(textOf(h.render()), /Scramble complete/);
    assert.equal(calls.filter(c => c.method === 'POST').length, 1);
    calls.length = 0;
    const guest = practiceClientHarness('app/bundles/[id]/scramble/BundleScrambleClient.tsx', { ...props, isLoggedIn: false });
    elements(guest.render()).find(e => e.type === 'RevealActions').props.onReveal();
    guest.render();
    assert.equal(calls.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('review scramble delegates to BundleScrambleClient and records results', async () => {
  const originalFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async (_url, options) => { calls.push(JSON.parse(options.body)); return {}; };
  try {
    const initialItems = [1, 2].map(id => ({ id, sentence: 'hola amigo', translation: '안녕 친구', translation_en: 'hello friend', bundle_id: 'b1', bundle_item_id: `s${id}`, proficiency_level: 1, audio_url: null }));
    const h = practiceClientHarness('app/learn/review/sentences/SentencesReviewClient.tsx', { initialItems, availableReviewCount: 2, language: 'en' });
    let tree = h.render();
    elements(tree).find(e => e.type === 'button' && textOf(e) === 'Scramble').props.onClick();
    tree = h.render();
    const start = elements(tree).find(e => e.type === 'button' && /Start/.test(textOf(e)));
    start.props.onClick();
    tree = h.render();
    const scrambleNode = elements(tree).find(e => typeof e.type === 'function');
    assert.ok(scrambleNode);
    assert.equal(scrambleNode.props.headerEyebrow, 'Scramble');
    assert.equal(scrambleNode.props.items.length, 2);
    scrambleNode.props.onRecordResult('s1', false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].is_correct, false);
    assert.equal(calls[0].bundle_id, 'b1');
    assert.equal(calls[0].bundle_item_id, 's1');
  } finally { globalThis.fetch = originalFetch; }
});

test('getNextIncompletePracticeMode guides user through quiz -> scramble -> wordfill as modes are mastered', () => {
  // 1. Initial state: quiz incomplete
  const initialModes = [
    { mode: 'quiz', earned: 0, max: 5 },
    { mode: 'scramble', earned: 0, max: 5 },
    { mode: 'wordfill', earned: 0, max: 5 },
  ];
  assert.equal(getNextIncompletePracticeMode(initialModes), 'quiz');

  // 2. Quiz completed: recommends scramble
  const quizDoneModes = [
    { mode: 'quiz', earned: 5, max: 5 },
    { mode: 'scramble', earned: 0, max: 5 },
    { mode: 'wordfill', earned: 0, max: 5 },
  ];
  assert.equal(getNextIncompletePracticeMode(quizDoneModes), 'scramble');

  // 3. Quiz & Scramble completed: recommends wordfill
  const scrambleDoneModes = [
    { mode: 'quiz', earned: 5, max: 5 },
    { mode: 'scramble', earned: 5, max: 5 },
    { mode: 'wordfill', earned: 2, max: 5 },
  ];
  assert.equal(getNextIncompletePracticeMode(scrambleDoneModes), 'wordfill');

  // 4. Ineligible wordfill mode (max: 0): skips to fallback
  const ineligibleWordFill = [
    { mode: 'quiz', earned: 5, max: 5 },
    { mode: 'scramble', earned: 5, max: 5 },
    { mode: 'wordfill', earned: 0, max: 0 },
  ];
  assert.equal(getNextIncompletePracticeMode(ineligibleWordFill), 'quiz');

  // 5. All completed: falls back to quiz
  const allDoneModes = [
    { mode: 'quiz', earned: 5, max: 5 },
    { mode: 'scramble', earned: 5, max: 5 },
    { mode: 'wordfill', earned: 5, max: 5 },
  ];
  assert.equal(getNextIncompletePracticeMode(allDoneModes), 'quiz');
});

test('calculateBundleWordProgress accurately calculates completion count and percentage', () => {
  const wordTargets = [
    { word: { id: 101 } },
    { word: { id: 102 } },
    { word: { id: 103 } },
    { word: { id: 104 } },
  ];

  // 1. Empty targets
  assert.deepEqual(calculateBundleWordProgress([], []), { total: 0, completed: 0, percent: 0 });

  // 2. No user interactions (guest or untouched)
  assert.deepEqual(calculateBundleWordProgress(wordTargets, []), { total: 4, completed: 0, percent: 0 });

  // 3. Partial progress: 2 words completed (one via proficiency_level, one via correct_count)
  const partialInteractions = [
    { word_id: 101, proficiency_level: 2, correct_count: 3 },
    { word_id: 102, proficiency_level: 0, correct_count: 1 },
    { word_id: 103, proficiency_level: 0, correct_count: 0 },
    // 104 has no interaction row
  ];
  assert.deepEqual(calculateBundleWordProgress(wordTargets, partialInteractions), {
    total: 4,
    completed: 2,
    percent: 50,
  });

  // 4. All completed (100%)
  const fullInteractions = [
    { word_id: 101, proficiency_level: 1 },
    { word_id: 102, proficiency_level: 3 },
    { word_id: 103, correct_count: 1 },
    { word_id: 104, proficiency_level: 5 },
  ];
  assert.deepEqual(calculateBundleWordProgress(wordTargets, fullInteractions), {
    total: 4,
    completed: 4,
    percent: 100,
  });
});

test('catalog progress includes both sentence stars and shared word completion', async () => {
  const { db, service } = serviceFixture();

  // Initialize bundle interaction as started with 1 sentence item in b1
  db.tables.user_bundle_interactions.push({
    user_id: 'u1',
    bundle_id: 'b1',
    is_started: true,
    is_completed: false,
    progress_ratio: 0,
    last_studied_at: new Date().toISOString(),
  });

  // 1. Before practicing: 0 stars
  let [result] = await service.listUserBundleInteractionsForBundles('u1', ['b1']);
  assert.equal(result.progress_ratio, 0);
  assert.equal(result.is_completed, false);

  // 2. Practice quiz: 1 star out of 3 eligible stars for s1 (quiz, scramble, wordfill)
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', true);
  [result] = await service.listUserBundleInteractionsForBundles('u1', ['b1']);
  // Sentence and word tracks each contribute half of overall progress.
  assert.ok(Math.abs(result.progress_ratio - 1 / 6) < 0.001);
  assert.equal(result.earned_stars, 1);
  assert.equal(result.max_stars, 3);
  assert.equal(result.is_completed, false);

  // 3. Practice scramble: 2 stars out of 3
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'scramble', true);
  [result] = await service.listUserBundleInteractionsForBundles('u1', ['b1']);
  // Two sentence stars, no learned words yet.
  assert.ok(Math.abs(result.progress_ratio - 1 / 3) < 0.001);
  assert.equal(result.earned_stars, 2);
  assert.equal(result.max_stars, 3);
  assert.equal(result.is_completed, false);

  // All sentence stars, but only one of two words learned.
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'wordfill', true, 11);
  [result] = await service.listUserBundleInteractionsForBundles('u1', ['b1']);
  assert.equal(result.progress_ratio, 0.75);
  assert.equal(result.is_completed, false);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', true, 12);
  [result] = await service.listUserBundleInteractionsForBundles('u1', ['b1']);
  assert.equal(result.progress_ratio, 1);
  assert.equal(result.earned_stars, 3);
  assert.equal(result.max_stars, 3);
  assert.equal(result.is_completed, true);
});

test('getCategoryHref routes directly to /bundles with category query parameter', () => {
  const { getCategoryHref, isCategorySlugMatch } = load('app/bundles/bundle-utils');
  const categoryKo = { id: 2, name: '일상 대화', name_en: 'Daily Conversation' };

  // 1. Korean slug
  const hrefKo = getCategoryHref(categoryKo, 'ko');
  assert.equal(hrefKo, '/bundles?category=%EC%9D%BC%EC%83%81-%EB%8C%80%ED%99%94');

  // 2. English slug
  const hrefEn = getCategoryHref(categoryKo, 'en');
  assert.equal(hrefEn, '/bundles?category=daily-conversation');

  // 3. Null safe fallback
  assert.equal(getCategoryHref(null), '/bundles');

  // 4. Matching works for slug, name, and id
  assert.equal(isCategorySlugMatch(categoryKo, 'daily-conversation'), true);
  assert.equal(isCategorySlugMatch(categoryKo, '일상-대화'), true);
  assert.equal(isCategorySlugMatch(categoryKo, '2'), true);
  assert.equal(isCategorySlugMatch(categoryKo, 'other'), false);
});

test('bundle list uses the same mastery stars and listening totals as bundle details', async () => {
  const rows = [
    { bundle_id: 'b1', bundle_item_id: 's1', play_count: 4, repeat_count: 3, correct_count: 8, metadata: {
      practice_modes: { quiz: { correct_count: 2 }, scramble: { correct_count: 1 }, wordfill: { correct_count: 1 } },
    } },
    { bundle_id: 'b1', bundle_item_id: 's2', play_count: 2, is_completed: true, metadata: null },
  ];
  const items = [
    { ...sentence, bundle_id: 'b1' },
    { id: 's2', bundle_id: 'b1', sentences: { sentence: 'adios', translation_en: 'goodbye' } },
  ];
  const tables = {
    user_bundle_interactions: [{ bundle_id: 'b1', is_started: true, is_completed: true }, { bundle_id: 'b2' }],
    bundle: ['b1', 'b2'].map(id => ({ id, title: id, bundle_items: [{ count: id === 'b1' ? 2 : 0 }], bundle_words: [{ count: 0 }] })),
    bundle_items: items,
    user_bundle_item_interactions: rows,
    bundle_words: [], user_word_interactions: [],
  };
  const db = { from(table) {
    let start = 0, end = Infinity;
    const query = {
      select() { return query; }, eq() { return query; }, in() { return query; }, order() { return query; },
      range(first, last) { start = first; end = last; return query; },
      then(resolve, reject) { return Promise.resolve({ data: tables[table].slice(start, end + 1), error: null }).then(resolve, reject); },
    };
    return query;
  } };
  const service = loadPracticeModules({ '@/lib/supabase/admin': { createAdminClient: () => db } })('lib/supabase/services/user-bundles');
  const { getTotalPlayCount } = load('lib/practice/progress');
  for (const language of ['ko', 'en']) {
    const { bundles, summary } = await service.getUserBundles('u1', language);
    assert.equal(summary.averageStarAchievement, 60);
    assert.equal(summary.completed, 0);
    const result = bundles.find(bundle => bundle.bundleId === 'b1');
    const expected = getBundleStarProgress(items, rows, language);
    assert.equal(result.earnedStars, 3);
    assert.equal(result.status, 'in-progress');
    assert.equal(result.isCompleted, false);
    assert.equal(result.earnedStars, expected.earned);
    assert.equal(result.maxStars, 5);
    assert.equal(result.maxStars, expected.max);
    assert.equal(result.totalPlays, 6);
    assert.equal(result.totalPlays, getTotalPlayCount(rows));
    const empty = bundles.find(bundle => bundle.bundleId === 'b2');
    assert.equal(empty.earnedStars, 0);
    assert.equal(empty.maxStars, 0);
    assert.equal(empty.totalPlays, 0);
  }
});


test('bundle sorting uses achievement ratios and puts missing targets and dates last', () => {
  const { compareBundleProgress } = load('lib/bundle-progress-sort');
  const bundles = [
    { bundleId: 'large', earnedStars: 10, maxStars: 100, lastStudiedAt: '2026-01-03' },
    { bundleId: 'small', earnedStars: 9, maxStars: 10, lastStudiedAt: '2026-01-01' },
    { bundleId: 'empty', earnedStars: 0, maxStars: 0, lastStudiedAt: null },
  ];
  const sorted = key => [...bundles].sort((a, b) => compareBundleProgress(a, b, key)).map(b => b.bundleId);
  assert.deepEqual(sorted('achievement-desc'), ['small', 'large', 'empty']);
  assert.deepEqual(sorted('achievement-asc'), ['large', 'small', 'empty']);
  assert.deepEqual(sorted('oldest'), ['small', 'large', 'empty']);
  assert.deepEqual(sorted('recent'), ['large', 'small', 'empty']);
});


test('completion distinguishes sentence-only, word-only, mixed and unavailable content', () => {
  const { calculateBundleCompletion } = load('lib/practice/bundle-completion');
  const fullStars = [{ bundle_item_id: 's1', metadata: { practice_modes: {
    quiz: { correct_count: 1 }, scramble: { correct_count: 1 }, wordfill: { correct_count: 1 },
  } } }];
  const sentenceOnly = [{ id: 's1', sentences: { sentence: 'hola', translation: '안녕' } }];
  assert.equal(calculateBundleCompletion(sentenceOnly, fullStars, []).isCompleted, true);
  const wordOnly = [{ id: 'w1', words: wordA }];
  const wordDone = calculateBundleCompletion(wordOnly, [], [{ word_id: 11, correct_count: 1 }], [], 'ko', { completed_word_ids: [11] });
  assert.equal(wordDone.wordCompleted, true);
  assert.equal(wordDone.sentenceCompleted, false);
  assert.equal(wordDone.isCompleted, true);
  const sentenceDone = calculateBundleCompletion([sentence], fullStars, []);
  assert.equal(sentenceDone.sentenceCompleted, true);
  assert.equal(sentenceDone.wordCompleted, false);
  assert.equal(sentenceDone.isCompleted, false);
  const onlyWordsDone = calculateBundleCompletion([sentence], [], [], [], 'ko', { completed_word_ids: [11, 12] });
  assert.equal(onlyWordsDone.wordCompleted, true);
  assert.equal(onlyWordsDone.sentenceCompleted, false);
  assert.equal(onlyWordsDone.isCompleted, false);
  const selected = calculateBundleCompletion([sentence, ...wordOnly], fullStars, [{ word_id: 11, correct_count: 1 }], [11], 'ko', { completed_word_ids: [11] });
  assert.equal(selected.wordProgress.total, 1);
  assert.equal(selected.isCompleted, true);
  assert.equal(calculateBundleCompletion([], [], []).isCompleted, false);
  assert.equal(calculateBundleCompletion([{ id: 'bad', sentences: { sentence: 'adios' } }], [], []).isCompleted, false);
});

test('practice persists full completion only after both tracks and preserves it after mistakes', async () => {
  const { db, service } = serviceFixture();
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', true);
  assert.equal(db.tables.user_bundle_interactions[0].is_completed, false);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'scramble', true);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'wordfill', true, 11);
  let summary = await service.getBundleProgressSummary('u1', 'b1', 0);
  assert.equal(summary.completion.sentenceCompleted, true);
  assert.equal(summary.completion.wordCompleted, false);
  assert.equal(db.tables.user_bundle_interactions[0].completed_at, null);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'word_quiz', true, 12);
  assert.equal(db.tables.user_bundle_interactions[0].is_completed, true);
  const completedAt = db.tables.user_bundle_interactions[0].completed_at;
  assert.ok(completedAt);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', false);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', false, 12);
  summary = await service.getBundleProgressSummary('u1', 'b1', 0);
  assert.equal(summary.completion.isCompleted, true);
  assert.equal(db.tables.user_bundle_interactions[0].is_completed, true);
  assert.equal(db.tables.user_bundle_interactions[0].completed_at, completedAt);
});

test('word review preserves shared knowledge without completing any bundle', async () => {
  const { db, service } = serviceFixture();
  db.tables.bundle_items.push({ id: 'w2', bundle_id: 'b2', words: wordA });
  db.tables.user_bundle_interactions.push({ user_id: 'u1', bundle_id: 'b2', is_started: true, is_completed: false, last_studied_at: '2025-01-01' });
  await service.recordWordReviewResult('u1', 11, true, 'spelling');
  const other = db.tables.user_bundle_interactions.find(row => row.bundle_id === 'b2');
  assert.equal(other.is_completed, false);
  assert.equal(other.last_studied_at, '2025-01-01');
  const summary = await service.getBundleProgressSummary('u1', 'b2', 0);
  assert.equal(summary.completion.knownWordsCount, 1);
  assert.equal(summary.completion.wordCompleted, false);
  assert.equal(summary.completion.isCompleted, false);
});

test('legacy completion flags are ignored and unplayable sentences do not block completion', async () => {
  const { db, service } = serviceFixture();
  db.tables.user_bundle_interactions.push({ user_id: 'u1', bundle_id: 'b1', is_started: true, is_completed: true, progress_ratio: 1, completed_at: '2025-01-01' });
  let summary = await service.getBundleProgressSummary('u1', 'b1', 0);
  assert.equal(summary.bundleInteraction.is_completed, false);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', true);
  assert.equal(db.tables.user_bundle_interactions[0].completed_at, null);
  db.tables.bundle_items.push({ id: 'bad', bundle_id: 'b1', sentence_id: 99, sentences: { sentence: 'adios' } });
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'scramble', true);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'wordfill', true, 11);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', true, 12);
  summary = await service.getBundleProgressSummary('u1', 'b1', 0);
  assert.equal(summary.completion.isCompleted, true);
  assert.equal(db.tables.user_bundle_interactions[0].is_completed, true);
});


test('home and bundle list ignore stale flags and expose partial completion consistently', async () => {
  const { db, service } = serviceFixture();
  db.tables.bundle = [{ id: 'b1', title: 'Mixed', is_published: true }];
  db.tables.user_bundle_interactions.push({ user_id: 'u1', bundle_id: 'b1', is_started: true, is_completed: true, last_studied_at: '2026-01-01' });
  const userBundles = loadPracticeModules({ '@/lib/supabase/admin': { createAdminClient: () => db } })('lib/supabase/services/user-bundles');
  assert.equal((await service.getActiveLearningBundles('u1')).length, 1);
  assert.equal((await service.getRecentStudiedBundle('u1')).bundle.id, 'b1');
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'quiz', true);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'scramble', true);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'wordfill', true, 11);
  let result = await userBundles.getUserBundles('u1');
  assert.equal(result.bundles[0].status, 'sentence-completed');
  assert.equal(result.bundles[0].sentenceCompleted, true);
  assert.equal(result.bundles[0].wordCompleted, false);
  assert.equal(result.summary.completed, 0);
  assert.equal((await service.getActiveLearningBundles('u1')).length, 1);
  assert.equal((await service.getRecentStudiedBundle('u1')).bundle.id, 'b1');
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'word_quiz', true, 12);
  result = await userBundles.getUserBundles('u1');
  assert.equal(result.bundles[0].status, 'completed');
  assert.equal(result.bundles[0].wordCompleted, true);
  assert.equal(result.summary.completed, 1);
  assert.equal((await service.getActiveLearningBundles('u1')).length, 0);
  assert.equal(await service.getRecentStudiedBundle('u1'), null);
});

test('completion loader exhausts item pages and does not borrow another user’s word progress', async () => {
  const { db } = serviceFixture();
  const loader = loadPracticeModules({ '@/lib/supabase/admin': { createAdminClient: () => db } })('lib/supabase/services/bundle-completion');
  db.tables.bundle_items = Array.from({ length: 1001 }, (_, index) => ({
    id: `item-${index}`, bundle_id: 'b1', sentence_id: index,
    sentences: { sentence: 'hola', translation: '안녕' },
  }));
  db.tables.user_bundle_item_interactions = db.tables.bundle_items.map(item => ({
    user_id: 'u1', bundle_id: 'b1', bundle_item_id: item.id,
    metadata: { practice_modes: { quiz: { correct_count: 1 }, scramble: { correct_count: 1 } } },
  }));
  let state = (await loader.loadBundleCompletion('u1', ['b1'])).get('b1');
  assert.equal(state.stars.max, 2002);
  assert.equal(state.stars.earned, 2002);
  assert.equal(state.isCompleted, true);
  db.tables.bundle_items.push({ id: 'w1', bundle_id: 'b1', words: wordA });
  db.tables.user_word_interactions.push({ user_id: 'another-user', word_id: 11, correct_count: 1 });
  state = (await loader.loadBundleCompletion('u1', ['b1'])).get('b1');
  assert.equal(state.wordProgress.completed, 0);
  assert.equal(state.isCompleted, false);
});


test('new bundle keeps word completion at zero despite shared mastery', () => {
  const { calculateBundleCompletion } = load('lib/practice/bundle-completion');
  const state = calculateBundleCompletion([sentence], [], [{ word_id: 11, correct_count: 4 }, { word_id: 12, proficiency_level: 5 }]);
  assert.equal(state.knownWordsCount, 2);
  assert.equal(state.wordProgress.completed, 0);
  assert.equal(state.progressRatio, 0);
  assert.equal(state.isCompleted, false);
});

test('concurrent bundle word completions preserve every ID and unrelated metadata', async () => {
  const { db } = serviceFixture();
  db.tables.user_bundle_interactions.push({ user_id: 'u1', bundle_id: 'b1', metadata: { note: 'keep', completed_word_ids: [5] } });
  const { recordCompletedBundleWord } = loadPracticeModules({ '@/lib/supabase/admin': { createAdminClient: () => db } })('lib/supabase/services/bundle-word-progress');
  await Promise.all([11, 12, 13, 11].map(id => recordCompletedBundleWord('u1', 'b1', id)));
  assert.deepEqual(db.tables.user_bundle_interactions[0].metadata, { note: 'keep', completed_word_ids: [5, 11, 12, 13] });
});

test('bundle-local completion controls incomplete word sessions across practice modes', () => {
  const items = [{ id: '11' }, { id: '12' }];
  const shared = [{ word_id: 11, metadata: metadata('spelling', 3, true) }];
  assert.deepEqual(filterPracticeItems(items, shared, 'incomplete', 'spelling', []), items);
  assert.deepEqual(filterPracticeItems(items, shared, 'incomplete', 'spelling', [12]), [items[0]]);
  assert.deepEqual(filterPracticeItems(items, shared, 'all', 'spelling', [12]), items);
  const { getPracticeSessionCounts } = load('app/bundles/[id]/practice-session');
  assert.equal(getPracticeSessionCounts(items, shared, 'word_quiz', null, [12]).incomplete, 1);
});

test('listening starts only with actual playback, not a saved cursor or practice', () => {
  const { getBundleListeningState } = load('lib/practice/bundle-listening');
  const items = [{ id: 's1' }, { id: 's2' }];
  assert.deepEqual(getBundleListeningState(items, [], null), { hasListened: false, currentStep: null });
  assert.deepEqual(getBundleListeningState(items, [{ bundle_item_id: 's1', play_count: 0 }], 's1'), { hasListened: false, currentStep: null });
  assert.deepEqual(getBundleListeningState(items, [{ bundle_item_id: 's2', play_count: 1 }], null), { hasListened: true, currentStep: 2 });
});

test('word completion ignores removed targets and survives duplicate or incorrect answers', async () => {
  const { db, service } = serviceFixture();
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', true, 11);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'word_quiz', true, 11);
  await service.recordBundleItemPractice('u1', 'b1', 's1', 'spelling', false, 11);
  const row = db.tables.user_bundle_interactions[0];
  assert.deepEqual(row.metadata.completed_word_ids, [11]);
  row.metadata.completed_word_ids.push(999);
  const summary = await service.getBundleProgressSummary('u1', 'b1', 0);
  assert.equal(summary.completion.wordProgress.completed, 1);
  assert.equal(summary.completion.wordProgress.total, 2);
});

test('new bundle detail renders zero local words and a listening start action despite shared history', () => {
  const React = nodeRequire('react');
  const { renderToStaticMarkup } = nodeRequire('react-dom/server');
  const componentLoad = loadPracticeModules({
    'next/image': { default: () => null },
    'next/link': { default: ({ children, href }) => React.createElement('a', { href }, children) },
  });
  const Detail = componentLoad('app/bundles/[id]/BundleDetailHubClient').default;
  const { calculateBundleCompletion } = load('lib/practice/bundle-completion');
  const completion = calculateBundleCompletion([sentence], [], [{ word_id: 11, correct_count: 2 }]);
  const props = {
    bundle: { id: 'b1', title: 'New bundle', level: 1 }, items: [sentence], language: 'ko',
    progress: { bundleInteraction: null, itemInteractions: [], totalItems: 1, completedItems: 0, progressRatio: 0, progressPercent: 0, currentBundleItemId: null, currentPracticeItemIds: {}, completion },
    isLoggedIn: true, access: { canView: true }, wordProgress: completion.wordProgress,
  };
  const html = renderToStaticMarkup(React.createElement(Detail, props));
  assert.ok(html.includes('듣기로 시작하기'));
  assert.ok(html.includes('아직 청취 기록이 없습니다'));
  assert.ok(html.includes('이전에 학습한 단어 1개 포함'));
  assert.ok(!html.includes('이어서 듣기'));
  assert.ok(!html.includes('번째 문장 학습 중'));
  const practiced = { ...props, progress: { ...props.progress, bundleInteraction: { is_started: true, last_studied_at: '2026-01-01' } } };
  const practiceHtml = renderToStaticMarkup(React.createElement(Detail, practiced));
  assert.ok(practiceHtml.includes('아직 청취 기록이 없습니다'));
  assert.ok(practiceHtml.includes('듣기 시작'));
  assert.ok(!practiceHtml.includes('이어서 듣기'));
});

test('home actions separate listening history from word progress and prioritize remaining practice', () => {
  const { calculateBundleCompletion } = load('lib/practice/bundle-completion');
  const { getHomeBundleLearning } = load('lib/practice/bundle-home');
  const state = (items, interactions = [], metadata = null, known = []) => ({
    ...calculateBundleCompletion(items, interactions, known, [], 'ko', metadata), items, interactions,
  });
  const fresh = getHomeBundleLearning('b1', state([sentence], [], null, [{ word_id: 11, correct_count: 10 }]), 's1');
  assert.equal(fresh.action, 'start-listening');
  assert.equal(fresh.href, '/bundles/b1/learn');
  assert.equal(fresh.completedWords, 0);
  assert.equal(fresh.knownWords, 1);
  assert.equal(fresh.hasListened, false);
  const listened = getHomeBundleLearning('b1', state([sentence], [{ bundle_item_id: 's1', metadata: null, play_count: 2 }]), null);
  assert.equal(listened.action, 'continue-listening');
  assert.equal(listened.href, '/bundles/b1/learn?item=s1');
  assert.equal(listened.totalPlays, 2);
  const completeSentence = [{ bundle_item_id: 's1', metadata: { practice_modes: { quiz: { correct_count: 1 }, scramble: { correct_count: 1 }, wordfill: { correct_count: 1 } } } }];
  const partial = getHomeBundleLearning('b1', state([sentence], completeSentence), null);
  assert.equal(partial.action, 'words');
  assert.equal(partial.href, '/bundles/b1/spelling');
  assert.equal(partial.sentenceCompleted, true);
  assert.equal(partial.modes[0].mode, 'spelling');
  assert.ok(partial.modes.some(mode => mode.mode === 'quiz' && mode.completed));
  const wordsOnly = getHomeBundleLearning('b2', state([{ id: 'w1', words: wordA }]), null);
  assert.equal(wordsOnly.action, 'words');
  assert.equal(wordsOnly.sentenceCount, 0);
  assert.equal(wordsOnly.totalWords, 1);
  assert.deepEqual(wordsOnly.modes.map(mode => mode.mode).sort(), ['spelling', 'word_flashcards', 'word_quiz']);
  const sentenceOnly = getHomeBundleLearning('b3', state([{ id: 's3', sentences: { sentence: 'adios', translation: '안녕' } }]), null);
  assert.deepEqual(sentenceOnly.modes.map(mode => mode.mode).sort(), ['flashcards', 'quiz', 'scramble']);
  const empty = getHomeBundleLearning('b4', state([]), null);
  assert.equal(empty.action, 'details');
  assert.equal(empty.modes.length, 0);
});

test('home cards render matching metrics, correct actions and actual content counts', () => {
  const React = nodeRequire('react');
  const { renderToStaticMarkup } = nodeRequire('react-dom/server');
  const ui = loadPracticeModules({
    'next/image': { default: () => null },
    'next/link': { default: ({ children, href, ...props }) => React.createElement('a', { ...props, href }, children) },
    './ProgressCards': { GoalCard: () => null },
    './StreakCard': { StreakCard: () => null },
    './ReviewNeededSection': { ReviewNeededSection: () => null },
  });
  const { ContinueLearningSection, QuickPracticeSection, ExploreBundlesSection } = ui('app/learn/_components/LoggedInLearnPage');
  const { ActiveBundlesSection } = ui('app/learn/_components/ActiveBundlesSection');
  const { RecentBundleCard } = ui('app/learn/progress/RecentBundleCard');
  const { getHomeBundleLearning } = load('lib/practice/bundle-home');
  const { calculateBundleCompletion } = load('lib/practice/bundle-completion');
  const items = [sentence];
  const interactions = [{ bundle_item_id: 's1', metadata: { practice_modes: { quiz: { correct_count: 1 }, scramble: { correct_count: 1 }, wordfill: { correct_count: 1 } } } }];
  const completion = calculateBundleCompletion(items, interactions, [{ word_id: 11, correct_count: 5 }], [], 'ko', { completed_word_ids: [11] });
  const learning = getHomeBundleLearning('b1', { ...completion, items, interactions }, null);
  const bundle = { id: 'b1', title: 'Test bundle', level: 1 };
  const recentBundle = { bundle, learning, interaction: { id: 'i1', last_studied_at: null }, currentItem: null };
  for (const Component of [ContinueLearningSection, ActiveBundlesSection, RecentBundleCard]) {
    const html = renderToStaticMarkup(React.createElement(Component, { recentBundle, item: recentBundle, bundles: [recentBundle], language: 'ko' }));
    assert.ok(html.includes('문장 완료'));
    assert.ok(html.includes('문장 스타'));
    assert.ok(html.includes('단어 완료'));
    assert.ok(html.includes('누적 청취 0회'));
    assert.ok(!html.includes('전체 진행률'));
    assert.ok(!html.includes('Overall progress'));
    assert.ok(!html.includes('width:75%'));
    assert.ok(html.includes('이전에 학습한 단어 1개 포함'));
    assert.ok(html.includes('href="/bundles/b1/spelling"'));
    assert.ok(html.includes('href="/bundles/b1"'));
    assert.ok(!html.includes('이어서 듣기'));
  }
  const quick = renderToStaticMarkup(React.createElement(QuickPracticeSection, { recentBundle, language: 'ko' }));
  assert.ok(quick.indexOf('/spelling') < quick.indexOf('/quiz'));
  assert.ok(quick.includes('복습하기'));
  const explore = renderToStaticMarkup(React.createElement(ExploreBundlesSection, { bundles: [{ ...bundle, sentence_count: 1, study_words_count: 2, bundle_items: [{ count: 99 }] }], language: 'ko' }));
  assert.ok(explore.includes('문장 1개 · 단어 2개'));
  assert.ok(!explore.includes('99개 문장'));
});

test('home recommendations report sentence and eligible unique word counts', async () => {
  const { db } = serviceFixture();
  db.tables.bundle = [{ id: 'b1', title: 'Mixed', is_published: true }];
  const services = loadPracticeModules({
    '../admin': { createAdminClient: () => db },
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/tts': {}, './storage': {},
  })('lib/supabase/services/bundles');
  const recommended = await services.getRecommendedUnstudiedBundles('u1', 3, 'ko');
  assert.equal(recommended.length, 1);
  // The fixture contains one sentence and a directly included word that also
  // occurs in the sentence. It is not a second sentence or a third study word.
  assert.equal(recommended[0].sentence_count, 1);
  assert.equal(recommended[0].study_words_count, 2);
  db.tables.bundle_words.push({ bundle_id: 'b1', word_id: 12 });
  const selected = await services.getRecommendedUnstudiedBundles('u1', 3, 'en');
  assert.equal(selected[0].sentence_count, 1);
  assert.equal(selected[0].study_words_count, 1);
  // Legacy shared-word completion alone is not evidence of studying this bundle.
  db.tables.user_bundle_interactions.push({ user_id: 'u1', bundle_id: 'b1', is_completed: true, progress_ratio: 1, is_started: false });
  assert.equal((await services.getRecommendedUnstudiedBundles('u1')).length, 1);
  db.tables.user_bundle_interactions[0].is_started = true;
  assert.equal((await services.getRecommendedUnstudiedBundles('u1')).length, 0);
});


test('review selection preserves priority before shuffling and validates mode eligibility', () => {
  const { selectReviewItems, sentenceReviewItems, defaultSentenceReviewMode, reviewPriority, compareReviewPriority, parseReviewSettings } = load('lib/learning/review-session');
  const pool = Array.from({ length: 50 }, (_, i) => i);
  for (const count of [0,1,9,10,40,41]) assert.deepEqual(selectReviewItems(pool, count).sort((a,b)=>a-b), pool.slice(0,Math.min(count,40)));
  assert.equal(selectReviewItems(pool, 'all').length, 40);
  const a = { id:1, sentence:'hola amigo', translation:'안녕', word_maps:[] };
  const b = { ...a, id:2, translation:'친구' };
  assert.equal(defaultSentenceReviewMode([a], 'ko'), 'scramble');
  assert.equal(defaultSentenceReviewMode([a,{...b,translation:'안녕'}], 'ko'), 'scramble');
  assert.equal(defaultSentenceReviewMode([a,b], 'ko'), 'quiz');
  assert.equal(sentenceReviewItems([a], 'wordfill', 'ko').length, 0);
  const valid = {...a,word_maps:[{word_id:11,used_as:'hola',words:wordA}]};
  assert.equal(sentenceReviewItems([valid], 'wordfill', 'ko').length, 1);
  assert.equal(sentenceReviewItems([{...valid,sentence:'adios'}], 'wordfill', 'ko').length, 0);
  assert.ok(compareReviewPriority(reviewPriority({proficiency_level:1,last_reviewed_at:'2020-01-01'}),reviewPriority({proficiency_level:1,last_reviewed_at:'2021-01-01'}))<0);
  assert.equal(parseReviewSettings({mode:'bad',count:'99999',start:'true'},'words').autoStart,false);
  assert.deepEqual(parseReviewSettings({mode:'spelling',count:'20',start:'1'},'words'),{mode:'spelling',count:20,autoStart:true});
});

test('review recommendation uses the same due priority as the session instead of the largest backlog', () => {
  const { getReviewPlan } = load('lib/learning/review-recommendation');
  const summary={availableTotal:101,availableWords:100,availableSentences:1,lowestWordLevel:1,lowestSentenceLevel:2,
    firstWord:{dueAt:'2026-10-24',incorrect:false,level:1},firstSentence:{dueAt:'2026-10-23',incorrect:true,level:2}};
  assert.deepEqual(getReviewPlan(summary),{type:'sentences',count:1,reason:'incorrect'});
  assert.equal(getReviewPlan({...summary,availableTotal:0}),null);
});

test('review answers validate mode and retain proficiency and metadata semantics', () => {
  const { validReviewResult, nextReviewProficiency }=load('lib/learning/review-result');
  const payload={sessionId:'10000000-0000-4000-8000-000000000001',attemptId:'20000000-0000-4000-8000-000000000001',type:'words',targetId:'11',mode:'word_quiz',correct:true};
  assert.equal(validReviewResult(payload),true);
  for (const targetId of ['01', '1.0', ' 1', '1e2', '0', '-1']) assert.equal(validReviewResult({...payload,targetId}),false);
  assert.equal(validReviewResult({...payload,mode:'flashcards'}),false);
  assert.equal(validReviewResult({...payload,correct:'true'}),false);
  assert.equal(validReviewResult({...payload,wordId:11}),false);
  const before={proficiency_level:2,streak_count:2,correct_count:3,metadata:{unrelated:'keep'}};
  const correct=nextReviewProficiency(before,'word_quiz',true,'2026-10-24T00:00:00Z');
  assert.equal(correct.proficiency_level,2); assert.equal(correct.streak_count,3); assert.equal(correct.metadata.unrelated,'keep');
  const wrong=nextReviewProficiency(before,'word_quiz',false,'2026-10-24T00:00:00Z');
  assert.equal(wrong.proficiency_level,1); assert.equal(wrong.streak_count,0); assert.equal(wrong.metadata.last_practice_is_correct,false);
});
