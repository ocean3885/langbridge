'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Info, Layers, MessageSquare, Pencil, Trash2, X, Save, Loader2, Zap, Volume2, RotateCw, Copy, Check } from 'lucide-react';
import AudioButton from '@/components/AudioButton';

const POS_MAP: Record<string, string> = {
  'noun': '명사', 'verb': '동사', 'adjective': '형용사', 'adverb': '부사',
  'pronoun': '대명사', 'preposition': '전치사', 'conjunction': '접속사',
  'interjection': '감탄사', 'article': '관사', 'determiner': '한정사',
  'numeral': '수사', 'particle': '조사', 'auxiliary': '조동사',
  'adj': '형용사', 'adv': '부사', 'n': '명사', 'v': '동사',
  'prep': '전치사', 'pron': '대명사', 'conj': '접속사',
  'det': '한정사', 'adp': '전치사', 'aux': '조동사',
  'part': '조사', 'propn': '고유명사', 'num': '수사',
};

const POS_CANONICAL_MAP: Record<string, string> = {
  adjective: 'adj',
  adjetivo: 'adj',
  adverb: 'adv',
  adverbio: 'adv',
  article: 'det',
  conjunction: 'conj',
  determiner: 'det',
  interjection: 'interj',
  n: 'noun',
  nombre: 'noun',
  numeral: 'num',
  particle: 'part',
  preposition: 'prep',
  pronoun: 'pron',
  sustantivo: 'noun',
  v: 'verb',
  verbo: 'verb',
};

function formatPOS(pos: string): string {
  return POS_MAP[pos.toLowerCase()] || pos;
}

function formatGender(gender: string | null | undefined) {
  const normalized = String(gender || '').toLowerCase().trim();
  return GENDER_OPTIONS.find(option => option.value === normalized)?.label || gender || '';
}

function normalizePosKey(pos: string) {
  const key = String(pos || '').toLowerCase().trim();
  return POS_CANONICAL_MAP[key] || key || 'general';
}

const GRAMMAR_LABEL_MAP: Record<string, string> = {
  'cond': '조건부', 'futr': '미래', 'impf': '불완료 과거',
  'perf': '현재 완료', 'pres': '현재', 'pret': '단순 과거', 'subj': '접속법',
  's1': 'Yo', 's2': 'Tú', 's3': 'Él/Ella', 'p1': 'Nosotros', 'p2': 'Vosotros', 'p3': 'Ellos/Ellas',
  'ms': '남성 단수', 'mp': '남성 복수', 'fs': '여성 단수', 'fp': '여성 복수',
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

const POS_OPTIONS = [
  { value: 'noun', label: '명사 (Noun)' },
  { value: 'verb', label: '동사 (Verb)' },
  { value: 'adjective', label: '형용사 (Adjective)' },
  { value: 'adverb', label: '부사 (Adverb)' },
  { value: 'pronoun', label: '대명사 (Pronoun)' },
  { value: 'preposition', label: '전치사 (Preposition)' },
  { value: 'conjunction', label: '접속사 (Conjunction)' },
  { value: 'article', label: '관사 (Article)' },
  { value: 'numeral', label: '수사 (Numeral)' },
  { value: 'particle', label: '조사 (Particle)' },
  { value: 'auxiliary', label: '조동사 (Auxiliary)' },
  { value: 'propn', label: '고유명사 (Proper Noun)' },
];

const GENDER_OPTIONS = [
  { value: '', label: '없음 (None)' },
  { value: 'm', label: '남성 (m)' },
  { value: 'f', label: '여성 (f)' },
  { value: 'mf', label: '남/여 공통 (mf)' },
];

type MeaningEditRow = {
  pos: string;
  koText: string;
  enText: string;
};

function formatGrammarKey(key: string): string {
  const lowerKey = key.toLowerCase().trim();
  if (GRAMMAR_LABEL_MAP[lowerKey]) return GRAMMAR_LABEL_MAP[lowerKey];
  let formatted = lowerKey;
  const sortedKeys = Object.keys(GRAMMAR_LABEL_MAP).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (formatted.includes(k)) {
      formatted = formatted.split(k).join(GRAMMAR_LABEL_MAP[k]);
    }
  }
  formatted = formatted.replace(/\s+/g, ' ').trim();
  if (formatted === lowerKey) return key.charAt(0).toUpperCase() + key.slice(1);
  return formatted;
}

