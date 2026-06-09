'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Volume2, MessageSquare, Tag, BookOpen, 
  Edit2, Trash2, Save, X, Loader2, Layout 
} from 'lucide-react';
import { updateSentence, deleteSentence, regenerateSentenceTTS, disconnectWordFromSentence } from '@/lib/supabase/services/sentences';
import { getBundleLevelDisplay } from '@/lib/bundle-level';
import { generateTTS } from '@/lib/tts';
import WordExtractor from './WordExtractor';
import JSONWordImporter from './JSONWordImporter';
import TTSRegenerator from '@/components/admin/TTSRegenerator';
import { ACTIVE_LANGUAGE, formatDate } from '@/lib/utils';

const POS_MAP: Record<string, string> = {
  'noun': '명사', 'verb': '동사', 'adjective': '형용사', 'adverb': '부사',
  'pronoun': '대명사', 'preposition': '전치사', 'conjunction': '접속사',
  'interjection': '감탄사', 'article': '관사', 'determiner': '한정사',
  'numeral': '수사', 'particle': '조사', 'auxiliary': '조동사',
  'adj': '형용사', 'adv': '부사', 'n': '명사', 'v': '동사',
  'prep': '전치사', 'pron': '대명사', 'conj': '접속사', 'det': '한정사',
  'adp': '전치사', 'aux': '조동사', 'part': '조사', 'propn': '고유명사',
};

function formatPOS(pos: string): string {
  return POS_MAP[pos.toLowerCase()] || pos;
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

function getFullAudioUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = 'langbridge';
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`;
}

export default function SentenceDetailContent({ 
  sentence: initialSentence, 
  relatedBundles 
}: { 
  sentence: any; 
  relatedBundles: any[] 
}) {
  const router = useRouter();
  const [sentence, setSentence] = useState(initialSentence);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [editForm, setEditForm] = useState({
    sentence: initialSentence.sentence,
    translation: initialSentence.translation,
    translation_en: initialSentence.translation_en || ''
  });

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await updateSentence(sentence.id, editForm);
      setSentence({ ...sentence, ...editForm });
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || '수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateTTS = async (options: {
    provider: 'google' | 'elevenlabs';
    model: string;
    voice: string;
    speed: number;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  }) => {
    if (!confirm('새로운 TTS 음성을 생성하시겠습니까? 기존 파일은 삭제됩니다.')) return;
    
    setIsGenerating(true);
    try {
      const newAudioUrl = await regenerateSentenceTTS(sentence.id, editForm.sentence, options);
      
      setSentence({ ...sentence, audio_url: newAudioUrl });
      alert('음성이 성공적으로 재생성되었습니다.');
      router.refresh();
    } catch (err: any) {
      alert(err.message || '음성 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 이 문장을 삭제하시겠습니까? 연결된 번들 아이템에서도 제거됩니다.')) return;
    setIsDeleting(true);
    try {
      await deleteSentence(sentence.id);
      router.push('/admin/sentences');
      router.refresh();
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

  const handleDisconnectWord = async (wordId: number, wordText: string) => {
    if (!confirm(`정말 이 문장에서 단어 '${wordText}'의 연결을 끊으시겠습니까?`)) return;
    try {
      await disconnectWordFromSentence(sentence.id, wordId);
      setSentence({
        ...sentence,
        words: (sentence.words || []).filter((w: any) => w.id !== wordId)
      });
      router.refresh();
    } catch (err: any) {
      alert(err.message || '연결 해제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <Link
          href="/admin/sentences"
          className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          목록으로 돌아가기
        </Link>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm'}`}
          >
            {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
          </button>
          <button 
            disabled={isDeleting}
            onClick={handleDelete}
            className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all shadow-sm shadow-red-100 dark:shadow-none disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Main Content Card */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  문장 상세 정보
                </span>
                {sentence.audio_url && (
                  <button 
                    onClick={() => new Audio(getFullAudioUrl(sentence.audio_url)!).play()}
                    className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-90"
                    title="음성 재생"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 font-medium">
                <span>ID: {sentence.id}</span>
                <span className="w-px h-3 bg-gray-100 dark:bg-gray-800" />
                <span>등록일: {formatDate(sentence.created_at)}</span>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">스페인어 문장</label>
                  <input 
                    type="text"
                    value={editForm.sentence}
                    onChange={(e) => setEditForm({...editForm, sentence: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all font-bold text-xl text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">한국어 해석</label>
                  <input 
                    type="text"
                    value={editForm.translation}
                    onChange={(e) => setEditForm({...editForm, translation: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">영어 해석</label>
                  <input 
                    type="text"
                    value={editForm.translation_en}
                    onChange={(e) => setEditForm({...editForm, translation_en: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none transition-all font-serif text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-50 dark:border-gray-800 mt-4">
                  <TTSRegenerator 
                    text={editForm.sentence}
                    onGenerate={handleRegenerateTTS}
                    isGenerating={isGenerating}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                      취소
                    </button>
                    <button 
                      disabled={isLoading}
                      onClick={handleUpdate}
                      className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      저장하기
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 leading-tight">{sentence.sentence}</h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 font-medium mb-1">{sentence.translation}</p>
                  {sentence.translation_en && (
                    <p className="text-lg text-blue-500/60 dark:text-blue-400/60 font-medium italic">{sentence.translation_en}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Word List Section */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            포함된 단어 ({sentence.words?.length || 0})
          </h2>

          {sentence.words && sentence.words.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {sentence.words.map((w: any, idx: number) => (
                <div key={idx} className="relative group/card">
                  <Link href={`/admin/words/${w.id}`} className="block">
                    <div className="p-5 pr-12 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900 transition-all group flex flex-col h-full shadow-sm hover:shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {w.word}
                          </p>
                          <div className="flex gap-1">
                            {(w.pos || []).map((p: string, i: number) => (
                              <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                {formatPOS(p)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">{getMeaningDisplay(w.meaning_ko)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">{getMeaningDisplay(w.meaning_en)}</p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDisconnectWord(w.id, w.word);
                    }}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all opacity-0 group-hover/card:opacity-100 focus:opacity-100"
                    title="단어 연결 끊기"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 mb-8">
              <p className="text-gray-400 dark:text-gray-500 font-medium">연결된 단어가 없습니다.</p>
            </div>
          )}

          <WordExtractor 
            sentenceId={sentence.id} 
            sentenceText={sentence.sentence} 
            langCode={sentence.lang_code || ACTIVE_LANGUAGE} 
          />

          <JSONWordImporter 
            sentenceId={sentence.id}
            langCode={sentence.lang_code || ACTIVE_LANGUAGE}
          />
        </section>

        {/* Related Bundles Section */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Layout className="w-5 h-5 text-amber-500" />
            연결된 번들 ({relatedBundles.length})
          </h2>

          {relatedBundles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedBundles.map((b: any) => (
                <Link href={`/admin/bundles/${b.id}`} key={b.id} className="group">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 group-hover:border-amber-200 dark:group-hover:border-amber-900 transition-all shadow-sm group-hover:shadow-md">
                    <div className="w-16 aspect-video rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {b.thumbnail_url ? (
                        <img src={b.thumbnail_url} alt={b.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-100 text-amber-600">
                          <Layout className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{b.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">{getBundleLevelDisplay(b.level, 'ko').shortLabel}</span>
                        {b.bundle_category && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">| {b.bundle_category.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-400 dark:text-gray-500 font-medium">이 문장이 포함된 번들이 없습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
