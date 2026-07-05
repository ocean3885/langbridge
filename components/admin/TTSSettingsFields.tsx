import {
  type AdminTtsOptions,
  type TTSProvider,
  TTS_PROVIDERS,
  getDefaultVoiceForTtsSelection,
  getVoicesForTtsSelection,
} from '@/lib/admin-tts-options';

interface TTSSettingsFieldsProps {
  value: AdminTtsOptions;
  onChange: (value: AdminTtsOptions) => void;
  variant?: 'form' | 'modal' | 'compact';
  className?: string;
}

const variantClasses = {
  form: {
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    field: 'space-y-2',
    label: 'text-sm font-bold text-gray-700 dark:text-gray-300 ml-1',
    input: 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100',
    checkbox: 'flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-300',
  },
  modal: {
    grid: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    field: 'space-y-1.5',
    label: 'text-xs font-bold text-gray-500 dark:text-gray-400',
    input: 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none',
    checkbox: 'flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300',
  },
  compact: {
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    field: 'space-y-2',
    label: 'text-xs font-bold text-gray-600 dark:text-gray-400 ml-1',
    input: 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-sm text-gray-900 dark:text-gray-100',
    checkbox: 'flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400',
  },
};

function parseNumberInput(value: string, fallback: number) {
  const next = parseFloat(value);
  return Number.isFinite(next) ? next : fallback;
}

export default function TTSSettingsFields({
  value,
  onChange,
  variant = 'form',
  className = '',
}: TTSSettingsFieldsProps) {
  const classes = variantClasses[variant];

  const update = (updates: Partial<AdminTtsOptions>) => {
    onChange({ ...value, ...updates });
  };

  const handleProviderChange = (provider: TTSProvider) => {
    const model = TTS_PROVIDERS[provider].models[0].id;
    onChange({
      ...value,
      provider,
      model,
      voice: getDefaultVoiceForTtsSelection(provider, model),
    });
  };

  const handleModelChange = (model: string) => {
    onChange({
      ...value,
      model,
      voice: getDefaultVoiceForTtsSelection(value.provider, model),
    });
  };

  const selectClassName = `${classes.input} appearance-none cursor-pointer`;

  return (
    <div className={`${classes.grid} ${className}`.trim()}>
      <div className={classes.field}>
        <label className={classes.label}>API 제공자</label>
        <select
          value={value.provider}
          onChange={(e) => handleProviderChange(e.target.value as TTSProvider)}
          className={selectClassName}
        >
          <option value="elevenlabs">ElevenLabs</option>
          <option value="google">Google Cloud TTS</option>
        </select>
      </div>

      <div className={classes.field}>
        <label className={classes.label}>모델</label>
        <select
          value={value.model}
          onChange={(e) => handleModelChange(e.target.value)}
          className={selectClassName}
        >
          {TTS_PROVIDERS[value.provider].models.map(model => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>
      </div>

      <div className={classes.field}>
        <label className={classes.label}>목소리</label>
        <select
          value={value.voice}
          onChange={(e) => update({ voice: e.target.value })}
          className={selectClassName}
        >
          {getVoicesForTtsSelection(value.provider, value.model).map(voice => (
            <option key={voice.id} value={voice.id}>{voice.name}</option>
          ))}
        </select>
      </div>

      <div className={classes.field}>
        <label className={classes.label}>재생 속도 <span className="font-medium text-gray-400">(추천 0.8)</span></label>
        <input
          type="number"
          min="0.7"
          max="1.2"
          step="0.1"
          value={value.speed}
          onChange={(e) => update({ speed: parseNumberInput(e.target.value, 0.8) })}
          className={classes.input}
        />
      </div>

      {value.provider === 'elevenlabs' && (
        <>
          <div className={classes.field}>
            <label className={classes.label}>안정성 <span className="font-medium text-gray-400">(추천 0.5)</span></label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={value.stability}
              onChange={(e) => update({ stability: parseNumberInput(e.target.value, 0) })}
              className={classes.input}
            />
          </div>

          <div className={classes.field}>
            <label className={classes.label}>유사도 <span className="font-medium text-gray-400">(추천 0.75)</span></label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={value.similarityBoost}
              onChange={(e) => update({ similarityBoost: parseNumberInput(e.target.value, 0) })}
              className={classes.input}
            />
          </div>

          <div className={classes.field}>
            <label className={classes.label}>스타일 <span className="font-medium text-gray-400">(추천 0)</span></label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={value.style}
              onChange={(e) => update({ style: parseNumberInput(e.target.value, 0) })}
              className={classes.input}
            />
          </div>

          <label className={classes.checkbox}>
            <input
              type="checkbox"
              checked={value.useSpeakerBoost}
              onChange={(e) => update({ useSpeakerBoost: e.target.checked })}
              className="w-4 h-4"
            />
            스피커 부스트
          </label>
        </>
      )}
    </div>
  );
}
