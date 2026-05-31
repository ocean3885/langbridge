import Image from 'next/image';
import { cn } from '@/lib/utils';
import { characterAssets, getCharacterAssetUrl, type CharacterAssetName } from '@/lib/assets/character-assets';

interface CharacterAssetProps {
  name: CharacterAssetName;
  alt?: string;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function CharacterAsset({
  name,
  alt,
  size = 96,
  width,
  height,
  className,
  imageClassName,
  priority = false,
}: CharacterAssetProps) {
  const asset = characterAssets[name];
  const imageWidth = width ?? size;
  const imageHeight = height ?? size;

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: imageWidth, height: imageHeight }}
    >
      <Image
        src={getCharacterAssetUrl(name)}
        alt={alt ?? asset.alt}
        width={imageWidth}
        height={imageHeight}
        priority={priority}
        className={cn('h-full w-full object-contain', imageClassName)}
      />
    </span>
  );
}
