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
import { User as UserIcon, AudioLines, LogOut, Video, BookOpen, Globe, MessageSquare, Layers, Sun, Moon } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  userEmail: string | null;
  isAdmin: boolean;
  language?: 'ko' | 'en';
}

const translations = {
  ko: {
    study: '학습',
    create: '생성',
    board: '게시판',
    admin: '운영관리',
    login: '로그인',
    myAccount: '내 계정',
    lbVideos: 'LB 영상',
    bundles: '학습 번들',
    myVideos: '내 영상',
    profile: '프로필',
    logout: '로그아웃',
  },
  en: {
    study: 'Study',
    create: 'Create',
    board: 'Board',
    admin: 'Admin',
    login: 'Login',
    myAccount: 'My Account',
    lbVideos: 'LB Videos',
    bundles: 'Learning Bundles',
    myVideos: 'My Videos',
    profile: 'Profile',
    logout: 'Logout',
  }
};

export default function HeaderClient({ isLoggedIn, userEmail, isAdmin, language = 'ko' }: Props) {
  const t = translations[language];
  const supabase = createClient();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    // 초기 테마 확인
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogout = async () => {
    try {
      const logoutRes = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!logoutRes.ok) {
        const body = await logoutRes.json().catch(() => ({}));
        throw new Error(body?.error || '로그아웃 처리 실패');
      }

      await supabase.auth.signOut();
      // 강제 새로고침으로 상태 초기화
      window.location.href = '/';
    } catch (err) {
      console.error('Logout exception:', err);
      alert(language === 'ko' ? '로그아웃 중 오류가 발생했습니다.' : 'Error during logout.');
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
                <span className="opacity-70">...</span>
              </div>
              <Link href={`/auth/login?redirectTo=${encodeURIComponent(pathname)}`} className="bg-blue-600 py-2 px-3 sm:px-4 rounded whitespace-nowrap">
                {t.login}
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
              <div className="flex items-center gap-3 sm:gap-4 font-medium">
                <Link href="/my-videos" className="hover:text-amber-300 transition-colors duration-150 whitespace-nowrap">
                  {t.study}
                </Link>
                <Link href="/upload" className="hover:text-blue-300 transition-colors duration-150 whitespace-nowrap">
                  {t.create}
                </Link>
                <Link href="/board" className="hover:text-blue-300 transition duration-150">
                  {t.board}
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="hover:text-blue-300 transition duration-150">
                    {t.admin}
                  </Link>
                )}
              </div>

              {/* 테마 토글 */}
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors flex-shrink-0 border border-gray-600"
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4 text-amber-300" /> : <Sun className="w-4 h-4 text-yellow-400" />}
              </button>

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
                  <DropdownMenuLabel>{t.myAccount}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/lb-videos" className="flex items-center gap-2 cursor-pointer">
                      <Globe className="w-4 h-4" />
                      <span>{t.lbVideos}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bundles" className="flex items-center gap-2 cursor-pointer">
                      <Layers className="w-4 h-4" />
                      <span>{t.bundles}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-videos" className="flex items-center gap-2 cursor-pointer">
                      <Video className="w-4 h-4" />
                      <span>{t.myVideos}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <UserIcon className="w-4 h-4" />
                      <span>{t.profile}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              ) : (
              <Link
                href={`/auth/login?redirectTo=${encodeURIComponent(pathname)}`}
                className="bg-blue-600 hover:bg-blue-700 py-2 px-3 sm:px-4 rounded transition duration-150 whitespace-nowrap"
              >
                {t.login}
              </Link>
              )}
            </div>
              </div>
          </nav>
    </header>
  );
}
