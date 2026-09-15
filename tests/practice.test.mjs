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
        const data = tables[table].filter(r => filters.every(f => f(r))).sort((a, b) => a.id.localeCompare(b.id)).slice(start, end + 1);
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

test('review scramble skip is unscored; reveal is wrong and shows neutral feedback', async () => {
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
    elements(tree).find(e => e.type === 'RevealActions').props.onSkip();
    tree = h.render();
    assert.equal(calls.length, 0);
    assert.equal(elements(tree).find(e => e.type === 'PracticeScorePills').props.incorrect, 0);
    elements(tree).find(e => e.type === 'RevealActions').props.onReveal();
    tree = h.render();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].is_correct, false);
    assert.ok(elements(tree).some(e => e.type === 'RevealedAnswer'));
    assert.equal(elements(tree).find(e => e.type === 'PracticeScorePills').props.incorrect, 1);
    elements(tree).find(e => e.type === 'button' && textOf(e) === 'Finish').props.onClick();
    const finished = textOf(h.render());
    assert.match(finished, /0 of 1/);
    assert.match(finished, /Skipped: 1/);
  } finally { globalThis.fetch = originalFetch; }
});
