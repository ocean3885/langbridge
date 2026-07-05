export type TTSProvider = 'google' | 'elevenlabs';

export interface TTSOption {
  id: string;
  name: string;
}

export interface TTSVoiceOption extends TTSOption {
  supportedModels: string[];
}

export interface AdminTtsOptions {
  provider: TTSProvider;
  model: string;
  voice: string;
  speed: number;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

const ELEVENLABS_MODELS: TTSOption[] = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5' },
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5' },
  { id: 'eleven_multilingual_v1', name: 'Multilingual v1' },
  { id: 'eleven_monolingual_v1', name: 'Monolingual v1' },
];

const ELEVENLABS_MODEL_IDS = ELEVENLABS_MODELS.map(model => model.id);

export const TTS_PROVIDERS: Record<TTSProvider, { name: string; models: TTSOption[]; voices: TTSVoiceOption[] }> = {
  google: {
    name: 'Google Cloud TTS',
    models: [
      { id: 'standard', name: 'Standard' },
      { id: 'neural2', name: 'Neural2' },
      { id: 'studio', name: 'Studio' },
    ],
    voices: [
      { id: 'es-ES-Neural2-A', name: 'Neural2 A - 여성', supportedModels: ['neural2'] },
      { id: 'es-ES-Neural2-E', name: 'Neural2 E - 여성', supportedModels: ['neural2'] },
      { id: 'es-ES-Neural2-F', name: 'Neural2 F - 남성', supportedModels: ['neural2'] },
      { id: 'es-ES-Neural2-G', name: 'Neural2 G - 남성', supportedModels: ['neural2'] },
      { id: 'es-ES-Studio-C', name: 'Studio C - 여성', supportedModels: ['studio'] },
      { id: 'es-ES-Studio-F', name: 'Studio F - 남성', supportedModels: ['studio'] },
      { id: 'es-ES-Standard-G', name: 'Standard G - 남성', supportedModels: ['standard'] },
      { id: 'es-ES-Standard-H', name: 'Standard H - 여성', supportedModels: ['standard'] },
    ],
  },
  elevenlabs: {
    name: 'ElevenLabs',
    models: ELEVENLABS_MODELS,
    voices: [
      { id: '2Lb1en5ujrODDIqmp7F3', name: '스페인어 학습 기본 (Custom)', supportedModels: ELEVENLABS_MODEL_IDS },
      { id: '21m00Tcm4TlvDq8ikWAM', name: '스페인어 회화 여성 A - 차분함', supportedModels: ELEVENLABS_MODEL_IDS },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: '스페인어 회화 여성 B - 밝음', supportedModels: ELEVENLABS_MODEL_IDS },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: '스페인어 설명 여성 C - 또렷함', supportedModels: ELEVENLABS_MODEL_IDS },
      { id: '29vD33N1CtxCmqQRPOHJ', name: '스페인어 회화 남성 A - 안정적', supportedModels: ELEVENLABS_MODEL_IDS },
      { id: 'pNInz6obpgDQGcFmaJcg', name: '스페인어 설명 남성 B - 깊은 톤', supportedModels: ELEVENLABS_MODEL_IDS },
    ],
  },
};

export const defaultAdminTtsOptions: AdminTtsOptions = {
  provider: 'elevenlabs',
  model: TTS_PROVIDERS.elevenlabs.models[0].id,
  voice: TTS_PROVIDERS.elevenlabs.voices[0].id,
  speed: 0.8,
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  useSpeakerBoost: true,
};

export function getVoicesForTtsSelection(provider: TTSProvider, model: string) {
  return TTS_PROVIDERS[provider].voices.filter(voice => voice.supportedModels.includes(model));
}

export function getDefaultVoiceForTtsSelection(provider: TTSProvider, model: string) {
  return getVoicesForTtsSelection(provider, model)[0]?.id || '';
}

export function normalizeTtsSelection(providerValue: unknown, modelValue?: string | null, voiceValue?: string | null) {
  const provider: TTSProvider = providerValue === 'google' ? 'google' : 'elevenlabs';
  const models = TTS_PROVIDERS[provider].models;
  const model = models.some(option => option.id === modelValue) ? modelValue! : models[0].id;
  const voices = getVoicesForTtsSelection(provider, model);
  const voice = voices.some(option => option.id === voiceValue) ? voiceValue! : (voices[0]?.id || '');

  return { provider, model, voice };
}
