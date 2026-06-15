import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STORAGE_FOLDER = 'assets/characters';
const PUBLIC_FOLDER = 'assets/characters';
const PUBLIC_DIR = join('public', PUBLIC_FOLDER);
const MANIFEST_PATH = 'lib/assets/character-assets.ts';
const BADGES_PATH = 'components/assets/CharacterBadges.tsx';

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

function readTextFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function getExistingAssetKeys(manifest) {
  const keys = new Set();
  const keyPattern = /^  ([a-zA-Z_$][\w$]*): \{/gm;
  let match;

  while ((match = keyPattern.exec(manifest)) !== null) {
    keys.add(match[1]);
  }

  return keys;
}

function getExistingBadgeExports(badges) {
  const exports = new Set();
  const exportPattern = /^export const ([a-zA-Z_$][\w$]*) = createCharacterAsset\('([^']+)'\);$/gm;
  let match;

  while ((match = exportPattern.exec(badges)) !== null) {
    exports.add(match[2]);
  }

  return exports;
}

function createManifestEntry(asset) {
  return `  ${asset.key}: {
    fileName: '${escapeSingleQuote(asset.fileName)}',
    path: '${escapeSingleQuote(asset.publicPath)}',
    alt: '${escapeSingleQuote(asset.alt)}',
  },`;
}

function createManifest(assets) {
  return `export const characterAssets = {
${assets.map(createManifestEntry).join('\n')}
} as const;

export type CharacterAssetName = keyof typeof characterAssets;

export function getCharacterAssetUrl(name: CharacterAssetName) {
  return characterAssets[name].path;
}
`;
}

function appendManifestEntries(manifest, assets) {
  if (assets.length === 0) return manifest;

  const marker = '\n} as const;';
  const markerIndex = manifest.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Could not find manifest insertion point in ${MANIFEST_PATH}.`);
  }

  const insert = `${assets.map(createManifestEntry).join('\n')}\n`;
  return `${manifest.slice(0, markerIndex)}${insert}${manifest.slice(markerIndex)}`;
}

function createBadges(assets) {
  return `import type * as React from 'react';
import { CharacterAsset } from './CharacterAsset';
import type { CharacterAssetName } from '@/lib/assets/character-assets';

type NamedCharacterAssetProps = Omit<React.ComponentProps<typeof CharacterAsset>, 'name'>;

function createCharacterAsset(name: CharacterAssetName) {
  return function NamedCharacterAsset(props: NamedCharacterAssetProps) {
    return <CharacterAsset name={name} {...props} />;
  };
}

${assets.map((asset) => `export const ${asset.componentName} = createCharacterAsset('${asset.key}');`).join('\n')}
`;
}

function appendBadgeExports(badges, assets) {
  if (assets.length === 0) return badges;

  const suffix = `${assets
    .map((asset) => `export const ${asset.componentName} = createCharacterAsset('${asset.key}');`)
    .join('\n')}\n`;

  return badges.endsWith('\n') ? `${badges}${suffix}` : `${badges}\n${suffix}`;
}

loadEnvFile(join(process.cwd(), '.env.local'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'holalingo';

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

const manifestFile = readTextFile(MANIFEST_PATH);
const badgesFile = readTextFile(BADGES_PATH);
const existingKeys = manifestFile ? getExistingAssetKeys(manifestFile) : new Set();
const existingBadgeExports = badgesFile ? getExistingBadgeExports(badgesFile) : new Set();
const usedNames = new Set([...existingKeys].map((key) => key.charAt(0).toUpperCase() + key.slice(1)));
const assets = [];
const skippedAssets = [];

for (const entry of data || []) {
  if (!entry.name.toLowerCase().endsWith('.webp')) continue;

  const basePascalName = toPascalCase(entry.name);
  const baseKey = toCamelCase(basePascalName);
  const storagePath = `${STORAGE_FOLDER}/${entry.name}`;
  const publicPath = `/${PUBLIC_FOLDER}/${entry.name}`;

  if (existingKeys.has(baseKey)) {
    skippedAssets.push({
      key: baseKey,
      fileName: entry.name,
      storagePath,
      publicPath,
    });
    continue;
  }

  const pascalName = createUniqueName(basePascalName, usedNames);
  const key = toCamelCase(pascalName);

  assets.push({
    key,
    componentName: `${pascalName}Asset`,
    fileName: entry.name,
    storagePath,
    publicPath,
    alt: pascalName.replace(/([a-z0-9])([A-Z])/g, '$1 $2'),
  });
}

const webpCount = assets.length + skippedAssets.length;

if (webpCount === 0) {
  throw new Error(`No .webp files found in ${bucket}/${STORAGE_FOLDER}. Existing generated files were not changed.`);
}

mkdirSync(PUBLIC_DIR, { recursive: true });

const assetsToDownload = [...skippedAssets, ...assets].filter((asset) => !existsSync(join(PUBLIC_DIR, asset.fileName)));

for (const asset of assetsToDownload) {
  const { data: file, error: downloadError } = await supabase.storage.from(bucket).download(asset.storagePath);

  if (downloadError) {
    throw new Error(`Failed to download ${asset.storagePath}: ${downloadError.message}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(PUBLIC_DIR, asset.fileName), buffer);
}

if (assets.length > 0) {
  writeFileSync(MANIFEST_PATH, manifestFile ? appendManifestEntries(manifestFile, assets) : createManifest(assets));

  const badgeAssets = assets.filter((asset) => !existingBadgeExports.has(asset.key));
  writeFileSync(BADGES_PATH, badgesFile ? appendBadgeExports(badgesFile, badgeAssets) : createBadges(assets));
}

console.log(`Found ${webpCount} character assets from ${bucket}/${STORAGE_FOLDER}`);
console.log(`Added ${assets.length} new character assets`);
console.log(`Downloaded ${assetsToDownload.length} missing files to ${PUBLIC_DIR}`);
for (const asset of assets) {
  console.log(`- ${asset.storagePath} -> ${asset.publicPath} -> ${asset.componentName}`);
}
