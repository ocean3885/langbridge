import { getAppUserFromServer } from '@/lib/auth/app-user';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { redirect, notFound } from 'next/navigation';
import { getSentenceWithWords } from '@/lib/supabase/services/sentences';
import AdminSidebar from '../../AdminSidebar';
import { ArrowLeft, Volume2, MessageSquare, Tag, BookOpen } from 'lucide-react';
import Link from 'next/link';

function getFullAudioUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'langbridge';
  
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`;
}

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

interface SentenceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SentenceDetailPage({ params }: SentenceDetailPageProps) {
  const { id } = await params;
  const user = await getAppUserFromServer();
  if (!user) redirect(`/auth/login?redirectTo=/admin/sentences/${id}`);

  const isAdminUser = await isSuperAdmin({ userId: user.id, email: user.email ?? null });
  if (!isAdminUser) redirect('/');

  const sentenceId = parseInt(id);
  if (isNaN(sentenceId)) notFound();

  const sentenceData = await getSentenceWithWords(sentenceId);
  if (!sentenceData) notFound();

  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <div className="min-h-screen bg-gray-50 md:ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/sentences"
              className="inline-flex items-center text-sm text-gray-500 hover:text-green-600 transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              목록으로 돌아가기
            </Link>

            <div className="space-y-6">
              {/* 상단 라벨 및 메타 정보 */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    문장
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>ID: {sentenceData.id}</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span>등록일: {new Date(sentenceData.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              {/* 본문 영역 */}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3 leading-tight break-words">
                  {sentenceData.sentence}
                </h1>
                <p className="text-xl text-gray-600 font-medium mb-6 leading-relaxed break-words">
                  {sentenceData.translation}
                </p>

                {/* Compact Audio Player */}
                {sentenceData.audio_url ? (
                  <div className="w-full max-w-sm">
                    <audio key={sentenceData.audio_url} controls className="h-10 w-full" src={getFullAudioUrl(sentenceData.audio_url) || undefined}>
                      브라우저가 오디오 태그를 지원하지 않습니다.
                    </audio>
                  </div>
                ) : (
                  <div className="inline-block px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm border border-gray-200">
                    오디오 파일 없음
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                포함된 단어 ({sentenceData.words?.length || 0})
              </h2>

              {sentenceData.words && sentenceData.words.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentenceData.words.map((w: any, idx: number) => (
                    <Link href={`/admin/words/${w.id}`} key={idx} className="block h-full">
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors group h-full flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {w.word}
                            </p>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {(w.pos || []).map((p: string, i: number) => (
                                <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                                  {formatPOS(p)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 font-medium bg-white px-2.5 py-1 rounded-md border border-gray-100 shadow-sm whitespace-nowrap ml-2">
                            형태: <span className="text-gray-900">{w.used_as || w.word}</span>
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mt-auto">
                          {getMeaningDisplay(w.meaning)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400">연결된 단어가 아직 없습니다.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
