import { getPublicUrl } from '@/lib/utils';

export const characterAssets = {
  completebadge: {
    fileName: 'completebadge.webp',
    path: 'assets/characters/completebadge.webp',
    alt: 'Completebadge',
  },
  correct2full: {
    fileName: 'correct2full.webp',
    path: 'assets/characters/correct2full.webp',
    alt: 'Correct2full',
  },
  correct2half: {
    fileName: 'correct2half.webp',
    path: 'assets/characters/correct2half.webp',
    alt: 'Correct2half',
  },
  correctbadge: {
    fileName: 'correctbadge.webp',
    path: 'assets/characters/correctbadge.webp',
    alt: 'Correctbadge',
  },
  correctfull: {
    fileName: 'correctfull.webp',
    path: 'assets/characters/correctfull.webp',
    alt: 'Correctfull',
  },
  correcthalf: {
    fileName: 'correcthalf.webp',
    path: 'assets/characters/correcthalf.webp',
    alt: 'Correcthalf',
  },
  dailygoalbadge: {
    fileName: 'dailygoalbadge.webp',
    path: 'assets/characters/dailygoalbadge.webp',
    alt: 'Dailygoalbadge',
  },
  encouragebadge: {
    fileName: 'encouragebadge.webp',
    path: 'assets/characters/encouragebadge.webp',
    alt: 'Encouragebadge',
  },
  excellentfull: {
    fileName: 'excellentfull.webp',
    path: 'assets/characters/excellentfull.webp',
    alt: 'Excellentfull',
  },
  excellenthalf: {
    fileName: 'excellenthalf.webp',
    path: 'assets/characters/excellenthalf.webp',
    alt: 'Excellenthalf',
  },
  lincostudycard: {
    fileName: 'lincostudycard.webp',
    path: 'assets/characters/lincostudycard.webp',
    alt: 'Lincostudycard',
  },
  listenbadge: {
    fileName: 'listenbadge.webp',
    path: 'assets/characters/listenbadge.webp',
    alt: 'Listenbadge',
  },
  reviewbadge: {
    fileName: 'reviewbadge.webp',
    path: 'assets/characters/reviewbadge.webp',
    alt: 'Reviewbadge',
  },
  scramblebadge: {
    fileName: 'scramblebadge.webp',
    path: 'assets/characters/scramblebadge.webp',
    alt: 'Scramblebadge',
  },
  streakbadge: {
    fileName: 'streakbadge.webp',
    path: 'assets/characters/streakbadge.webp',
    alt: 'Streakbadge',
  },
  studyfull: {
    fileName: 'studyfull.webp',
    path: 'assets/characters/studyfull.webp',
    alt: 'Studyfull',
  },
  studyhalf: {
    fileName: 'studyhalf.webp',
    path: 'assets/characters/studyhalf.webp',
    alt: 'Studyhalf',
  },
  tryagain2half: {
    fileName: 'tryagain2half.webp',
    path: 'assets/characters/tryagain2half.webp',
    alt: 'Tryagain2half',
  },
  tryagainbadge: {
    fileName: 'tryagainbadge.webp',
    path: 'assets/characters/tryagainbadge.webp',
    alt: 'Tryagainbadge',
  },
  tryagainhalf: {
    fileName: 'tryagainhalf.webp',
    path: 'assets/characters/tryagainhalf.webp',
    alt: 'Tryagainhalf',
  },
  welcomebadge: {
    fileName: 'welcomebadge.webp',
    path: 'assets/characters/welcomebadge.webp',
    alt: 'Welcomebadge',
  },
  welcomefull: {
    fileName: 'welcomefull.webp',
    path: 'assets/characters/welcomefull.webp',
    alt: 'Welcomefull',
  },
  welcomehalf: {
    fileName: 'welcomehalf.webp',
    path: 'assets/characters/welcomehalf.webp',
    alt: 'Welcomehalf',
  },
} as const;

export type CharacterAssetName = keyof typeof characterAssets;

export function getCharacterAssetUrl(name: CharacterAssetName) {
  return getPublicUrl(characterAssets[name].path) ?? characterAssets[name].path;
}
