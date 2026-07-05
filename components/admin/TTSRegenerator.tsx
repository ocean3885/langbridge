'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2, Check } from 'lucide-react';
import {
  type AdminTtsOptions,
  defaultAdminTtsOptions,
  normalizeTtsSelection,
} from '@/lib/admin-tts-options';
import TTSSettingsFields from './TTSSettingsFields';

interface TTSRegeneratorProps {
  text: string;
  onGenerate: (options: AdminTtsOptions) => Promise<void>;
  isGenerating: boolean;
}

export default function TTSRegenerator({ text, onGenerate, isGenerating }: TTSRegeneratorProps) {
  const [ttsOptions, setTtsOptions] = useState(defaultAdminTtsOptions);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load saved settings on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('tts_provider');
    const savedModel = localStorage.getItem('tts_model');
    const savedVoice = localStorage.getItem('tts_voice');
    const savedSpeed = localStorage.getItem('tts_speed');
    const savedStability = localStorage.getItem('tts_stability');
    const savedSimilarityBoost = localStorage.getItem('tts_similarity_boost');
    const savedStyle = localStorage.getItem('tts_style');
    const savedUseSpeakerBoost = localStorage.getItem('tts_use_speaker_boost');

    const selection = normalizeTtsSelection(savedProvider, savedModel, savedVoice);
    setTtsOptions({
      ...defaultAdminTtsOptions,
      ...selection,
      speed: savedSpeed ? parseFloat(savedSpeed) : defaultAdminTtsOptions.speed,
      stability: savedStability ? parseFloat(savedStability) : defaultAdminTtsOptions.stability,
      similarityBoost: savedSimilarityBoost ? parseFloat(savedSimilarityBoost) : defaultAdminTtsOptions.similarityBoost,
      style: savedStyle ? parseFloat(savedStyle) : defaultAdminTtsOptions.style,
      useSpeakerBoost: savedUseSpeakerBoost ? savedUseSpeakerBoost === 'true' : defaultAdminTtsOptions.useSpeakerBoost,
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverRef]);

  const handleGenerate = async () => {
    if (!text) return;

    // Save settings
    localStorage.setItem('tts_provider', ttsOptions.provider);
    localStorage.setItem('tts_model', ttsOptions.model);
    localStorage.setItem('tts_voice', ttsOptions.voice);
    localStorage.setItem('tts_speed', String(ttsOptions.speed));
    localStorage.setItem('tts_stability', String(ttsOptions.stability));
    localStorage.setItem('tts_similarity_boost', String(ttsOptions.similarityBoost));
    localStorage.setItem('tts_style', String(ttsOptions.style));
    localStorage.setItem('tts_use_speaker_boost', String(ttsOptions.useSpeakerBoost));

    setIsOpen(false);
    await onGenerate(ttsOptions);
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button 
        type="button"
        disabled={isGenerating}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded-xl hover:bg-amber-100 transition-all text-sm border border-amber-100 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
        음성 재생성 옵션 (TTS)
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-[min(92vw,34rem)] rounded-xl bg-white shadow-xl border border-gray-100 p-4">
          <div className="space-y-4">
            <h4 className="font-bold text-sm border-b pb-2 text-gray-800">TTS 재생성 설정</h4>

            <TTSSettingsFields
              value={ttsOptions}
              onChange={setTtsOptions}
              variant="modal"
            />

            <div className="pt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !text}
                className="w-full flex justify-center items-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                새로운 음성 생성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
