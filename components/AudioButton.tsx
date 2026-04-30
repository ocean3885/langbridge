'use client';

import { Volume2 } from 'lucide-react';

interface AudioButtonProps {
  fullSrc: string | null;
}

export default function AudioButton({ fullSrc }: AudioButtonProps) {
  if (!fullSrc) return null;

  return (
    <button 
      onClick={(e) => {
        e.preventDefault();
        const audio = new Audio(fullSrc);
        audio.play().catch(console.error);
      }}
      className="p-2 text-gray-400 hover:text-blue-500 transition-colors bg-white rounded-full shadow-sm border border-gray-100 hover:shadow-md"
      title="발음 듣기"
    >
      <Volume2 className="w-4 h-4" />
    </button>
  );
}