function getMeaningDisplay(meaning: any): string {
  if (!meaning) return '-';
  if (typeof meaning === 'string') {
    try {
      const parsed = JSON.parse(meaning);
      return getMeaningDisplay(parsed);
    } catch (e) { return meaning; }
  }
  if (typeof meaning === 'object') {
    const val = meaning.ko || meaning.en || Object.values(meaning)[0];
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'string') return val;
  }
  return '-';
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
  } catch (e) { return sentence; }
}

function getFullAudioUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'holalingo';
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`;
}

function extractMeaningString(meaning: any): string {
  if (!meaning) return '';
  
  let data = meaning;
  if (typeof meaning === 'string') {
    try {
      data = JSON.parse(meaning);
    } catch (e) {
      return meaning;
    }
  }
  
  if (Array.isArray(data)) return data.join(', ');
  
  if (typeof data === 'object' && data !== null) {
    return Object.values(data)
      .map(val => Array.isArray(val) ? val.join(', ') : String(val))
      .filter(val => val && val !== 'null')
      .join('; ');
  }
  
  return typeof data === 'string' ? data : '';
}

function parseMeaningData(meaning: any): Record<string, string[]> {
  if (!meaning) return {};

  let data = meaning;
  if (typeof meaning === 'string') {
    try {
      data = JSON.parse(meaning);
    } catch {
      return meaning.trim() ? { general: [meaning.trim()] } : {};
    }
  }

  if (Array.isArray(data)) {
    const values = data.map(value => String(value).trim()).filter(Boolean);
    return values.length > 0 ? { general: values } : {};
  }

  if (typeof data !== 'object' || data === null) {
    const value = String(data).trim();
    return value ? { general: [value] } : {};
  }

  return Object.entries(data).reduce<Record<string, string[]>>((acc, [key, value]) => {
    const posKey = normalizePosKey(key);
    const values = Array.isArray(value)
      ? value.map(item => String(item).trim()).filter(Boolean)
      : typeof value === 'object' && value !== null
        ? Object.values(value).map(item => String(item).trim()).filter(Boolean)
        : [String(value || '').trim()].filter(Boolean);

    if (values.length > 0) {
      acc[posKey] = [...(acc[posKey] || []), ...values];
    }

    return acc;
  }, {});
}

function getMeaningRows(meaningKo: any, meaningEn: any, posList: string[] = []) {
  const koByPos = parseMeaningData(meaningKo);
  const enByPos = parseMeaningData(meaningEn);
  const orderedKeys = posList.map(normalizePosKey).filter(Boolean);
  const keySet = new Set([...orderedKeys, ...Object.keys(koByPos), ...Object.keys(enByPos)]);

  return Array.from(keySet)
    .sort((a, b) => {
      const aIndex = orderedKeys.indexOf(a);
      const bIndex = orderedKeys.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(key => ({
      pos: key,
      ko: koByPos[key] || [],
      en: enByPos[key] || [],
    }))
    .filter(row => row.ko.length > 0 || row.en.length > 0);
}

function createMeaningEditRows(word: any): MeaningEditRow[] {
  const rows = getMeaningRows(word.meaning_ko, word.meaning_en, word.pos || []);

  if (rows.length > 0) {
    return rows.map(row => ({
      pos: row.pos,
      koText: row.ko.join(', '),
      enText: row.en.join(', '),
    }));
  }

  const posList = Array.isArray(word.pos) && word.pos.length > 0 ? word.pos : ['noun'];
  return posList.map((pos: string) => ({
    pos: normalizePosKey(pos),
    koText: '',
    enText: '',
  }));
}

function splitMeaningText(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function buildMeaningObject(rows: MeaningEditRow[], field: 'koText' | 'enText') {
  return rows.reduce<Record<string, string[]>>((acc, row) => {
    const pos = normalizePosKey(row.pos);
    const values = splitMeaningText(row[field]);

    if (pos && values.length > 0) {
      acc[pos] = [...(acc[pos] || []), ...values];
    }

    return acc;
  }, {});
}

function hasDisplayableGrammarValue(value: any): boolean {
  if (value === null || value === undefined || value === '' || value === 'null') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasDisplayableGrammarValue);
  }

  if (typeof value === 'object') {
    return Object.values(value).some(hasDisplayableGrammarValue);
  }

  return true;
}

export default function WordDetail({ word: initialWord, languages }: { word: any, languages: any[] }) {
  const router = useRouter();
  const [word, setWord] = useState(initialWord);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [isDistractorModalOpen, setIsDistractorModalOpen] = useState(false);
  const [isSavingDistractors, setIsSavingDistractors] = useState(false);
  const [distractorJsonInput, setDistractorJsonInput] = useState('');
  const [distractorJsonError, setDistractorJsonError] = useState<string | null>(null);
  const [isDistractorPromptCopied, setIsDistractorPromptCopied] = useState(false);
  const [editingDistractorId, setEditingDistractorId] = useState<number | null>(null);
  const [distractorEditForm, setDistractorEditForm] = useState({
    distractor: '',
    meaning_ko: '',
    meaning_en: ''
  });
  
  const [formData, setFormData] = useState({
    word: initialWord.word,
    lang_code: initialWord.lang_code,
    gender: String(initialWord.gender || '').toLowerCase(),
    meaningRows: createMeaningEditRows(initialWord),
  });

  // Sync state when initialWord changes (e.g. navigation)
  useEffect(() => {
    setWord(initialWord);
    setFormData({
      word: initialWord.word,
      lang_code: initialWord.lang_code,
      gender: String(initialWord.gender || '').toLowerCase(),
      meaningRows: createMeaningEditRows(initialWord),
    });
  }, [initialWord]);

  // Handle toggle editing to reset form if needed
  useEffect(() => {
    if (isEditing) {
      setFormData({
        word: word.word,
        lang_code: word.lang_code,
        gender: String(word.gender || '').toLowerCase(),
        meaningRows: createMeaningEditRows(word),
      });
    }
  }, [isEditing, word]);

  const handleUpdate = async () => {
    if (!formData.word || !formData.lang_code) {
      alert('단어와 언어를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const normalizedRows = formData.meaningRows
        .map(row => ({
          ...row,
          pos: normalizePosKey(row.pos),
        }))
        .filter(row => row.pos && (row.koText.trim() || row.enText.trim()));

      if (normalizedRows.length === 0) {
        alert('최소 1개 품사의 뜻을 입력해주세요.');
        setLoading(false);
        return;
      }

      const posList = Array.from(new Set(normalizedRows.map(row => row.pos)));

      const res = await fetch('/api/admin/words', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: word.id,
          word: formData.word,
          lang_code: formData.lang_code,
          meaning_ko: buildMeaningObject(normalizedRows, 'koText'),
          meaning_en: buildMeaningObject(normalizedRows, 'enText'),
          gender: formData.gender || null,
          pos: posList,
          audio_url: word.audio_url
        }),
      });

      if (!res.ok) throw new Error('수정 실패');
      
      const updated = await res.json();
      setWord({ ...word, ...updated });
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 이 단어를 삭제하시겠습니까?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/words?id=${word.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      router.push('/admin/words');
      router.refresh();
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleGenerateTTS = async () => {
    if (ttsLoading) return;
    setTtsLoading(true);
    try {
      const res = await fetch('/api/admin/words/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: word.id,
          text: word.word,
          langCode: word.lang_code
        })
      });

      if (!res.ok) throw new Error('TTS 생성 실패');
      
      const data = await res.json();
      setWord({ ...word, audio_url: data.audio_url });
      alert('오디오가 성공적으로 생성되었습니다.');
      router.refresh();
    } catch (e) {
      alert('오디오 생성 중 오류가 발생했습니다.');
    } finally {
      setTtsLoading(false);
    }
  };

  const handleRegenerateInfo = async () => {
    if (infoLoading) return;
    if (!confirm('현재 단어의 품사, 의미, 성수/동사 변화 정보를 AI로 다시 생성해 덮어쓰시겠습니까? 오디오는 변경되지 않습니다.')) {
      return;
    }

    setInfoLoading(true);
    try {
      const res = await fetch('/api/admin/words/regenerate-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: word.id })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || '단어 정보 재생성 실패');
      }

      setWord({
        ...word,
        ...data,
        audio_url: word.audio_url,
        sentences: word.sentences,
        distractors: word.distractors,
      });
      alert('단어 정보가 재생성되었습니다.');
      router.refresh();
    } catch (e: any) {
      alert(e.message || '단어 정보 재생성 중 오류가 발생했습니다.');
    } finally {
      setInfoLoading(false);
    }
  };
  
  const handleDeleteDistractor = async (distractorId: number) => {
    if (!confirm('정말 이 혼동 어휘를 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`/api/admin/words/distractors?id=${distractorId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('삭제 실패');
      
      // Update local state
      setWord({
        ...word,
        distractors: word.distractors.filter((d: any) => d.id !== distractorId)
      });
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const openDistractorModal = () => {
    setDistractorJsonInput('');
    setDistractorJsonError(null);
    setIsDistractorPromptCopied(false);
    setIsDistractorModalOpen(true);
  };

  const handleCopyDistractorPrompt = async () => {
    const languageName = word.lang_code === 'es' ? 'Spanish' : `language code "${word.lang_code}"`;
    const prompt = `You are a language education expert designing vocabulary quiz distractors.
Create exactly 6 incorrect answer choices for a quiz asking for the specified English meaning of the source word below.

Source:
- word: ${JSON.stringify(word.word)}
- language: ${languageName}
- part of speech: ${JSON.stringify(Array.isArray(word.pos) ? word.pos : [])}
- English meaning: ${JSON.stringify(getMeaningDisplay(word.meaning_en))}

Requirements:
1. Prefer words with the same part of speech as the source word.
2. Choose words that look similar or belong to a related topic, but have clearly different meanings.
3. Exclude synonyms or words that could also be accepted as the correct answer.
4. Exclude inflected forms, gender/number variants, and simple spelling variants of the source word.
5. Use only real and natural ${languageName} words or phrases.
6. All 6 choices must be distinct.
7. Provide accurate Korean and English meanings for each distractor.
8. Do not include the source word itself.

Return only a JSON array in this exact format. Do not use markdown code fences or add explanations.
[
  {
    "word": "distractor word",
    "meaning_ko": "한국어 뜻",
    "meaning_en": "English meaning"
  }
]`;

    try {
      await navigator.clipboard.writeText(prompt);
      setIsDistractorPromptCopied(true);
      window.setTimeout(() => setIsDistractorPromptCopied(false), 1800);
    } catch {
      setDistractorJsonError('프롬프트를 클립보드에 복사하지 못했습니다.');
    }
  };

  const handleCreateDistractors = async () => {
    if (isSavingDistractors) return;

    let parsed: any;
    try {
      parsed = JSON.parse(distractorJsonInput);
    } catch {
      setDistractorJsonError('유효한 JSON 배열 형식이 아닙니다.');
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setDistractorJsonError('최상위 값은 1개 이상의 항목을 가진 JSON 배열이어야 합니다.');
      return;
    }

    let items: { word: string; meaning_ko: string; meaning_en: string }[];
    try {
      items = parsed.map((item, index) => {
        if (
          typeof item.word !== 'string' ||
          typeof item.meaning_ko !== 'string' ||
          typeof item.meaning_en !== 'string' ||
          !item.word.trim() ||
          !item.meaning_ko.trim() ||
          !item.meaning_en.trim()
        ) {
          throw new Error(`${index + 1}번째 항목의 word, meaning_ko, meaning_en 값을 모두 입력해주세요.`);
        }

        return {
          word: item.word.trim(),
          meaning_ko: item.meaning_ko.trim(),
          meaning_en: item.meaning_en.trim(),
        };
      });
    } catch (e: any) {
      setDistractorJsonError(e.message || 'JSON 항목 형식이 올바르지 않습니다.');
      return;
    }

    setIsSavingDistractors(true);
    setDistractorJsonError(null);
    try {
      const res = await fetch('/api/admin/words/distractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: word.id,
          items
        })
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.error || '등록 실패');
      }
      
      const newDistractors = await res.json();
      setWord({
        ...word,
        distractors: [...(word.distractors || []), ...newDistractors]
      });
      setIsDistractorModalOpen(false);
      setDistractorJsonInput('');
      alert(`${newDistractors.length}개의 혼동 어휘가 등록되었습니다.`);
    } catch (e: any) {
      setDistractorJsonError(e.message || '등록 중 오류가 발생했습니다.');
    } finally {
      setIsSavingDistractors(false);
    }
  };

  const startEditingDistractor = (d: any) => {
    setEditingDistractorId(d.id);
    setDistractorEditForm({
      distractor: d.distractor,
      meaning_ko: d.meaning_ko || '',
      meaning_en: d.meaning_en || ''
    });
  };

  const handleUpdateDistractor = async (id: number) => {
    try {
      const res = await fetch('/api/admin/words/distractors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...distractorEditForm })
      });

      if (!res.ok) throw new Error('수정 실패');

      setWord({
        ...word,
        distractors: word.distractors.map((d: any) => 
          d.id === id ? { ...d, ...distractorEditForm } : d
        )
      });
      setEditingDistractorId(null);
    } catch (e) {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const validDeclensions = Object.entries(word.declensions || {}).filter(([_, val]) => hasDisplayableGrammarValue(val));
  const validConjugations = Object.entries(word.conjugations || {}).filter(([_, val]) => hasDisplayableGrammarValue(val));
  const meaningRows = getMeaningRows(word.meaning_ko, word.meaning_en, word.pos || []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/admin/words"
            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            목록으로 돌아가기
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateInfo}
              disabled={loading || infoLoading}
              className="p-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all shadow-sm disabled:opacity-50 group"
              title="단어 정보 재생성"
            >
              {infoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RotateCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              )}
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm'}`}
              title={isEditing ? '취소' : '수정'}
            >
              {isEditing ? <X className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="p-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm shadow-red-50"
              title="삭제"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              단어 정보 수정
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">단어</label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">언어</label>
                <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 text-sm">
                  {languages.find(l => l.code === formData.lang_code)?.name_ko || formData.lang_code}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">성별</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 outline-none text-gray-900 dark:text-gray-100"
                >
                  {GENDER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">품사별 의미</label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      meaningRows: [...formData.meaningRows, { pos: 'noun', koText: '', enText: '' }]
                    })}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    품사 추가
                  </button>
                </div>
                <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                  {formData.meaningRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[150px_1fr_1fr_36px]">
                      <select
                        value={row.pos}
                        onChange={(e) => {
                          const nextRows = [...formData.meaningRows];
                          nextRows[index] = { ...row, pos: e.target.value };
                          setFormData({ ...formData, meaningRows: nextRows });
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-sm text-gray-900 dark:text-gray-100"
                      >
                        {POS_OPTIONS.map(opt => (
                          <option key={opt.value} value={normalizePosKey(opt.value)}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.koText}
                        onChange={(e) => {
                          const nextRows = [...formData.meaningRows];
                          nextRows[index] = { ...row, koText: e.target.value };
                          setFormData({ ...formData, meaningRows: nextRows });
                        }}
                        placeholder="한국어 뜻, 쉼표로 구분"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-sm text-gray-900 dark:text-gray-100"
                      />
                      <input
                        type="text"
                        value={row.enText}
                        onChange={(e) => {
                          const nextRows = [...formData.meaningRows];
                          nextRows[index] = { ...row, enText: e.target.value };
                          setFormData({ ...formData, meaningRows: nextRows });
                        }}
                        placeholder="English meanings, comma-separated"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-sm text-gray-900 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.meaningRows.length <= 1) return;
                          setFormData({
                            ...formData,
                            meaningRows: formData.meaningRows.filter((_, rowIndex) => rowIndex !== index)
                          });
                        }}
                        disabled={formData.meaningRows.length <= 1}
                        className="flex h-10 w-full items-center justify-center rounded-xl text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-900/20 md:w-9"
                        title="품사 행 삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 py-2">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${word.audio_url ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">오디오 데이터</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {word.audio_url ? '이미 등록된 오디오가 있습니다.' : '등록된 오디오가 없습니다. AI 음성을 생성해보세요.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {word.audio_url ? (
                      <>
                        <AudioButton fullSrc={getFullAudioUrl(word.audio_url)} />
                        <button
                          onClick={handleGenerateTTS}
                          disabled={ttsLoading}
                          className="p-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all shadow-sm disabled:opacity-50 group"
                          title="오디오 재생성"
                        >
                          {ttsLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleGenerateTTS}
                        disabled={ttsLoading}
                        className="px-4 py-2 bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 font-bold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {ttsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-orange-400" />}
                        오디오 생성
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장하기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {word.lang_code}
                </span>
                <div className="flex gap-1.5">
                  {word.pos.map((p: string, idx: number) => (
                    <span key={idx} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {formatPOS(p)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span>ID: {word.id}</span>
                <span className="w-px h-3 bg-gray-200 dark:bg-gray-800" />
                <span>등록일: {new Date(word.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight flex items-baseline gap-3 leading-tight break-words">
                {word.word}
                {word.gender && word.gender !== 'null' && (
                  <span className="text-lg font-semibold text-gray-400 dark:text-gray-500">({formatGender(word.gender)})</span>
                )}
              </h1>
              {word.audio_url && (
                <AudioButton fullSrc={getFullAudioUrl(word.audio_url)} />
              )}
            </div>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                뜻과 의미
              </h2>
              <span className="rounded-full bg-gray-50 px-3 py-1 text-[11px] font-bold text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                품사별 KO/EN 비교
              </span>
            </div>

            {meaningRows.length > 0 ? (
              <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                {meaningRows.map((row) => (
                  <div key={row.pos} className="grid grid-cols-1 gap-2 bg-white px-4 py-3 dark:bg-gray-900 md:grid-cols-[96px_1fr_1fr] md:items-start md:gap-4">
                    <div className="flex items-center gap-2 md:block">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {formatPOS(row.pos)}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-gray-300 dark:text-gray-600 md:mt-1 md:block">
                        {row.pos}
                      </span>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <span className="mt-0.5 shrink-0 text-[11px] font-black text-blue-500">KO</span>
                      <p className="min-w-0 text-sm font-semibold leading-relaxed text-gray-900 dark:text-gray-100">
                        {row.ko.length > 0 ? row.ko.join(', ') : <span className="text-gray-300 dark:text-gray-600">-</span>}
                      </p>
                    </div>
                    <div className="flex min-w-0 gap-2">
                      <span className="mt-0.5 shrink-0 text-[11px] font-black text-gray-400">EN</span>
                      <p className="min-w-0 text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-300">
                        {row.en.length > 0 ? row.en.join(', ') : <span className="text-gray-300 dark:text-gray-600">-</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-500">
                등록된 뜻 정보가 없습니다.
              </div>
            )}
          </section>

          {(validDeclensions.length > 0 || validConjugations.length > 0) && (
            <div className="flex flex-col gap-4">
              {validDeclensions.length > 0 && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    성·수 변화
                  </h2>
                  <div className="space-y-2">
                    {validDeclensions.map(([key, val]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{formatGrammarKey(key)}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {validConjugations.length > 0 && (
                <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-orange-500" />
                    동사 변화
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {validConjugations
                      .sort(([a], [b]) => {
                        const orderA = TENSE_ORDER[a.toLowerCase()] || 99;
                        const orderB = TENSE_ORDER[b.toLowerCase()] || 99;
                        return orderA - orderB;
                      })
                      .map(([key, val]: [string, any]) => (
                        <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-orange-100 dark:hover:border-orange-900 transition-colors">
                          <h3 className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase mb-2 pb-1 border-b border-orange-100 dark:border-orange-900/30 flex justify-between items-baseline">
                            {formatGrammarKey(key)}
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal uppercase">{key}</span>
                          </h3>
                          {typeof val === 'object' && val !== null ? (
                            <div className="space-y-1">
                              {Object.entries(val)
                                .sort(([a], [b]) => {
                                  const orderA = PERSON_ORDER[a.toLowerCase()] || 99;
                                  const orderB = PERSON_ORDER[b.toLowerCase()] || 99;
                                  return orderA - orderB;
                                })
                                .map(([subKey, subVal]: [string, any]) => (
                                  <div key={subKey} className="flex justify-between items-center py-0.5">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{formatGrammarKey(subKey)}</span>
                                    <span className="text-base font-medium text-gray-900 dark:text-gray-100">{String(subVal)}</span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="text-base font-bold text-gray-900 dark:text-gray-100">{String(val)}</div>
                          )}
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                혼동 어휘 (Distractors)
              </h2>
              <button
                onClick={openDistractorModal}
                className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-lg border border-yellow-100 dark:border-yellow-900 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
                혼동 어휘 생성
              </button>
            </div>
            {word.distractors && word.distractors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {word.distractors.map((d: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-yellow-100 dark:hover:border-yellow-900 transition-colors group relative">
                    {editingDistractorId === d.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={distractorEditForm.distractor}
                          onChange={(e) => setDistractorEditForm({ ...distractorEditForm, distractor: e.target.value })}
                          className="w-full px-3 py-2 text-sm font-bold border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="단어"
                        />
                        <input
                          type="text"
                          value={distractorEditForm.meaning_ko}
                          onChange={(e) => setDistractorEditForm({ ...distractorEditForm, meaning_ko: e.target.value })}
                          className="w-full px-3 py-2 text-xs border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="한국어 뜻"
                        />
                        <input
                          type="text"
                          value={distractorEditForm.meaning_en}
                          onChange={(e) => setDistractorEditForm({ ...distractorEditForm, meaning_en: e.target.value })}
                          className="w-full px-3 py-2 text-xs border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="영어 뜻"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingDistractorId(null)}
                            className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleUpdateDistractor(d.id)}
                            className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition-colors">
                            {d.distractor}
                          </p>
                          {d.meaning_ko && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{d.meaning_ko}</p>
                          )}
                          {d.meaning_en && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">{d.meaning_en}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => startEditingDistractor(d)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDistractor(d.id)}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500">등록된 혼동 어휘가 없습니다.</p>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" />
              관련 문장 ({word.sentences?.length || 0})
            </h2>
            {word.sentences && word.sentences.length > 0 ? (
              <div className="space-y-3">
                {word.sentences.map((s: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-200 group relative">
                    <div className="flex justify-between items-start">
                      <Link href={`/admin/sentences/${s.id}`} className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1 break-words">
                          {highlightWord(s.sentence, s.used_as || word.word)}
                        </p>
                        <p className="text-base text-gray-600 dark:text-gray-400 break-words">{s.translation}</p>
                      </Link>
                      {s.audio_url && (
                        <div className="ml-3 flex-shrink-0 relative z-10">
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
      )}

      {isDistractorModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => !isSavingDistractors && setIsDistractorModalOpen(false)}
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">혼동 어휘 JSON 등록</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {word.word}에 연결할 혼동 어휘 배열을 입력하세요.
                </p>
              </div>
              <button
                onClick={() => setIsDistractorModalOpen(false)}
                disabled={isSavingDistractors}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-150px)]">
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">ChatGPT로 JSON 생성</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    단어·품사·영어 뜻을 포함한 생성 프롬프트를 복사합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyDistractorPrompt()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                >
                  {isDistractorPromptCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isDistractorPromptCopied ? '프롬프트 복사됨' : '프롬프트 생성'}
                </button>
              </div>

              <textarea
                value={distractorJsonInput}
                onChange={(e) => {
                  setDistractorJsonInput(e.target.value);
                  setDistractorJsonError(null);
                }}
                className="w-full h-[420px] p-4 font-mono text-xs sm:text-sm bg-gray-900 text-gray-200 rounded-xl border-0 outline-none resize-none focus:ring-4 focus:ring-yellow-500/20"
                spellCheck={false}
                placeholder={`[
  {
    "word": "혼동어휘",
    "meaning_ko": "한국어 뜻",
    "meaning_en": "English meaning"
  }
]`}
              />

              {distractorJsonError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-sm font-medium text-red-700 dark:text-red-400">
                  {distractorJsonError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <button
                onClick={() => setIsDistractorModalOpen(false)}
                disabled={isSavingDistractors}
                className="px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateDistractors}
                disabled={isSavingDistractors || !distractorJsonInput.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-yellow-600 text-white text-sm font-bold rounded-xl hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                {isSavingDistractors ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
