export type BundleLevelLanguage = 'ko' | 'en';

export type BundleLevelDisplay = {
  value: number;
  code: string;
  label: string;
  shortLabel: string;
};

const bundleLevelMap: Record<number, Record<BundleLevelLanguage, Omit<BundleLevelDisplay, 'value'>>> = {
  1: {
    ko: { code: 'Beginner', label: '입문', shortLabel: 'Beginner' },
    en: { code: 'Beginner', label: 'Beginner', shortLabel: 'Beginner' },
  },
  2: {
    ko: { code: 'A1', label: 'A1 초급', shortLabel: 'A1' },
    en: { code: 'A1', label: 'A1 Beginner', shortLabel: 'A1' },
  },
  3: {
    ko: { code: 'A2', label: 'A2 초급', shortLabel: 'A2' },
    en: { code: 'A2', label: 'A2 Elementary', shortLabel: 'A2' },
  },
  4: {
    ko: { code: 'B1', label: 'B1 중급', shortLabel: 'B1' },
    en: { code: 'B1', label: 'B1 Intermediate', shortLabel: 'B1' },
  },
  5: {
    ko: { code: 'B2', label: 'B2 중상급', shortLabel: 'B2' },
    en: { code: 'B2', label: 'B2 Upper Intermediate', shortLabel: 'B2' },
  },
  6: {
    ko: { code: 'C1', label: 'C1 고급', shortLabel: 'C1' },
    en: { code: 'C1', label: 'C1 Advanced', shortLabel: 'C1' },
  },
  7: {
    ko: { code: 'C2', label: 'C2 최상급', shortLabel: 'C2' },
    en: { code: 'C2', label: 'C2 Proficient', shortLabel: 'C2' },
  },
};

export const bundleLevelOptions = Object.entries(bundleLevelMap).map(([value, labels]) => ({
  value: Number(value),
  ...labels.ko,
}));

export function getBundleLevelDisplay(
  level: number | null | undefined,
  language: BundleLevelLanguage = 'ko'
): BundleLevelDisplay {
  const value = Number(level);
  const normalizedValue = Number.isFinite(value) && value > 0 ? value : 1;
  const display = bundleLevelMap[normalizedValue]?.[language];

  if (display) {
    return {
      value: normalizedValue,
      ...display,
    };
  }

  const fallbackLabel = language === 'ko' ? `미정 레벨 ${normalizedValue}` : `Unknown level ${normalizedValue}`;

  return {
    value: normalizedValue,
    code: `Level ${normalizedValue}`,
    label: fallbackLabel,
    shortLabel: `Level ${normalizedValue}`,
  };
}
