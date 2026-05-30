'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2, Check } from 'lucide-react';

type TTSProvider = 'google' | 'elevenlabs';

interface TTSOptions {
  provider: TTSProvider;
  model: string;
  voice: string;
  speed: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface TTSRegeneratorProps {
  text: string;
  onGenerate: (options: TTSOptions) => Promise<void>;
  isGenerating: boolean;
}

const PROVIDERS = {
  google: {
    name: 'Google Cloud TTS',
    models: [
      { id: 'standard', name: 'Standard' },
      { id: 'wavenet', name: 'WaveNet' },
      { id: 'neural2', name: 'Neural2' },
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
      { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5' },
      { id: 'eleven_flash_v2_5', name: 'Flash v2.5' },
      { id: 'eleven_multilingual_v1', name: 'Multilingual v1' },
      { id: 'eleven_monolingual_v1', name: 'Monolingual v1' },
    ],
    voices: [
      { id: '2Lb1en5ujrODDIqmp7F3', name: '스페인어 학습 기본 (Custom)' },
      { id: '21m00Tcm4TlvDq8ikWAM', name: '스페인어 회화 여성 A - 차분함' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: '스페인어 회화 여성 B - 밝음' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: '스페인어 설명 여성 C - 또렷함' },
      { id: '29vD33N1CtxCmqQRPOHJ', name: '스페인어 회화 남성 A - 안정적' },
      { id: 'pNInz6obpgDQGcFmaJcg', name: '스페인어 설명 남성 B - 깊은 톤' },
    ]
  }
};

function getVoicesForTtsSelection(provider: TTSProvider, model: string) {
  const voices = PROVIDERS[provider].voices;
  if (provider !== 'google') return voices;

  const modelName = model.toLowerCase();
  const modelVoices = voices.filter(voice => voice.id.toLowerCase().includes(`-${modelName}-`));
  return modelVoices.length > 0 ? modelVoices : voices;
}

function getDefaultVoiceForTtsSelection(provider: TTSProvider, model: string) {
  return getVoicesForTtsSelection(provider, model)[0]?.id || PROVIDERS[provider].voices[0].id;
}

export default function TTSRegenerator({ text, onGenerate, isGenerating }: TTSRegeneratorProps) {
  const [provider, setProvider] = useState<TTSProvider>('elevenlabs');
  const [model, setModel] = useState(PROVIDERS.elevenlabs.models[0].id);
  const [voice, setVoice] = useState(PROVIDERS.elevenlabs.voices[0].id);
  const [speed, setSpeed] = useState('0.8');
  const [stability, setStability] = useState('0.5');
  const [similarityBoost, setSimilarityBoost] = useState('0.75');
  const [style, setStyle] = useState('0');
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load saved settings on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('tts_provider') as TTSProvider;
    const savedModel = localStorage.getItem('tts_model');
    const savedVoice = localStorage.getItem('tts_voice');
    const savedSpeed = localStorage.getItem('tts_speed');
    const savedStability = localStorage.getItem('tts_stability');
    const savedSimilarityBoost = localStorage.getItem('tts_similarity_boost');
    const savedStyle = localStorage.getItem('tts_style');
    const savedUseSpeakerBoost = localStorage.getItem('tts_use_speaker_boost');

    if (savedProvider && PROVIDERS[savedProvider]) {
      setProvider(savedProvider);
      let nextModel = PROVIDERS[savedProvider].models[0].id;
      
      if (savedModel && PROVIDERS[savedProvider].models.some(m => m.id === savedModel)) {
        nextModel = savedModel;
        setModel(nextModel);
      } else {
        setModel(nextModel);
      }
      
      const voices = getVoicesForTtsSelection(savedProvider, nextModel);
      if (savedVoice && voices.some(v => v.id === savedVoice)) {
        setVoice(savedVoice);
      } else {
        setVoice(getDefaultVoiceForTtsSelection(savedProvider, nextModel));
      }
    }

    if (savedSpeed) {
      setSpeed(savedSpeed);
    }
    if (savedStability) setStability(savedStability);
    if (savedSimilarityBoost) setSimilarityBoost(savedSimilarityBoost);
    if (savedStyle) setStyle(savedStyle);
    if (savedUseSpeakerBoost) setUseSpeakerBoost(savedUseSpeakerBoost === 'true');
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
    const newProvider = e.target.value as TTSProvider;
    const nextModel = PROVIDERS[newProvider].models[0].id;
    setProvider(newProvider);
    setModel(nextModel);
    setVoice(getDefaultVoiceForTtsSelection(newProvider, nextModel));
  };

  const handleGenerate = async () => {
    if (!text) return;

    // Save settings
    localStorage.setItem('tts_provider', provider);
    localStorage.setItem('tts_model', model);
    localStorage.setItem('tts_voice', voice);
    localStorage.setItem('tts_speed', speed);
    localStorage.setItem('tts_stability', stability);
    localStorage.setItem('tts_similarity_boost', similarityBoost);
    localStorage.setItem('tts_style', style);
    localStorage.setItem('tts_use_speaker_boost', String(useSpeakerBoost));

    setIsOpen(false);
    await onGenerate({
      provider,
      model,
      voice,
      speed: parseFloat(speed),
      ...(provider === 'elevenlabs' ? {
        stability: parseFloat(stability),
        similarityBoost: parseFloat(similarityBoost),
        style: parseFloat(style),
        useSpeakerBoost,
      } : {})
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
                onChange={(e) => {
                  setModel(e.target.value);
                  setVoice(getDefaultVoiceForTtsSelection(provider, e.target.value));
                }}
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
                {getVoicesForTtsSelection(provider, model).map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">재생 속도 (추천 0.8)</label>
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

            {provider === 'elevenlabs' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">안정성 (추천 0.5)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={stability}
                      onChange={(e) => setStability(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">유사도 (추천 0.75)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={similarityBoost}
                      onChange={(e) => setSimilarityBoost(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">스타일 (추천 0)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={useSpeakerBoost}
                      onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                      className="w-4 h-4"
                    />
                    스피커 부스트
                  </label>
                </div>
              </>
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
