'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileImage,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadProcessedAsset } from './actions';

type AssetStatus = 'ready' | 'processing' | 'uploading' | 'done' | 'error';

interface AssetItem {
  id: string;
  file: File;
  originalName: string;
  originalSize: number;
  outputName: string;
  storagePath: string;
  status: AssetStatus;
  width?: number;
  height?: number;
  outputSize?: number;
  previewUrl?: string;
  publicUrl?: string;
  error?: string;
}

interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

interface AssetManagerProps {
  bucket: string;
}

const DEFAULT_FOLDER = 'assets/characters';

function normalizeFolder(value: string) {
  return value
    .split('/')
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-'))
    .filter(Boolean)
    .join('/');
}

function slugifyFilename(value: string) {
  const withoutExt = value.replace(/\.[^/.]+$/, '');
  const slug = withoutExt
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || `asset-${Date.now()}`;
}

function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getUniquePath(folder: string, name: string, existingPaths: Set<string>) {
  const basePath = folder ? `${folder}/${name}` : name;
  if (!existingPaths.has(basePath)) {
    existingPaths.add(basePath);
    return basePath;
  }

  const extIndex = name.lastIndexOf('.');
  const baseName = extIndex >= 0 ? name.slice(0, extIndex) : name;
  const ext = extIndex >= 0 ? name.slice(extIndex) : '';
  let index = 2;

  while (true) {
    const candidate = folder ? `${folder}/${baseName}-${index}${ext}` : `${baseName}-${index}${ext}`;
    if (!existingPaths.has(candidate)) {
      existingPaths.add(candidate);
      return candidate;
    }
    index += 1;
  }
}

async function processImage(file: File, maxSize: number, quality: number): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('이미지 변환을 위한 캔버스를 만들 수 없습니다.');
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('WebP 변환에 실패했습니다.'));
      },
      'image/webp',
      quality,
    );
  });

  return {
    blob,
    width,
    height,
    previewUrl: URL.createObjectURL(blob),
  };
}

