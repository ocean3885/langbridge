'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User as UserIcon, LogOut, Video, Globe, Layers, Sun, Moon } from 'lucide-react';

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
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
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
      window.location.href = '/';
    } catch (err) {
      console.error('Logout exception:', err);
      alert(language === 'ko' ? '로그아웃 중 오류가 발생했습니다.' : 'Error during logout.');
    }
  };

  const handleLangUpdate = (newLang: 'ko' | 'en') => {
    // 회원/비회원 구분 없이 브라우저 쿠키에 언어 설정 저장 (1년 유지)
    document.cookie = `lb_display_language=${newLang}; path=/; max-age=31536000`;
    // 부드러운 서버 컴포넌트 리렌더링 (하드 새로고침 방지)
    router.refresh();
  };

  // --- UI Fragment Renderers ---

  const renderLogo = (isMobile: boolean) => (
    <Link href="/" className={`flex items-center shrink-0 group transition-transform active:scale-95 ${isMobile ? 'gap-2' : 'gap-2.5 md:gap-3'}`}>
      <div className={`relative ${isMobile ? 'h-9 w-9' : 'h-12 w-12 md:h-14 md:w-14'}`}>
        <Image 
          src="/images/logo_bg.png" 
          alt="Logo" 
          fill
          priority
          sizes="(max-width: 640px) 36px, 56px"
          className="object-contain drop-shadow-xl" 
        />
      </div>
      <span className={`font-black tracking-tighter text-white ${isMobile ? 'text-lg' : 'text-2xl md:text-3xl'}`}>
        LangBridge
      </span>
    </Link>
  );

  const renderToggles = (isMobile: boolean) => (
    <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-2.5'}`}>
      {/* Language */}
      <div className={`flex items-center bg-gray-800 rounded-full border border-gray-700 shadow-inner ${isMobile ? 'p-1' : 'p-1'}`}>
        <button 
          onClick={() => handleLangUpdate('ko')}
          className={`font-black rounded-full transition-all duration-200 ${language === 'ko' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'} ${isMobile ? 'text-[10px] px-2.5 py-1' : 'text-[11px] px-3 py-1'}`}
        >
          KO
        </button>
        <button 
          onClick={() => handleLangUpdate('en')}
          className={`font-black rounded-full transition-all duration-200 ${language === 'en' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'} ${isMobile ? 'text-[10px] px-2.5 py-1' : 'text-[11px] px-3 py-1'}`}
        >
          EN
        </button>
      </div>
      {/* Theme */}
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className={`flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-all border border-gray-700 font-black uppercase tracking-tighter shadow-inner ${isMobile ? 'p-1' : 'gap-2 p-1 pl-3 pr-1 text-[11px]'}`}
      >
        {!isMobile && <span className="text-gray-400">{theme === 'light' ? 'Light' : 'Dark'}</span>}
        <div className={`flex items-center justify-center rounded-full shadow-sm ${theme === 'light' ? 'bg-amber-400' : 'bg-blue-600'} ${isMobile ? 'p-1' : 'p-1'}`}>
          {theme === 'light' ? <Sun className={`text-white ${isMobile ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'}`} /> : <Moon className={`text-white ${isMobile ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'}`} />}
        </div>
      </button>
    </div>
  );

  const renderMenu = (isMobile: boolean) => (
    <div className={`flex items-center font-bold tracking-tighter text-gray-400 ${isMobile ? 'gap-4 text-sm uppercase' : 'gap-5 md:gap-8 text-sm md:text-base'}`}>
      <Link href="/my-videos" className="hover:text-white transition-colors whitespace-nowrap">{t.study}</Link>
      <Link href="/upload" className="hover:text-white transition-colors whitespace-nowrap">{t.create}</Link>
      <Link href="/board" className="hover:text-white transition-colors whitespace-nowrap">{t.board}</Link>
      {isAdmin && (
        <Link href="/admin" className="hover:text-white transition-colors whitespace-nowrap">{t.admin}</Link>
      )}
    </div>
  );

  const renderAccount = (isMobile: boolean) => (
    <div className="shrink-0">
      {isLoggedIn ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95 ${isMobile ? 'gap-1.5 py-1.5 px-2.5' : 'gap-2 py-1.5 px-3'}`}>
              <div className={`rounded-full bg-white flex items-center justify-center text-blue-600 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`}>
                <UserIcon className={isMobile ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'} strokeWidth={3} />
              </div>
              <span className={`hidden xs:inline font-bold truncate ${isMobile ? 'text-[11px] max-w-[70px]' : 'text-xs max-w-[100px]'}`}>{userEmail}</span>
            </button>

          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.myAccount}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/lb-videos" className="flex items-center gap-2 cursor-pointer py-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="font-bold">{t.lbVideos}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/bundles" className="flex items-center gap-2 cursor-pointer py-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <span className="font-bold">{t.bundles}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my-videos" className="flex items-center gap-2 cursor-pointer py-2">
                <Video className="w-4 h-4 text-green-500" />
                <span className="font-bold">{t.myVideos}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2 cursor-pointer py-2">
                <UserIcon className="w-4 h-4 text-orange-500" />
                <span className="font-bold">{t.profile}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-500 focus:text-red-500 cursor-pointer py-2">
              <LogOut className="w-4 h-4" />
              <span className="font-bold">{t.logout}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href={`/auth/login?redirectTo=${encodeURIComponent(pathname)}`} className={`bg-blue-600 hover:bg-blue-700 rounded-full font-bold shadow-lg shadow-blue-500/20 active:scale-95 ${isMobile ? 'py-1 px-3 text-[10px]' : 'py-1.5 px-4 text-xs'}`}>
          {t.login}
        </Link>
      )}
    </div>
  );

  if (!mounted) {
    return (
      <header className="bg-gray-900 text-white shadow-xl sm:sticky sm:top-0 z-50 border-b border-gray-800">
        <nav className="container mx-auto px-4 py-3 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 sm:w-14 sm:h-14 bg-gray-800 animate-pulse rounded-lg" />
            <div className="w-24 sm:w-32 h-6 bg-gray-800 animate-pulse rounded" />
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-gray-900 text-white shadow-xl sm:sticky sm:top-0 z-50 border-b border-gray-800">
      {/* 1. Mobile Layout (< 640px) */}
      <nav className="container mx-auto px-3 py-2 sm:hidden flex flex-col gap-2.5">
        {/* Mobile Row 1 */}
        <div className="flex items-center justify-between">
          {renderLogo(true)}
          {renderToggles(true)}
        </div>
        {/* Mobile Row 2 */}
        <div className="flex items-center justify-between">
          {renderMenu(true)}
          {renderAccount(true)}
        </div>
      </nav>

      {/* 2. Tablet & Desktop Layout (>= 640px) */}
      <nav className="container mx-auto px-4 py-3 md:py-4 hidden sm:flex items-stretch gap-6 md:gap-10">
        {/* Left: Large Spanning Logo */}
        {renderLogo(false)}
        
        {/* Right: Multi-row Content */}
        <div className="flex-1 flex flex-col justify-center gap-2 md:gap-3 min-w-0 py-0.5">
          {/* Top Row: Settings & Account */}
          <div className="flex items-center justify-end gap-3 md:gap-4">
            {renderToggles(false)}
            <div className="ml-1 md:ml-2">
              {renderAccount(false)}
            </div>
          </div>
          {/* Bottom Row: Main Menu */}
          <div className="flex items-center justify-end">
            {renderMenu(false)}
          </div>
        </div>
      </nav>
    </header>
  );
}
