'use client';

import { useState } from 'react';
import { FileJson, Loader2, Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { importWordsFromJson } from '@/lib/supabase/services/sentences';

interface JSONWordImporterProps {
  sentenceId: number;
  langCode: string;
}

export default function JSONWordImporter({ sentenceId, langCode }: JSONWordImporterProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

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
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FileJson className="w-5 h-5 text-indigo-600" />
        JSON 데이터로 단어 일괄 등록
      </h3>
      
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
