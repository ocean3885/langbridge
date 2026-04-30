import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { redirect, notFound } from 'next/navigation';
import { getWordWithSentences } from '@/lib/supabase/services/words';
import AdminSidebar from '../../AdminSidebar';
import { ArrowLeft, Volume2, BookOpen, Tag, Info, Layers, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import AudioButton from '@/components/AudioButton';

const POS_MAP: Record<string, string> = {
  'noun': '명사',
  'verb': '동사',
  'adjective': '형용사',
  'adverb': '부사',
  'pronoun': '대명사',
  'preposition': '전치사',
  'conjunction': '접속사',
  'interjection': '감탄사',
  'article': '관사',
  'determiner': '한정사',
  'numeral': '수사',
  'particle': '조사',
  'auxiliary': '조동사',
  'adj': '형용사',
  'adv': '부사',
  'n': '명사',
  'v': '동사',
  'prep': '전치사',
  'pron': '대명사',
  'conj': '접속사',
  'det': '한정사',
  'adp': '전치사',
  'aux': '조동사',
  'part': '조사',
  'propn': '고유명사',
};

function formatPOS(pos: string): string {
  return POS_MAP[pos.toLowerCase()] || pos;
}

const GRAMMAR_LABEL_MAP: Record<string, string> = {
  // Common Abbreviations
  'cond': '조건부',
  'futr': '미래',
  'impf': '불완료 과거',
  'perf': '현재 완료',
  'pres': '현재',
  'pret': '단순 과거',
  'subj': '접속법',

  // Short Person Formats (S1, P1, etc.)
  's1': '1인칭 단수 (Yo)',
  's2': '2인칭 단수 (Tú)',
  's3': '3인칭 단수 (Él/Ella)',
  'p1': '1인칭 복수 (Nosotros)',
  'p2': '2인칭 복수 (Vosotros)',
  'p3': '3인칭 복수 (Ellos/Ellas)',

  // Noun Declension Abbreviations
  'ms': '남성 단수',
  'mp': '남성 복수',
  'fs': '여성 단수',
  'fp': '여성 복수',
};

const TENSE_ORDER: Record<string, number> = {
  'pres': 1, 'present': 1, 'presente': 1,
  'pret': 2, 'preterite': 2, 'pretérito indefinido': 2,
  'futr': 3, 'future': 3, 'futuro': 3,
  'perf': 4, 'perfect': 4, 'present perfect': 4,
  'cond': 5, 'conditional': 5, 'condicional': 5,
  'impf': 6, 'imperfect': 6, 'pretérito imperfecto': 6,
};

const PERSON_ORDER: Record<string, number> = {
  's1': 1, 's2': 2, 's3': 3,
  'p1': 4, 'p2': 5, 'p3': 6,
  '1s': 1, '2s': 2, '3s': 3,
  '1p': 4, '2p': 5, '3p': 6,
};

function formatGrammarKey(key: string): string {
  const lowerKey = key.toLowerCase().trim();

  // 1. Direct match
  if (GRAMMAR_LABEL_MAP[lowerKey]) return GRAMMAR_LABEL_MAP[lowerKey];

  // 2. Partial match and replacement
  let formatted = lowerKey;

  // Sort keys by length descending to replace longer phrases (e.g. "pretérito imperfecto") before shorter ones ("imperfecto")
  const sortedKeys = Object.keys(GRAMMAR_LABEL_MAP).sort((a, b) => b.length - a.length);

  for (const k of sortedKeys) {
    if (formatted.includes(k)) {
      // Use split/join for safe global string replacement
      formatted = formatted.split(k).join(GRAMMAR_LABEL_MAP[k]);
    }
  }

  // Clean up any double spaces that might have been created
  formatted = formatted.replace(/\s+/g, ' ').trim();

  // 3. Fallback: If nothing was replaced, just capitalize first letter
  if (formatted === lowerKey) {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  return formatted;
}

function getMeaningDisplay(meaning: any): string {
  if (!meaning) return '-';
  if (typeof meaning === 'string') {
    try {
      const parsed = JSON.parse(meaning);
      return getMeaningDisplay(parsed);
    } catch (e) {
      return meaning;
    }
  }
  if (typeof meaning === 'object') {
    const val = meaning.ko || meaning.en || Object.values(meaning)[0];
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'string') return val;
  }
  return '-';
}

interface WordDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function highlightWord(sentence: string, wordToHighlight: string) {
  if (!wordToHighlight) return sentence;
  
  try {
    const parts = sentence.split(new RegExp(`(${wordToHighlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === wordToHighlight.toLowerCase() ? (
            <span key={i} className="text-blue-600 font-black underline decoration-2 underline-offset-4">{part}</span>
          ) : part
        )}
      </>
    );
  } catch (e) {
    return sentence;
  }
}

function getFullAudioUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'langbridge-audio';
  
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`;
}

export default async function WordDetailPage({ params }: WordDetailPageProps) {
  const { id } = await params;
  const user = await getAppUserFromServer();
  if (!user) redirect(`/auth/login?redirectTo=/admin/words/${id}`);

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!isAdminUser) redirect('/');

  const wordId = parseInt(id);
  if (isNaN(wordId)) notFound();

  const word = await getWordWithSentences(wordId);
  if (!word) notFound();

  const validDeclensions = Object.entries(word.declensions || {}).filter(([_, val]) => val !== null && val !== 'null' && val !== '');
  const hasDeclensions = validDeclensions.length > 0;
  
  const validConjugations = Object.entries(word.conjugations || {}).filter(([_, val]) => val !== null && val !== 'null' && val !== '');
  const hasConjugations = validConjugations.length > 0;

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 md:ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/words"
              className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              목록으로 돌아가기
            </Link>

            <div className="space-y-6">
              {/* 상단 라벨 및 메타 정보 */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {word.lang_code}
                  </span>
                  <div className="flex gap-1.5">
                    {word.pos.map((p: string, idx: number) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {formatPOS(p)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>ID: {word.id}</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span>등록일: {new Date(word.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              {/* 본문 영역 */}
              <div>
                <h1 className="text-5xl font-bold text-gray-900 tracking-tight flex items-baseline gap-4 leading-tight break-words">
                  {word.word}
                  {word.gender && (
                    <span className="text-2xl font-medium text-gray-400">({word.gender})</span>
                  )}
                </h1>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Basic Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Meaning Card */}
              <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  뜻과 의미
                </h2>

                <div className="space-y-6">
                  {Object.entries(word.meaning || {}).map(([lang, meanings]: [string, any]) => (
                    <div key={lang} className="border-b border-gray-50 last:border-0 pb-6 last:pb-0">
                      <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                        <Tag className="w-3 h-3" />
                        {lang === 'ko' ? '한국어' : lang === 'en' ? '영어' : lang}
                      </h3>
                      <ul className="space-y-2">
                        {Array.isArray(meanings) ? meanings.map((m: string, idx: number) => (
                          <li key={idx} className="text-lg text-gray-800 font-medium leading-relaxed">
                            {m}
                          </li>
                        )) : (
                          <li className="text-lg text-gray-800 font-medium">{meanings}</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Grammar Section (Declensions/Conjugations) */}
              {(hasDeclensions || hasConjugations) && (
                <div className={`grid grid-cols-1 ${hasDeclensions && hasConjugations ? 'md:grid-cols-2' : ''} gap-6`}>
                  {hasDeclensions && (
                    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-500" />
                        성·수 변화 (Gender & Number)
                      </h2>
                      <div className="space-y-3">
                        {validDeclensions.map(([key, val]: [string, any]) => (
                          <div key={key} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                            <span className="text-sm font-semibold text-gray-500">{formatGrammarKey(key)}</span>
                            <span className="text-sm font-bold text-gray-900">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {hasConjugations && (
                    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Info className="w-5 h-5 text-orange-500" />
                        동사 변화 (Conjugations)
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {validConjugations
                          .sort(([a], [b]) => {
                            const orderA = TENSE_ORDER[a.toLowerCase()] || 99;
                            const orderB = TENSE_ORDER[b.toLowerCase()] || 99;
                            return orderA - orderB;
                          })
                          .map(([key, val]: [string, any]) => (
                            <div key={key} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-100 transition-colors">
                            <h3 className="text-sm font-black text-orange-600 uppercase mb-3 pb-2 border-b border-orange-100 flex justify-between items-baseline">
                              {formatGrammarKey(key)}
                              <span className="text-[10px] text-gray-400 font-normal uppercase">{key}</span>
                            </h3>
                            {typeof val === 'object' && val !== null ? (
                              <div className="space-y-1.5">
                                {Object.entries(val)
                                  .sort(([a], [b]) => {
                                    const orderA = PERSON_ORDER[a.toLowerCase()] || 99;
                                    const orderB = PERSON_ORDER[b.toLowerCase()] || 99;
                                    return orderA - orderB;
                                  })
                                  .map(([subKey, subVal]: [string, any]) => (
                                    <div key={subKey} className="flex justify-between items-center py-1">
                                      <span className="text-[11px] font-bold text-gray-500">{formatGrammarKey(subKey)}</span>
                                      <span className="text-sm font-medium text-gray-900">{String(subVal)}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-sm font-bold text-gray-900">{String(val)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Sentences Section */}
              <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  관련 문장 ({word.sentences?.length || 0})
                </h2>

                {word.sentences && word.sentences.length > 0 ? (
                  <div className="space-y-4">
                    {word.sentences.map((s: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all duration-200 group relative">
                        <div className="flex justify-between items-start">
                          <Link href={`/admin/sentences/${s.id}`} className="flex-1 min-w-0">
                            <p className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 break-words">
                              {highlightWord(s.sentence, s.used_as || word.word)}
                            </p>
                            <p className="text-gray-600 break-words">{s.translation}</p>
                          </Link>
                          {s.audio_url && (
                            <div className="ml-4 flex-shrink-0 relative z-10">
                              <AudioButton fullSrc={getFullAudioUrl(s.audio_url)} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400">연결된 문장이 아직 없습니다.</p>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Audio & Quick Stats */}
            <div className="space-y-6">
              <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-lg p-8 text-white">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  발음 오디오
                </h2>

                {word.audio_url ? (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <audio key={word.audio_url} controls className="w-full" src={getFullAudioUrl(word.audio_url) || undefined}>
                      브라우저가 오디오 태그를 지원하지 않습니다.
                    </audio>
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                    <p className="text-blue-100">오디오 파일이 없습니다.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
