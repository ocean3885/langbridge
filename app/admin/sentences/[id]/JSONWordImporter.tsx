'use client';

import { useState } from 'react';
import { FileJson, Loader2, Check, AlertCircle, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { importWordsFromJson } from '@/lib/supabase/services/sentences';

interface JSONWordImporterProps {
  sentenceId: number;
  sentenceText: string;
  langCode: string;
}

export default function JSONWordImporter({ sentenceId, sentenceText, langCode }: JSONWordImporterProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  const copyPromptToClipboard = async () => {
    const promptText = `당신은 스페인어 언어 교육 및 어휘 형태소 분석 전문가입니다.
아래 제공되는 스페인어 문장에서 학습 가치가 있는 주요 단어들을 추출하고, 각 단어의 사전적 상세 정보를 다음 JSON 출력 스키마에 완전히 부합하도록 작성하세요.

문장 정보:
- sentence: "${sentenceText}"
- langCode: "${langCode}"

### [출력 JSON 스키마]
{
  "words": {
    "문장속실제형태": {
      "word": "사전원형(소문자 기본형)",
      "pos": ["noun", "verb", "adj", "adv", "prep", "pron", "det", "conj", "interj 중 해당하는 것들"],
      "meaning_ko": { "품사": "한국어 뜻" },
      "meaning_en": { "품사": "영어 뜻" },
      "gender": "m/f/mf/null",
      "conjugations": {
        "pres": { "s1": "1인칭단수", "s2": "2인칭단수", "s3": "3인칭단수", "p1": "1인칭복수", "p2": "2인칭복수", "p3": "3인칭복수" },
        "pret": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
        "impf": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
        "futr": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
        "cond": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." },
        "perf": { "s1": "...", "s2": "...", "s3": "...", "p1": "...", "p2": "...", "p3": "..." }
      },
      "declensions": { "ms": "남성단수형", "mp": "남성복수형", "fs": "여성단수형", "fp": "여성복수형" }
    }
  }
}

### [지침]
1. 관사, 전치사, 접속사, 대명사, 소유형, 사람이름처럼 단독 학습 가치가 낮은 단어는 제외하세요.
2. 명사의 성별은 pos에 넣지 말고 gender 필드에 넣으세요. (남녀공용/양성명사인 경우 'mf' 기입)
3. 동사인 경우에만 conjugations(직설법 현재, 단순과거, 불완료과거, 미래, 조건부, 현재완료의 6개 시제 변화)를 채우고, 명사/형용사인 경우에만 declensions를 채우세요. 해당하지 않는 필드는 빈 객체({}) 또는 빈 문자열("")로 비워두세요.
4. meaning_ko와 meaning_en은 pos 배열에 기입한 모든 품사를 키값으로 삼아 각각의 뜻을 기입하세요.
5. 오직 JSON 코드 블록(\`\`\`json \`\`\` 또는 순수 JSON 텍스트)만 반환하고, 다른 서론이나 설명은 일절 포함하지 마세요.`;

    try {
      await navigator.clipboard.writeText(promptText);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      alert('클립보드 복사에 실패했습니다.');
    }
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) return;

    setIsLoading(true);
    setStatus(null);

    try {
      await importWordsFromJson(sentenceId, jsonInput.trim(), langCode);
      
      setStatus({
        type: 'success',
        message: '단어들이 성공적으로 임포트되었습니다!'
      });
      
      setJsonInput('');
      
      // 5초 뒤에 메시지 숨기기
      setTimeout(() => {
        setStatus(null);
      }, 5000);

      router.refresh();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '임포트 중 오류가 발생했습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-slate-50 rounded-3xl p-8 border border-slate-200/50">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-2">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileJson className="w-5 h-5 text-indigo-600" />
          JSON 데이터로 단어 일괄 등록
        </h3>
        <button
          type="button"
          onClick={copyPromptToClipboard}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
        >
          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{isCopied ? '복사 완료!' : 'AI 프롬프트 복사'}</span>
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        AI가 생성한 단어 JSON 코드를 아래에 붙여넣으세요. 자동으로 단어를 생성하고 이 문장과 연결합니다.
      </p>

      <div className="space-y-4">
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"words": { ... }}'
          rows={6}
          className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none bg-white shadow-sm font-mono text-xs"
          disabled={isLoading}
        />
        
        <button
          onClick={handleImport}
          disabled={isLoading || !jsonInput.trim()}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              데이터 처리 중...
            </>
          ) : (
            <>
              <FileJson className="w-5 h-5" />
              JSON 데이터 임포트
            </>
          )}
        </button>
      </div>

      {status && (
        <div className={`mt-6 p-5 border rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          status.type === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            status.type === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {status.type === 'success' ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              status.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}>
              {status.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
