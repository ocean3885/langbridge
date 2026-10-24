import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadModules } from './helpers/load-module.mjs';
import { PGlite } from '@electric-sql/pglite';

async function fixture() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE service_role;
    CREATE TABLE auth_users(id text PRIMARY KEY);
    CREATE TABLE words(id bigint PRIMARY KEY);
    CREATE TABLE sentences(id bigint PRIMARY KEY);
    CREATE TABLE bundle(id uuid PRIMARY KEY, is_published boolean DEFAULT true, access_level text DEFAULT 'free');
    CREATE TABLE bundle_items(id uuid PRIMARY KEY);
    INSERT INTO auth_users VALUES ('u1'),('u2'); INSERT INTO words VALUES (1),(2); INSERT INTO sentences VALUES(1);`);
  for (const name of ['20260508171300_add_user_sentence_interactions.sql','20260529143000_add_user_learning_interactions.sql',
    '20260603221706_add_interaction_pinning_and_metadata.sql','20260605120000_add_current_practice_items_to_bundle_interactions.sql','20260605130000_add_user_learning_daily_activity.sql',
    '20260605150000_add_user_learning_stats.sql','20260606100000_extend_user_learning_daily_activity.sql', '20261024090000_add_atomic_review_attempts.sql']) {
    await db.exec(fs.readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  await db.exec(`
    INSERT INTO user_word_interactions(user_id,word_id,correct_count,proficiency_level,streak_count,last_reviewed_at)
    VALUES ('u1',1,1,1,1,'2020-01-01');`);
  return db;
}
const payload = { attemptId:'10000000-0000-4000-8000-000000000001', sessionId:'20000000-0000-4000-8000-000000000001', type:'words', targetId:'1', mode:'word_quiz', correct:true };
async function snapshot(db) { return (await db.query(`SELECT to_jsonb(t) AS row FROM user_word_interactions t WHERE user_id='u1' AND word_id=1`)).rows[0].row; }
async function commit(db, p, changes, deltas = {}) {
  return (await db.query('SELECT commit_review_attempt($1,$2::jsonb,$3::jsonb,$4::jsonb) AS result', ['u1',JSON.stringify(p),JSON.stringify(changes),JSON.stringify(deltas)])).rows[0].result;
}

test('review transaction commits once, replays after lost response, and rejects conflicting attempts', async () => {
  const db = await fixture();
  try {
    const before = await snapshot(db);
    const change = { table:'user_word_interactions', key:'1', before, values:{ correct_count:2, proficiency_level:1, streak_count:2, last_reviewed_at:'2026-10-24T00:00:00Z' } };
    assert.deepEqual(await commit(db,payload,[change]), { saved:true,duplicate:false });
    assert.deepEqual(await commit(db,payload,[change]), { saved:true,duplicate:true });
    await assert.rejects(commit(db,{...payload,correct:false},[change]), /conflict/i);
    await assert.rejects(commit(db,{...payload,attemptId:'10000000-0000-4000-8000-000000000002'},[change]), /conflict/i);
    assert.equal((await snapshot(db)).correct_count,2);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM user_review_attempts')).rows[0].n,1);
    const stats = (await db.query("SELECT * FROM user_learning_stats WHERE user_id='u1'")).rows[0];
    assert.equal(stats.total_correct_count,1);
    const daily = (await db.query("SELECT * FROM user_learning_daily_activity WHERE user_id='u1'")).rows[0];
    assert.equal(daily.activity_count,1); assert.equal(daily.total_correct_count,1);
  } finally { await db.close(); }
});

test('review transaction rolls back all effects after a later change fails', async () => {
  const db = await fixture();
  try {
    const before = await snapshot(db);
    await assert.rejects(commit(db,payload,[
      {table:'user_word_interactions',key:'1',before,values:{correct_count:2}},
      {table:'user_word_interactions',key:'2',before:null,values:{proficiency_level:99}},
    ]));
    assert.equal((await snapshot(db)).correct_count,1);
    for (const table of ['user_review_attempts','user_learning_stats','user_learning_daily_activity']) {
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n,0);
    }
  } finally { await db.close(); }
});

test('stale snapshots cannot overwrite newer progress; separate users are isolated', async () => {
  const db = await fixture();
  try {
    const before = await snapshot(db);
    await db.exec("UPDATE user_word_interactions SET memo='concurrent edit' WHERE user_id='u1' AND word_id=1");
    await assert.rejects(commit(db,payload,[{table:'user_word_interactions',key:'1',before,values:{correct_count:2}}]), error => error.code==='40001');
    const fresh = await snapshot(db);
    await commit(db,payload,[{table:'user_word_interactions',key:'1',before:fresh,values:{correct_count:2}}]);
    assert.equal((await snapshot(db)).memo,'concurrent edit');
    assert.equal((await db.query("SELECT count(*)::int AS n FROM user_learning_stats WHERE user_id='u2'")).rows[0].n,0);
  } finally { await db.close(); }
});

test('concurrent duplicate submissions produce one committed assessment', async () => {
  const db = await fixture();
  try {
    const change = {table:'user_word_interactions',key:'1',before:await snapshot(db),values:{correct_count:2}};
    const results=await Promise.all([commit(db,payload,[change]),commit(db,payload,[change])]);
    assert.equal(results.filter(r=>r.duplicate).length,1);
    assert.equal((await snapshot(db)).correct_count,2);
  } finally { await db.close(); }
});


function databaseClient(db) {
  return { from(table) {
    const filters=[];
    const query={select(){return query;},eq(key,value){filters.push([key,value]);return query;},async maybeSingle(){
      try { const where=filters.map(([key],i)=>`"${key}"::text=$${i+1}`).join(' AND ');
        const rows=(await db.query(`SELECT to_jsonb(t) AS row FROM "${table}" t WHERE ${where}`,filters.map(([,value])=>String(value)))).rows;
        return {data:rows[0]?.row||null,error:null};
      } catch(error){return {data:null,error};}
    }};return query;
  },async rpc(name,args){try{return {data:(await db.query(`SELECT ${name}($1,$2::jsonb,$3::jsonb,$4::jsonb) AS result`,[args.p_user_id,JSON.stringify(args.p_payload),JSON.stringify(args.p_changes),JSON.stringify(args.p_deltas)])).rows[0].result,error:null};}catch(error){return {data:null,error};}}};
}

test('review service preserves bundle completion and Word Fill secondary effects in the real transaction', async () => {
  const db=await fixture();
  try {
    const bundleId='30000000-0000-4000-8000-000000000001', itemId='40000000-0000-4000-8000-000000000001';
    await db.query('INSERT INTO bundle(id) VALUES($1)',[bundleId]);
    await db.query('INSERT INTO bundle_items(id) VALUES($1)',[itemId]);
    await db.query("INSERT INTO user_bundle_interactions(user_id,bundle_id,is_started) VALUES('u1',$1,true)",[bundleId]);
    await db.exec("INSERT INTO user_sentence_interactions(user_id,sentence_id,proficiency_level,last_reviewed_at) VALUES('u1',1,1,'2020-01-01')");
    const items=[{id:itemId,sentence_id:1,sentences:{sentence:'hola amigo',translation:'안녕 친구',word_sentence_map:[{used_as:'hola',words:{id:1,word:'hola',meaning_ko:'안녕'}}]}}];
    const load=loadModules({'@/lib/supabase/admin':{createAdminClient:()=>databaseClient(db)},'@/lib/bundle-access':{getBundleAccess:async()=>({canView:true})},'./bundle-completion':{loadBundleCompletion:async()=>new Map([[bundleId,{items,interactions:(await db.query('SELECT to_jsonb(t) AS row FROM user_bundle_item_interactions t')).rows.map(r=>r.row),selectedWordIds:[1]}]])}});
    const {saveReviewResult}=load('lib/supabase/services/review-results');
    const result={...payload,type:'sentences',mode:'wordfill',bundleId,bundleItemId:itemId,wordId:1};
    await saveReviewResult({id:'u1'},result);
    await saveReviewResult({id:'u1'},result);
    const word=await snapshot(db);
    assert.equal(word.correct_count,2);assert.equal(word.metadata.standalone_correct_count,undefined);
    const bundle=(await db.query('SELECT * FROM user_bundle_interactions')).rows[0];
    assert.deepEqual(bundle.metadata.completed_word_ids,[1]);assert.equal(bundle.is_completed,false);
    assert.equal(Number(bundle.progress_ratio).toFixed(4),'0.6667');
    const stats=(await db.query('SELECT * FROM user_learning_stats')).rows[0];
    assert.equal(stats.total_correct_count,1);assert.equal(stats.earned_stars,1);assert.equal(stats.completed_sentences,1);
    assert.equal((await db.query('SELECT * FROM user_sentence_interactions')).rows[0].correct_count,1);
  } finally {await db.close();}
});

test('general word review updates shared knowledge once without completing bundles', async()=>{
 const db=await fixture();
 try {
   const {saveReviewResult}=loadModules({'@/lib/supabase/admin':{createAdminClient:()=>databaseClient(db)}})('lib/supabase/services/review-results');
   await saveReviewResult({id:'u1'},payload);
   await saveReviewResult({id:'u1'},payload);
   assert.equal((await snapshot(db)).correct_count,2);
   assert.equal((await snapshot(db)).metadata.standalone_correct_count,1);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM user_bundle_interactions')).rows[0].n,0);
   await assert.rejects(saveReviewResult({id:'u1'},{...payload,attemptId:'10000000-0000-4000-8000-000000000003',sessionId:'20000000-0000-4000-8000-000000000003'}),e=>e.status===409);
 } finally{await db.close();}
});


test('session telemetry is idempotent and counts only committed first assessments', async()=>{
 const db=await fixture();
 try {
  const event=ended=>db.query('SELECT record_review_session($1,$2,$3,$4,$5,$6)',['u1',payload.sessionId,'words','quiz',1,ended]);
  await event(false);await event(false);
  await commit(db,payload,[{table:'user_word_interactions',key:'1',before:await snapshot(db),values:{correct_count:2}}]);
  await event(true);await event(false);await event(true);
  const rows=(await db.query('SELECT * FROM user_review_sessions')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].assessed_count,1);assert.equal(rows[0].correct_count,1);assert.ok(rows[0].ended_at);
  await assert.rejects(db.query('SELECT record_review_session($1,$2,$3,$4,$5,$6)',['u1',payload.sessionId,'words','spelling',1,false]),e=>e.code==='23505');
 }finally{await db.close();}
});
