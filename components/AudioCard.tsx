'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface AudioCardProps {
  audio: {
    id: number;
    title: string;
    created_at: string;
  };
  isLoggedIn: boolean;
}

export default function AudioCard({ audio, isLoggedIn }: AudioCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!isLoggedIn) {
      // 로그인 페이지로 리다이렉트 (현재 페이지로 돌아올 수 있도록)
      router.push(`/auth/login?redirectTo=/player/${audio.id}`);
    } else {
      // 플레이어 페이지로 이동
      router.push(`/player/${audio.id}`);
    }
  };

  return (
    <Card 
      onClick={handleClick}
      className="hover:shadow-lg transition-shadow cursor-pointer h-full"
    >
      <CardHeader>
        <CardTitle className="text-lg hover:text-blue-600 transition-colors">
          {audio.title || '제목 없음'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{new Date(audio.created_at).toLocaleDateString('ko-KR')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
