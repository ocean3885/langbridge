'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2, Settings2, Check, X } from 'lucide-react';

interface TTSRegeneratorProps {
  text: string;
  onGenerate: (options: {
    provider: 'google' | 'elevenlabs';
    model: string;
    voice: string;
    speed: number;
  }) => Promise<void>;
  isGenerating: boolean;
}

const PROVIDERS = {
  google: {
    name: 'Google Cloud TTS',
    models: [
      { id: 'standard', name: 'Standard' },
      { id: 'wavenet', name: 'WaveNet' },
      { id: 'neural2', name: 'Neural2' },
      { id: 'studio', name: 'Studio' },
    ],
    voices: [
      { id: 'es-ES-Standard-A', name: 'es-ES-Standard-A (여성)' },
      { id: 'es-ES-Standard-B', name: 'es-ES-Standard-B (남성)' },
      { id: 'es-ES-Neural2-A', name: 'es-ES-Neural2-A (여성)' },
      { id: 'es-ES-Neural2-B', name: 'es-ES-Neural2-B (남성)' },
      { id: 'es-ES-Wavenet-B', name: 'es-ES-Wavenet-B (남성)' },
      { id: 'es-ES-Wavenet-C', name: 'es-ES-Wavenet-C (여성)' },
    ]
  },
  elevenlabs: {
    name: 'ElevenLabs',
    models: [
      { id: 'eleven_multilingual_v2', name: 'Multilingual v2' },
      { id: 'eleven_multilingual_v1', name: 'Multilingual v1' },
      { id: 'eleven_monolingual_v1', name: 'Monolingual v1' },
    ],
    voices: [
      { id: '2Lb1en5ujrODDIqmp7F3', name: '선호 성우 (Custom)' },
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (미국, 여성)' },
      { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew (미국, 남성)' },
      { id: 'pNInz6obpgDQGcFmaJcg', name: 'Antoni (미국, 남성)' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (미국, 여성)' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (미국, 여성)' },
    ]
  }
};

export default function TTSRegenerator({ text, onGenerate, isGenerating }: TTSRegeneratorProps) {
  const [provider, setProvider] = useState<'google' | 'elevenlabs'>('elevenlabs');
  const [model, setModel] = useState(PROVIDERS.elevenlabs.models[0].id);
  const [voice, setVoice] = useState(PROVIDERS.elevenlabs.voices[0].id);
  const [speed, setSpeed] = useState('0.8');
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load saved settings on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('tts_provider') as 'google' | 'elevenlabs';
    const savedModel = localStorage.getItem('tts_model');
    const savedVoice = localStorage.getItem('tts_voice');
    const savedSpeed = localStorage.getItem('tts_speed');

    if (savedProvider && PROVIDERS[savedProvider]) {
      setProvider(savedProvider);
      
      if (savedModel && PROVIDERS[savedProvider].models.some(m => m.id === savedModel)) {
        setModel(savedModel);
      } else {
        setModel(PROVIDERS[savedProvider].models[0].id);
      }
      
      if (savedVoice && PROVIDERS[savedProvider].voices.some(v => v.id === savedVoice)) {
        setVoice(savedVoice);
      } else {
        setVoice(PROVIDERS[savedProvider].voices[0].id);
      }
    }

    if (savedSpeed) {
      setSpeed(savedSpeed);
    }
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

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as 'google' | 'elevenlabs';
    setProvider(newProvider);
    setModel(PROVIDERS[newProvider].models[0].id);
    setVoice(PROVIDERS[newProvider].voices[0].id);
  };

  const handleGenerate = async () => {
    if (!text) return;

    // Save settings
    localStorage.setItem('tts_provider', provider);
    localStorage.setItem('tts_model', model);
    localStorage.setItem('tts_voice', voice);
    localStorage.setItem('tts_speed', speed);

    setIsOpen(false);
    await onGenerate({
      provider,
      model,
      voice,
      speed: parseFloat(speed)
    });
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
        <div className="absolute left-0 bottom-full mb-2 z-50 w-80 rounded-xl bg-white shadow-xl border border-gray-100 p-4">
          <div className="space-y-4">
            <h4 className="font-bold text-sm border-b pb-2 text-gray-800">TTS 재생성 설정</h4>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">API 제공자</label>
              <select 
                value={provider} 
                onChange={handleProviderChange}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="elevenlabs">ElevenLabs</option>
                <option value="google">Google Cloud TTS</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">모델 선택</label>
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
              >
                {PROVIDERS[provider].models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">목소리 선택</label>
              <select 
                value={voice} 
                onChange={(e) => setVoice(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
              >
                {PROVIDERS[provider].voices.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {provider === 'google' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">재생 속도 (0.7 ~ 1.2, Google 전용)</label>
                <input 
                  type="number"
                  min="0.7"
                  max="1.2"
                  step="0.1"
                  value={speed} 
                  onChange={(e) => setSpeed(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="0.8"
                />
              </div>
            )}

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
