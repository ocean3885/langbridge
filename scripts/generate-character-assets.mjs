import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STORAGE_FOLDER = 'assets/characters';
const MANIFEST_PATH = 'lib/assets/character-assets.ts';
const RENDERER_PATH = 'components/assets/CharacterAsset.tsx';
const BADGES_PATH = 'components/assets/CharacterBadges.tsx';
const INDEX_PATH = 'components/assets/index.ts';

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // The script can still run when env vars are provided by the shell/CI.
  }
}

function toPascalCase(fileName) {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const parts = baseName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  const componentName = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  if (!componentName) return null;
  return /^[0-9]/.test(componentName) ? `Asset${componentName}` : componentName;
}

function toCamelCase(pascalName) {
  return pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
}

function escapeSingleQuote(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function createUniqueName(name, usedNames) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  let index = 2;
  while (usedNames.has(`${name}${index}`)) {
    index += 1;
  }

  const uniqueName = `${name}${index}`;
  usedNames.add(uniqueName);
  return uniqueName;
}

loadEnvFile(join(process.cwd(), '.env.local'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'langbridge';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.storage.from(bucket).list(STORAGE_FOLDER, {
  limit: 1000,
  sortBy: { column: 'name', order: 'asc' },
});

if (error) {
  throw new Error(`Failed to list ${STORAGE_FOLDER}: ${error.message}`);
}

const usedNames = new Set();
const assets = (data || [])
  .filter((entry) => entry.name.toLowerCase().endsWith('.webp'))
  .map((entry) => {
    const pascalName = createUniqueName(toPascalCase(entry.name), usedNames);
    const key = toCamelCase(pascalName);
    const path = `${STORAGE_FOLDER}/${entry.name}`;

    return {
      key,
      componentName: `${pascalName}Asset`,
      fileName: entry.name,
      path,
      alt: pascalName.replace(/([a-z0-9])([A-Z])/g, '$1 $2'),
    };
  });

if (assets.length === 0) {
  throw new Error(`No .webp files found in ${bucket}/${STORAGE_FOLDER}. Existing generated files were not changed.`);
}

const manifest = `import { getPublicUrl } from '@/lib/utils';

export const characterAssets = {
${assets
  .map(
    (asset) => `  ${asset.key}: {
    fileName: '${escapeSingleQuote(asset.fileName)}',
    path: '${escapeSingleQuote(asset.path)}',
    alt: '${escapeSingleQuote(asset.alt)}',
  },`,
  )
  .join('\n')}
} as const;

export type CharacterAssetName = keyof typeof characterAssets;

export function getCharacterAssetUrl(name: CharacterAssetName) {
  return getPublicUrl(characterAssets[name].path) ?? characterAssets[name].path;
}
`;

const renderer = `import Image from 'next/image';
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
`;

const badges = `import type * as React from 'react';
import { CharacterAsset } from './CharacterAsset';
import type { CharacterAssetName } from '@/lib/assets/character-assets';

type NamedCharacterAssetProps = Omit<React.ComponentProps<typeof CharacterAsset>, 'name'>;

function createCharacterAsset(name: CharacterAssetName) {
  return function NamedCharacterAsset(props: NamedCharacterAssetProps) {
    return <CharacterAsset name={name} {...props} />;
  };
}

${assets
  .map((asset) => `export const ${asset.componentName} = createCharacterAsset('${asset.key}');`)
  .join('\n')}
`;

const index = `export { CharacterAsset } from './CharacterAsset';
export * from './CharacterBadges';
export {
  characterAssets,
  getCharacterAssetUrl,
  type CharacterAssetName,
} from '@/lib/assets/character-assets';
`;

writeFileSync(MANIFEST_PATH, manifest);
writeFileSync(RENDERER_PATH, renderer);
writeFileSync(BADGES_PATH, badges);
writeFileSync(INDEX_PATH, index);

console.log(`Generated ${assets.length} character assets from ${bucket}/${STORAGE_FOLDER}`);
for (const asset of assets) {
  console.log(`- ${asset.fileName} -> ${asset.componentName}`);
}
