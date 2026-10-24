// Real browser checks of the production components, with only network/auth and
// Next navigation replaced. No live user data or database is accessed.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const dir=await mkdtemp(path.join(tmpdir(),'langbridge-review-browser-'));
const mocks={
  'next/link': `import React from 'react'; export default function Link({prefetch,children,...props}) { return <a {...props}>{children}</a> }`,
  'next/image': `import React from 'react'; export default function Image({fill,priority,quality,unoptimized,...props}) { return <img {...props}/> }`,
  '@/lib/auth/app-user': `export async function getAppUserFromServer(){return {id:'fixture'}}; export async function getDisplayLanguage(){return 'ko'}`,
  '@/lib/supabase/services/learning-review': `export async function getReviewNeededSummary(){return {availableTotal:32,availableWords:24,availableSentences:8,lowestWordLevel:1,lowestSentenceLevel:1,firstWord:{dueAt:'2026-10-23',incorrect:true,level:1},firstSentence:{dueAt:'2026-10-24',incorrect:false,level:1},nextReviewAt:null}}; export async function getReviewSentences(){return []}`,
  'next/navigation': `export function redirect(){ throw Error('Unexpected redirect') }`,
};
await build({stdin:{contents:`import React,{StrictMode} from 'react';import {createRoot} from 'react-dom/client';
import ReviewSessionClient from './app/learn/review/_components/ReviewSessionClient';
import ReviewPage from './app/learn/review/page';
const p=new URLSearchParams(location.search),type=p.get('type')||(location.pathname.endsWith('/sentences')?'sentences':'words');
const items=type==='words'?[{id:1,word:'hola',meaning_ko:'안녕',meaning_en:'hello',audio_url:null,proficiency_level:1,incorrect_count:0,streak_count:1,pos:[],lang_code:'es'}]:[{id:1,sentence:'Hola amigo',translation:'안녕 친구',translation_en:'Hello friend',audio_url:null,proficiency_level:1,incorrect_count:0,streak_count:1,bundle_id:'30000000-0000-4000-8000-000000000001',bundle_item_id:'40000000-0000-4000-8000-000000000001',word_maps:[]}];
const el=p.has('home')?await ReviewPage():<ReviewSessionClient type={type} returnTo={p.get('returnTo')||undefined} items={items} availableCount={1} language={p.get('lang')||'ko'} settings={{mode:p.get('mode')||'quiz',count:10,autoStart:p.get('start')==='1'}}/>;
createRoot(document.getElementById('root')).render(<StrictMode>{el}</StrictMode>);`,resolveDir:root,loader:'tsx'},bundle:true,format:'esm',outfile:path.join(dir,'app.js'),jsx:'automatic',define:{'process.env.NODE_ENV':'"development"','process.env.NEXT_PUBLIC_SUPABASE_URL':'""','process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':'""'},plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/.*/},args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));}}]});
await writeFile(path.join(dir,'input.css'),await readFile(path.join(root,'app/globals.css')));
execFileSync(path.join(root,'node_modules/.bin/tailwindcss'),['-c',path.join(root,'tailwind.config.ts'),'-i',path.join(dir,'input.css'),'-o',path.join(dir,'style.css')],{stdio:'pipe'});
let fontCss='';
const fontRoot=path.join(root,'.next/dev/static');
try {
 for(const file of await readdir(path.join(fontRoot,'chunks'))) if(file.includes('internal_font_google') && file.endsWith('.single.css')) fontCss+=await readFile(path.join(fontRoot,'chunks',file),'utf8');
 fontCss=fontCss.replaceAll('../media/','/media/');
} catch { console.log('Cached application fonts unavailable; using browser fallback fonts.'); }
await writeFile(path.join(dir,'style.css'),(await readFile(path.join(dir,'style.css'),'utf8'))+fontCss+'\nbody { --font-inter: Inter; --font-noto: "Noto Sans KR"; font-family: Inter, "Noto Sans KR", sans-serif; }');
const server=createServer(async(req,res)=>{
  if(req.url?.startsWith('/media/')){res.setHeader('Content-Type','font/woff2');res.end(await readFile(path.join(fontRoot,'media',path.basename(req.url))));return;}
  if(req.url?.startsWith('/app.js')){res.setHeader('Content-Type','text/javascript');res.end(await readFile(path.join(dir,'app.js')));return;}
  if(req.url?.startsWith('/style.css')){res.setHeader('Content-Type','text/css');res.end(await readFile(path.join(dir,'style.css')));return;}
  res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 let requests=[]; let failFirst=false;
 await page.route('**/api/review/sessions',route=>route.fulfill({json:{saved:true}}));
 await page.route('**/api/review/results',async route=>{requests.push(route.request().postDataJSON());if(failFirst){failFirst=false;return route.fulfill({status:503,json:{error:'temporary'}});}await route.fulfill({json:{saved:true}});});
 await page.route('**/api/review/summary',route=>route.fulfill({json:{availableTotal:2,availableWords:1,availableSentences:1,nextReviewAt:null}}));
 for(const width of [320,375,768,1024,1280]){
  await page.setViewportSize({width,height:900});await page.goto(`${base}/?home=1`);await page.getByRole('heading',{name:'복습',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`home overflow at ${width}`);
  await page.screenshot({path:path.join(dir,`review-home-${width}.png`),fullPage:true});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`dark home overflow at ${width}`);
  await page.goto(`${base}/?lang=en`);await page.getByRole('heading',{name:'Word review',exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`setup overflow at ${width}`);
 }
 // Auto-start under StrictMode; failed save retries the identical attempt.
 await page.goto(`${base}/?start=1&returnTo=/learn/progress/words`);await page.getByRole('button',{name:'안녕',exact:true}).waitFor();
 failFirst=true; await page.getByRole('button',{name:'안녕',exact:true}).click();await page.getByRole('button',{name:'저장 다시 시도'}).waitFor();
 await page.getByRole('button',{name:'저장 다시 시도'}).click();await page.waitForFunction(()=>!document.body.textContent.includes('저장 다시 시도'));
 assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);
 await page.getByRole('button',{name:'세션 마치기',exact:true}).click();await page.getByRole('link',{name:'문장 복습',exact:true}).waitFor();
 assert.ok((await page.locator('body').textContent()).includes('첫 시도: 1개 중 1개 정답'));
 assert.equal(await page.getByRole('link',{name:'학습 현황으로',exact:true}).getAttribute('href'),'/learn/progress/words');
 assert.ok((await page.getByRole('link',{name:'다음 1개',exact:true}).getAttribute('href')).includes('returnTo=%2Flearn%2Fprogress%2Fwords'));
 await page.getByRole('link',{name:'문장 복습',exact:true}).click();await page.getByRole('button',{name:'세션 마치기',exact:true}).waitFor();
 assert.ok(page.url().includes('/sentences'));
 // An incorrect self-assessment can be rehearsed without a second saved answer.
 await page.goto(`${base}/?mode=flashcard&start=1`);
 await page.getByRole('button',{name:/hola.*es/}).click();
 await page.getByRole('button',{name:'아직 잘 몰라요',exact:true}).click();
 await page.getByRole('button',{name:'세션 마치기',exact:true}).click();
 await page.getByRole('button',{name:'틀린 항목 다시 보기',exact:true}).waitFor();
 const beforeRehearsal=requests.length;
 await page.getByRole('button',{name:'틀린 항목 다시 보기',exact:true}).click();
 await page.getByRole('button',{name:/hola.*es/}).click();
 await page.getByRole('button',{name:'알고 있어요',exact:true}).click();
 await page.getByRole('button',{name:'세션 마치기',exact:true}).click();
 assert.equal(requests.length,beforeRehearsal);
 // Read-only sentence cards never post an assessment.
 const saved=requests.length;await page.goto(`${base}/?type=sentences&mode=flashcards&start=1`);await page.getByRole('button',{name:'세션 마치기',exact:true}).click();
 await page.getByRole('heading',{name:'이번 세션 결과'}).waitFor();assert.equal(requests.length,saved);
 // Single sentence cannot become a quiz containing only the answer.
 await page.goto(`${base}/?type=sentences`);await page.getByRole('heading',{name:'문장 복습',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'문장 퀴즈',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'단어 채우기',exact:true}).isDisabled(),true);
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(dir,'review-setup.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log(`Review browser checks passed. Screenshot: ${dir}/review-setup.png`);
} finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
