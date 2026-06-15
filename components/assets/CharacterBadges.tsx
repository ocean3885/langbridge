import type * as React from 'react';
import { CharacterAsset } from './CharacterAsset';
import type { CharacterAssetName } from '@/lib/assets/character-assets';

type NamedCharacterAssetProps = Omit<React.ComponentProps<typeof CharacterAsset>, 'name'>;

function createCharacterAsset(name: CharacterAssetName) {
  return function NamedCharacterAsset(props: NamedCharacterAssetProps) {
    return <CharacterAsset name={name} {...props} />;
  };
}

export const CompletebadgeAsset = createCharacterAsset('completebadge');
export const Correct2fullAsset = createCharacterAsset('correct2full');
export const Correct2halfAsset = createCharacterAsset('correct2half');
export const CorrectbadgeAsset = createCharacterAsset('correctbadge');
export const CorrectfullAsset = createCharacterAsset('correctfull');
export const CorrecthalfAsset = createCharacterAsset('correcthalf');
export const DailygoalbadgeAsset = createCharacterAsset('dailygoalbadge');
export const EncouragebadgeAsset = createCharacterAsset('encouragebadge');
export const ExcellentfullAsset = createCharacterAsset('excellentfull');
export const ExcellenthalfAsset = createCharacterAsset('excellenthalf');
export const LearnCtaImgAsset = createCharacterAsset('learnCtaImg');
export const LincostudycardAsset = createCharacterAsset('lincostudycard');
export const ListenbadgeAsset = createCharacterAsset('listenbadge');
export const ReviewbadgeAsset = createCharacterAsset('reviewbadge');
export const ScramblebadgeAsset = createCharacterAsset('scramblebadge');
export const StreakbadgeAsset = createCharacterAsset('streakbadge');
export const StudyfullAsset = createCharacterAsset('studyfull');
export const StudyhalfAsset = createCharacterAsset('studyhalf');
export const Tryagain2halfAsset = createCharacterAsset('tryagain2half');
export const TryagainbadgeAsset = createCharacterAsset('tryagainbadge');
export const TryagainhalfAsset = createCharacterAsset('tryagainhalf');
export const WelcomebadgeAsset = createCharacterAsset('welcomebadge');
export const WelcomefullAsset = createCharacterAsset('welcomefull');
export const WelcomehalfAsset = createCharacterAsset('welcomehalf');
