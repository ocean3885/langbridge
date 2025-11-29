'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User as UserIcon, AudioLines, LogOut, Video } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  userEmail: string | null;
  isAdmin: boolean;
}

export default function HeaderClient({ isLoggedIn, userEmail, isAdmin }: Props) {
  const supabase = createClient();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error.message);
        alert('로그아웃 중 오류가 발생했습니다: ' + error.message);
        return;
      }
      // 강제 새로고침으로 상태 초기화
      window.location.href = '/';
    } catch (err) {
      console.error('Logout exception:', err);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // Hydration 문제 방지: 클라이언트에서만 Radix UI 렌더링
  if (!mounted) {
    return (
      <header className="bg-gray-800 text-white px-4 py-3 shadow-xl sm:sticky sm:top-0 z-50">
        <nav className="container mx-auto">
          <div className="w-full flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* 로고 */}
            <div className="flex justify-center sm:justify-start items-center gap-3">
              <Link href="/" aria-label="홈으로 이동" className="flex items-center flex-shrink-0 gap-2">
                <Image src="/images/logo_bg.png" alt="LangBridge 배경 로고" width={32} height={32} priority className="w-8 h-8" />
                <span className="font-bold tracking-wide text-white">LangBridge</span>
              </Link>
            </div>
            {/* 우측: 간단한 로그인 버튼 표시 */}
            <div className="w-full flex items-center justify-between sm:w-auto sm:justify-end gap-2 sm:gap-4 min-w-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="opacity-70">메뉴</span>
              </div>
              <Link href={`/auth/login?redirectTo=${encodeURIComponent(pathname)}`} className="bg-blue-600 py-2 px-3 sm:px-4 rounded whitespace-nowrap">
                로그인
              </Link>
            </div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-gray-800 text-white px-4 py-3 shadow-xl sm:sticky sm:top-0 z-50">
      <nav className="container mx-auto">
        {/* 래퍼: 모바일에선 두 줄(로고 중앙, 링크/계정은 justify-between), 데스크톱에선 한 줄 정렬 */}
        <div className="w-full flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* 1행: 로고 - 모바일 중앙, 데스크톱 좌측 */}
          <div className="flex justify-center sm:justify-start items-center gap-3">
            <Link
              href="/"
              aria-label="홈으로 이동"
              className="flex items-center flex-shrink-0 gap-2"
            >
              <Image
                src="/images/logo_bg.png"
                alt="LangBridge 배경 로고"
                width={32}
                height={32}
                priority
                className="w-8 h-8"
              />
              <span className="font-bold text-xl sm:text-2xl tracking-wide text-white">LangBridge</span>
            </Link>
            </div>

            {/* 2행: 링크/계정 - 모바일 전체폭 justify-between, 데스크톱 우측 정렬 */}
            <div className="w-full flex items-center justify-between sm:w-auto sm:justify-end gap-2 sm:gap-4 min-w-0">
              {/* 왼쪽 링크 그룹 */}
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/upload" className="hover:text-blue-300 transition duration-150">
                  생성
                </Link>
                <Link href="/videos" className="hover:text-blue-300 transition duration-150">
                  영상학습
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="hover:text-blue-300 transition duration-150">
                    운영관리
                  </Link>
                )}
              </div>

              {/* 오른쪽 계정/로그인 영역 */}
              {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 px-3 sm:px-4 rounded transition duration-150 whitespace-nowrap">
                    <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold">
                      {(userEmail ?? 'U')[0].toUpperCase()}
                    </div>
                    <span className="hidden md:inline max-w-[200px] truncate">{userEmail}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-audio" className="flex items-center gap-2 cursor-pointer">
                      <AudioLines className="w-4 h-4" />
                      <span>내 오디오</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-videos" className="flex items-center gap-2 cursor-pointer">
                      <Video className="w-4 h-4" />
                      <span>내 영상</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <UserIcon className="w-4 h-4" />
                      <span>프로필</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>로그아웃</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              ) : (
              <Link
                href={`/auth/login?redirectTo=${encodeURIComponent(pathname)}`}
                className="bg-blue-600 hover:bg-blue-700 py-2 px-3 sm:px-4 rounded transition duration-150 whitespace-nowrap"
              >
                로그인
              </Link>
              )}
            </div>
              </div>
          </nav>
    </header>
  );
}
