'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ImageIcon, Trash2, Plus, Loader2, Check, X } from 'lucide-react';
import { uploadThumbnail, deleteFileFromPublicUrl, listPublicUrlsInFolder } from '@/lib/supabase/services/storage';
import { compressImageForUpload } from '@/lib/image-compression';

interface BundleImageMapperProps {
  items: any[];
  onItemsUpdate: (updatedItems: { [key: string]: string | null }) => void;
  uploadFolder?: string;
}

export default function BundleImageMapper({ items, onItemsUpdate, uploadFolder = 'bundles' }: BundleImageMapperProps) {
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [folderImageUrls, setFolderImageUrls] = useState<string[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [mappings, setMappings] = useState<{ [key: string]: string | null }>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.image_url || null }), {})
  );
  const [isUploading, setIsUploading] = useState(false);

  const uniqueImages = useMemo(() => {
    const mappedImages = Object.values(mappings).filter(Boolean) as string[];
    return Array.from(new Set([...mappedImages, ...folderImageUrls, ...uploadedImageUrls]));
  }, [mappings, folderImageUrls, uploadedImageUrls]);

  useEffect(() => {
    let isMounted = true;

    const loadFolderImages = async () => {
      try {
        const urls = await listPublicUrlsInFolder(uploadFolder);
        if (isMounted) {
          setFolderImageUrls(urls);
        }
      } catch (err) {
        console.error('Failed to load bundle images:', err);
      }
    };

    loadFolderImages();

    return () => {
      isMounted = false;
    };
  }, [uploadFolder]);

  useEffect(() => {
    if (!selectedImageUrl && uniqueImages.length > 0) {
      setSelectedImageUrl(uniqueImages[0]);
      return;
    }

    if (selectedImageUrl && !uniqueImages.includes(selectedImageUrl)) {
      setSelectedImageUrl(uniqueImages[0] || null);
    }
  }, [selectedImageUrl, uniqueImages]);

  const handleToggleItem = (itemId: string) => {
    if (!selectedImageUrl) return;

    const newMappings = { ...mappings };
    if (newMappings[itemId] === selectedImageUrl) {
      newMappings[itemId] = null;
    } else {
      newMappings[itemId] = selectedImageUrl;
    }
    setMappings(newMappings);
    onItemsUpdate(newMappings);
  };

  const handleConnectAll = () => {
    if (!selectedImageUrl) return;

    const newMappings = items.reduce(
      (acc, item) => ({ ...acc, [item.id]: selectedImageUrl }),
      {} as { [key: string]: string | null }
    );

    setMappings(newMappings);
    onItemsUpdate(newMappings);
  };

  const handleDisconnectAll = () => {
    if (!selectedImageUrl) return;

    const newMappings = { ...mappings };
    Object.keys(newMappings).forEach(itemId => {
      if (newMappings[itemId] === selectedImageUrl) {
        newMappings[itemId] = null;
      }
    });

    setMappings(newMappings);
    onItemsUpdate(newMappings);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const compressedFile = await compressImageForUpload(file);
      const formData = new FormData();
      formData.append('file', compressedFile);

      const url = await uploadThumbnail(formData, uploadFolder);
      setSelectedImageUrl(url);
      setUploadedImageUrls(prev => Array.from(new Set([...prev, url])));
    } catch (err: any) {
      alert(err.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (url: string) => {
    if (!confirm('정말 이 이미지를 삭제하시겠습니까? 스토리지에서도 삭제되며 이 이미지를 사용하는 모든 문장의 연결이 해제됩니다.')) return;

    try {
      await deleteFileFromPublicUrl(url);
      
      const newMappings = { ...mappings };
      Object.keys(newMappings).forEach(id => {
        if (newMappings[id] === url) newMappings[id] = null;
      });
      
      setMappings(newMappings);
      onItemsUpdate(newMappings);
      setUploadedImageUrls(prev => prev.filter(uploadedUrl => uploadedUrl !== url));
      setFolderImageUrls(prev => prev.filter(folderUrl => folderUrl !== url));
      
      if (selectedImageUrl === url) {
        setSelectedImageUrl(null);
      }
    } catch (err) {
      alert('이미지 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="bg-gray-50 rounded-3xl border border-gray-100 p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-500" />
          이미지-아이템 매핑 도구
        </h3>
        <p className="text-xs text-gray-400">이미지를 선택하고 오른쪽 번호를 클릭하여 연결하세요.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Unique Images Grid */}
        <div className="lg:w-1/2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-bold text-gray-700">사용된 이미지 목록 ({uniqueImages.length})</span>
            <label className="cursor-pointer group flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">이미지 추가</span>
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {uniqueImages.map((url, i) => (
              <div 
                key={i}
                onClick={() => setSelectedImageUrl(url)}
                className={`relative aspect-video rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${selectedImageUrl === url ? 'border-blue-500 ring-4 ring-blue-50 shadow-lg' : 'border-white hover:border-gray-200'}`}
              >
                <Image src={url} alt={`Bundle image ${i}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, 180px" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteImage(url); }}
                    className="p-1.5 bg-black/40 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 lg:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {selectedImageUrl === url && (
                  <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                    <div className="bg-blue-500 text-white p-1 rounded-full">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                )}
                {/* Count badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[10px] text-white font-bold">
                  {Object.values(mappings).filter(m => m === url).length}개 연결
                </div>
              </div>
            ))}
            
            {isUploading && (
              <div className="aspect-video rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            )}

            {uniqueImages.length === 0 && !isUploading && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-300">
                <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                <span className="text-xs font-medium">등록된 이미지가 없습니다.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Item Numbers Grid */}
        <div className="lg:w-1/2 space-y-4">
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold text-gray-700">문장 연결 ({items.length})</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={!selectedImageUrl || items.length === 0}
                onClick={handleConnectAll}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                전체 연결
              </button>
              <button
                disabled={!selectedImageUrl || Object.values(mappings).every(url => url !== selectedImageUrl)}
                onClick={handleDisconnectAll}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                전체 해제
              </button>
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full" /> 선택됨</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-300 rounded-full" /> 타 이미지</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 border border-gray-300 rounded-full" /> 미연결</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-6 gap-2">
            {items.map((item, idx) => {
              const currentUrl = mappings[item.id];
              const isSelected = selectedImageUrl && currentUrl === selectedImageUrl;
              const hasOther = currentUrl && currentUrl !== selectedImageUrl;
              
              return (
                <button
                  key={item.id}
                  disabled={!selectedImageUrl}
                  onClick={() => handleToggleItem(item.id)}
                  title={item.sentences?.sentence || item.words?.word}
                  className={`
                    aspect-square rounded-xl text-xs font-black transition-all flex items-center justify-center border-2
                    ${isSelected 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 scale-105 z-10' 
                      : hasOther
                      ? 'bg-gray-200 border-gray-200 text-gray-400'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-500'
                    }
                    ${!selectedImageUrl ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {(idx + 1).toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>
          
          {!selectedImageUrl && (
            <p className="text-center py-8 text-xs text-amber-500 font-medium bg-amber-50 rounded-2xl border border-amber-100">
              이미지를 먼저 선택하거나 추가하세요.
            </p>
          )}

          {selectedImageUrl && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">선택된 이미지 정보</span>
              <div className="flex items-center gap-3">
                <Image
                  src={selectedImageUrl}
                  alt="Selected bundle image"
                  width={48}
                  height={32}
                  className="h-8 w-12 rounded-md border border-white object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 truncate font-mono">{selectedImageUrl}</p>
                </div>
                <button onClick={() => setSelectedImageUrl(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