export default function AssetManager({ bucket }: AssetManagerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [folder, setFolder] = useState(DEFAULT_FOLDER);
  const [maxSize, setMaxSize] = useState(1024);
  const [quality, setQuality] = useState(0.86);
  const [upsert, setUpsert] = useState(false);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedType, setCopiedType] = useState<'paths' | 'urls' | 'json' | null>(null);

  const normalizedFolder = normalizeFolder(folder);
  const completedAssets = assets.filter((asset) => asset.status === 'done' && asset.publicUrl);
  const hasQueuedAssets = assets.some((asset) => asset.status === 'ready' || asset.status === 'error');
  const completedPaths = completedAssets.map((asset) => asset.storagePath).join('\n');
  const completedUrls = completedAssets.map((asset) => asset.publicUrl).join('\n');
  const completedJson = JSON.stringify(
    completedAssets.map((asset) => ({
      name: asset.outputName.replace(/\.webp$/, ''),
      path: asset.storagePath,
      url: asset.publicUrl,
      width: asset.width,
      height: asset.height,
    })),
    null,
    2,
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const imageFiles = Array.from(fileList).filter((file) => file.type === 'image/png');
    const existingPaths = new Set(assets.map((asset) => asset.storagePath));

    const nextAssets = imageFiles.map((file) => {
      const outputName = `${slugifyFilename(file.name)}.webp`;
      const storagePath = getUniquePath(normalizedFolder, outputName, existingPaths);

      return {
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        originalName: file.name,
        originalSize: file.size,
        outputName,
        storagePath,
        status: 'ready' as AssetStatus,
      };
    });

    setAssets((prev) => [...prev, ...nextAssets]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const updateAsset = (id: string, patch: Partial<AssetItem>) => {
    setAssets((prev) => prev.map((asset) => (asset.id === id ? { ...asset, ...patch } : asset)));
  };

  const uploadAssets = async () => {
    const targets = assets.filter((asset) => asset.status === 'ready' || asset.status === 'error');
    if (targets.length === 0) return;

    setIsUploading(true);

    for (const asset of targets) {
      try {
        updateAsset(asset.id, { status: 'processing', error: undefined });
        const processed = await processImage(asset.file, maxSize, quality);

        updateAsset(asset.id, {
          status: 'uploading',
          width: processed.width,
          height: processed.height,
          outputSize: processed.blob.size,
          previewUrl: processed.previewUrl,
        });

        const formData = new FormData();
        formData.append('file', processed.blob, asset.outputName);
        formData.append('path', asset.storagePath);
        formData.append('upsert', String(upsert));

        const result = await uploadProcessedAsset(formData);
        if (!result.success || !result.publicUrl) {
          throw new Error(result.error || '업로드 중 오류가 발생했습니다.');
        }

        updateAsset(asset.id, { status: 'done', publicUrl: result.publicUrl });
      } catch (error) {
        updateAsset(asset.id, {
          status: 'error',
          error: error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.',
        });
      }
    }

    setIsUploading(false);
  };

  const clearAssets = () => {
    assets.forEach((asset) => {
      if (asset.previewUrl) URL.revokeObjectURL(asset.previewUrl);
    });
    setAssets([]);
    setCopiedType(null);
  };

  const copyResult = async (type: 'paths' | 'urls' | 'json', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedType(type);
    window.setTimeout(() => setCopiedType(null), 1400);
  };

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background md:ml-64 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">에셋 관리</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              PNG 이미지를 브라우저에서 리사이징하고 WebP로 변환한 뒤 Supabase Storage에 업로드합니다.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            bucket: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{bucket}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_180px_180px]">
                <div className="space-y-2">
                  <Label htmlFor="asset-folder">Storage 경로</Label>
                  <Input
                    id="asset-folder"
                    value={folder}
                    onChange={(event) => setFolder(event.target.value)}
                    placeholder="assets/characters"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    실제 저장 경로: {normalizedFolder || '(bucket root)'}/파일명.webp
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset-max-size">최대 변 길이</Label>
                  <Input
                    id="asset-max-size"
                    type="number"
                    min={64}
                    max={4096}
                    value={maxSize}
                    onChange={(event) => setMaxSize(Number(event.target.value) || 1024)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset-quality">WebP 품질</Label>
                  <Input
                    id="asset-quality"
                    type="number"
                    min={0.1}
                    max={1}
                    step={0.01}
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value) || 0.86)}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={upsert}
                    onChange={(event) => setUpsert(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  같은 경로의 파일 덮어쓰기
                </label>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png"
                    multiple
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" />
                    PNG 첨부
                  </Button>
                  <Button type="button" variant="outline" onClick={clearAssets} disabled={assets.length === 0 || isUploading}>
                    <RotateCcw className="h-4 w-4" />
                    비우기
                  </Button>
                  <Button type="button" onClick={uploadAssets} disabled={!hasQueuedAssets || isUploading}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    업로드
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">첨부 이미지</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{assets.length}개 대기/처리 중</p>
                </div>
              </div>

              {assets.length === 0 ? (
                <div
                  className="m-5 flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-center dark:border-zinc-700 dark:bg-zinc-950"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFiles(event.dataTransfer.files);
                  }}
                >
                  <FileImage className="h-12 w-12 text-zinc-400" />
                  <p className="mt-3 font-medium text-zinc-800 dark:text-zinc-100">PNG 파일을 선택하거나 끌어오세요.</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">여러 이미지를 한 번에 처리할 수 있습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
                  {assets.map((asset) => (
                    <div key={asset.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex gap-4">
                        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
                          {asset.previewUrl ? (
                            <Image src={asset.previewUrl} alt="" fill className="object-contain p-2" sizes="96px" unoptimized />
                          ) : (
                            <FileImage className="h-8 w-8 text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{asset.originalName}</p>
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {formatBytes(asset.originalSize)} {'->'} {formatBytes(asset.outputSize)}
                                {asset.width && asset.height ? ` / ${asset.width}x${asset.height}` : ''}
                              </p>
                            </div>
                            <StatusBadge status={asset.status} />
                          </div>

                          <button
                            type="button"
                            onClick={() => copyText(asset.storagePath)}
                            className="mt-3 flex w-full items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            <Clipboard className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{asset.storagePath}</span>
                          </button>

                          {asset.publicUrl && (
                            <a
                              href={asset.publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <Download className="h-3.5 w-3.5" />
                              업로드 URL 열기
                            </a>
                          )}

                          {asset.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{asset.error}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">업로드 결과</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                완료된 에셋 경로를 AI나 개발 작업에 바로 전달할 수 있습니다.
              </p>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                파일명을 컴포넌트명 기준으로 정리해 업로드한 뒤 터미널에서{' '}
                <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-950">
                  npm run generate:character-assets
                </code>
                를 실행하면 `assets/characters` 목록 기준으로 에셋 컴포넌트가 갱신됩니다.
              </div>
              <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-950 dark:border-zinc-800">
                <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-relaxed text-zinc-100">
                  <code>{completedPaths || '업로드 완료 후 Storage path가 여기에 표시됩니다.'}</code>
                </pre>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyResult('paths', completedPaths)}
                  disabled={completedAssets.length === 0}
                >
                  <Clipboard className="h-4 w-4" />
                  {copiedType === 'paths' ? '복사됨' : 'Path 복사'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyResult('urls', completedUrls)}
                  disabled={completedAssets.length === 0}
                >
                  <Clipboard className="h-4 w-4" />
                  {copiedType === 'urls' ? '복사됨' : 'URL 복사'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyResult('json', completedJson)}
                  disabled={completedAssets.length === 0}
                >
                  <Clipboard className="h-4 w-4" />
                  {copiedType === 'json' ? '복사됨' : 'JSON 복사'}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">처리 요약</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <SummaryItem label="전체" value={assets.length} />
                <SummaryItem label="완료" value={completedAssets.length} />
                <SummaryItem label="대기" value={assets.filter((asset) => asset.status === 'ready').length} />
                <SummaryItem label="오류" value={assets.filter((asset) => asset.status === 'error').length} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AssetStatus }) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        완료
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
        <XCircle className="h-3.5 w-3.5" />
        오류
      </span>
    );
  }

  if (status === 'processing' || status === 'uploading') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {status === 'processing' ? '변환' : '업로드'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      대기
    </span>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
