import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const testDirectory = fileURLToPath(new URL('.', import.meta.url));

function loadTestModules(mocks = {}) {
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

test('leaderboard aggregates daily activities and ranks by stars properly', async () => {
  const mockDailyRows = [
    {
      user_id: 'user-1',
      activity_date: '2026-06-01',
      earned_stars: 10,
      completed_sentences: 5,
      mastered_sentences: 2,
      practiced_words: 15,
      mastered_words: 3,
      total_correct_count: 20,
      total_incorrect_count: 2,
      study_seconds: 300,
    },
    {
      user_id: 'user-1',
      activity_date: '2026-06-02',
      earned_stars: 15,
      completed_sentences: 8,
      mastered_sentences: 3,
      practiced_words: 20,
      mastered_words: 4,
      total_correct_count: 25,
      total_incorrect_count: 1,
      study_seconds: 400,
    },
    {
      user_id: 'user-2',
      activity_date: '2026-06-02',
      earned_stars: 30,
      completed_sentences: 12,
      mastered_sentences: 1,
      practiced_words: 30,
      mastered_words: 2,
      total_correct_count: 40,
      total_incorrect_count: 5,
      study_seconds: 500,
    },
  ];

  const mockProfiles = [
    { id: 'user-1', email: 'alice@example.com' },
    { id: 'user-2', email: 'bob@example.com' },
  ];

  const mockSupabase = {
    from: (table) => {
      if (table === 'user_learning_daily_activity') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => ({
                in: () => Promise.resolve({ data: mockDailyRows, error: null }),
                data: mockDailyRows,
                error: null,
              }),
              data: mockDailyRows,
              error: null,
            }),
            data: mockDailyRows,
            error: null,
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: (field, ids) => Promise.resolve({
              data: mockProfiles.filter(p => ids.includes(p.id)),
              error: null,
            }),
          }),
        };
      }
      return {};
    },
  };

  const load = loadTestModules({
    '@/lib/supabase/admin': {
      createAdminClient: () => mockSupabase,
    },
  });

  const { getLeaderboard } = load('lib/supabase/services/leaderboard');
  const result = await getLeaderboard({
    period: 'all',
    metric: 'stars',
    currentUserId: 'user-1',
  });

  assert.equal(result.entries.length, 2);
  // user-2 has 30 stars, user-1 has 10 + 15 = 25 stars
  assert.equal(result.entries[0].userId, 'user-2');
  assert.equal(result.entries[0].score, 30);
  assert.equal(result.entries[0].rank, 1);

  assert.equal(result.entries[1].userId, 'user-1');
  assert.equal(result.entries[1].score, 25);
  assert.equal(result.entries[1].rank, 2);
  assert.equal(result.entries[1].isCurrentUser, true);

  assert.equal(result.currentUserRank?.rank, 2);
});

test('leaderboard switches metric to mastered sentences correctly', async () => {
  const mockDailyRows = [
    {
      user_id: 'user-1',
      activity_date: '2026-06-01',
      earned_stars: 10,
      completed_sentences: 5,
      mastered_sentences: 5, // user 1 has 5 mastered
      practiced_words: 10,
      mastered_words: 1,
      total_correct_count: 10,
      study_seconds: 100,
    },
    {
      user_id: 'user-2',
      activity_date: '2026-06-01',
      earned_stars: 50,
      completed_sentences: 20,
      mastered_sentences: 2, // user 2 has 2 mastered
      practiced_words: 50,
      mastered_words: 2,
      total_correct_count: 50,
      study_seconds: 100,
    },
  ];

  const mockSupabase = {
    from: (table) => {
      if (table === 'user_learning_daily_activity') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: mockDailyRows, error: null }),
            }),
            data: mockDailyRows,
            error: null,
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {};
    },
  };

  const load = loadTestModules({
    '@/lib/supabase/admin': {
      createAdminClient: () => mockSupabase,
    },
  });

  const { getLeaderboard } = load('lib/supabase/services/leaderboard');
  const result = await getLeaderboard({
    period: 'all',
    metric: 'sentences',
    currentUserId: 'user-2',
  });

  // user-1 has 5 mastered sentences, rank 1. user-2 has 2 mastered sentences, rank 2.
  assert.equal(result.entries[0].userId, 'user-1');
  assert.equal(result.entries[0].score, 5);
  assert.equal(result.entries[1].userId, 'user-2');
  assert.equal(result.entries[1].score, 2);
  assert.equal(result.currentUserRank?.rank, 2);
});
