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
import { User as UserIcon, LogOut, Video, Globe, Layers, Sun, Moon, Menu, X } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  userEmail: string | null;
  isAdmin: boolean;
  language?: 'ko' | 'en';
}

const translations = {
  ko: {
    study: 'Learn',
    create: '생성',
    board: '게시판',
    admin: '운영관리',
    login: '로그인',
    myAccount: '내 계정',
    lbVideos: 'LB 영상',
    bundles: 'Bundles',
    myVideos: '내 영상',
    profile: '프로필',
    logout: '로그아웃',
  },
  en: {
    study: 'Learn',
    create: 'Create',
    board: 'Board',
    admin: 'Admin',
    login: 'Login',
    myAccount: 'My Account',
    lbVideos: 'LB Videos',
    bundles: 'Bundles',
    myVideos: 'My Videos',
    profile: 'Profile',
    logout: 'Logout',
  }
};

export default function HeaderClient({ isLoggedIn, userEmail, isAdmin, language = 'en' }: Props) {
  const t = translations[language];
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isActiveNavItem = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
      const logoutRes = await fetch('/api/auth/logout', { method: 'POST' });
      if (!logoutRes.ok) throw new Error('로그아웃 처리 실패');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert(language === 'ko' ? '로그아웃 중 오류 발생' : 'Error during logout.');
    }
  };

  const handleLangUpdate = (newLang: 'ko' | 'en') => {
    document.cookie = `lb_display_language=${newLang}; path=/; max-age=31536000`;
    router.refresh();
  };

  if (!mounted) return <div className="h-16 bg-[#F9F7F2] dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800" />;

  return (
    <header className="sticky top-0 z-50 w-full bg-[#F9F7F2]/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 active:scale-95 transition-transform group">
          <div className="relative h-7 w-8 overflow-hidden shadow-sm">
            <Image
              src="/images/logo_bg.png"
              alt="Logo Background"
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-[#E27D60] transition-colors">
            HolaLingo
          </span>
        </Link>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          {[
            { name: t.study, href: '/learn' },
            { name: t.bundles, href: '/bundles' },
            ...(isAdmin ? [{ name: t.admin, href: '/admin' }] : [])
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 active:scale-95 ${isActiveNavItem(item.href)
                ? 'bg-[#DFF1E5] text-[#2F7D4A] dark:bg-emerald-500/18 dark:text-emerald-200'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-[#E27D60]'
                }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Language Toggle (Switch Style) */}
          <button
            onClick={() => handleLangUpdate(language === 'ko' ? 'en' : 'ko')}
            className="hidden sm:flex items-center bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-300/30 dark:border-zinc-700/30 cursor-pointer hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50 transition-colors group"
            title={language === 'ko' ? 'Switch to English' : '한국어로 변경'}
          >
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${language === 'ko' ? 'bg-white dark:bg-zinc-700 text-[#E27D60] shadow-sm' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`}
            >
              KO
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${language === 'en' ? 'bg-white dark:bg-zinc-700 text-[#E27D60] shadow-sm' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'}`}
            >
              EN
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-zinc-600 dark:text-zinc-400"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* User Account / Login */}
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden xs:block mx-1" />

          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 pl-1 pr-3 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95">
                  <div className="w-7 h-7 rounded-full bg-[#85A094] flex items-center justify-center text-white">
                    <UserIcon size={14} strokeWidth={3} />
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-zinc-700 dark:text-zinc-300 max-w-[100px] truncate">{userEmail}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 mt-2 p-2 rounded-[1.5rem] shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 animate-in fade-in zoom-in-95 duration-200"
              >
                <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                  {t.myAccount}
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="mx-2 mb-2 bg-zinc-100 dark:bg-zinc-800" />

                {[
                  { name: t.lbVideos, href: '/lb-videos', icon: <Globe size={18} />, color: 'text-blue-500', bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30' },
                  { name: t.bundles, href: '/bundles', icon: <Layers size={18} />, color: 'text-purple-500', bg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30' },
                  { name: t.myVideos, href: '/my-videos', icon: <Video size={18} />, color: 'text-emerald-500', bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
                  { name: t.profile, href: '/profile', icon: <UserIcon size={18} />, color: 'text-[#E27D60]', bg: 'hover:bg-orange-50 dark:hover:bg-orange-950/30' }
                ].map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 ${item.bg}`}
                    >
                      <div className={`${item.color}`}>
                        {item.icon}
                      </div>
                      <span className="font-bold text-sm text-zinc-700 dark:text-zinc-200">{item.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="mx-2 my-2 bg-zinc-100 dark:bg-zinc-800" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-red-500 focus:text-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                >
                  <LogOut size={18} />
                  <span className="font-bold text-sm">{t.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href={`/auth/login?redirectTo=${encodeURIComponent(pathname)}`}
              className="bg-[#E27D60] hover:bg-[#d16d51] text-white px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
            >
              {t.login}
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-400"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-[#F9F7F2] dark:bg-zinc-950 animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col p-4 gap-4">
            {[
              { name: t.study, href: '/learn' },
              { name: t.bundles, href: '/bundles' },
              ...(isAdmin ? [{ name: t.admin, href: '/admin' }] : [])
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-lg font-bold transition-colors ${isActiveNavItem(item.href)
                  ? 'bg-[#DFF1E5] text-[#2F7D4A] dark:bg-emerald-500/18 dark:text-emerald-200'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-medium text-zinc-500">{language === 'ko' ? '언어 설정' : 'Language Settings'}</span>
              <button
                onClick={() => handleLangUpdate(language === 'ko' ? 'en' : 'ko')}
                className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-300/10 dark:border-zinc-700/10"
              >
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'ko' ? 'bg-white dark:bg-zinc-700 text-[#E27D60] shadow-sm' : 'text-zinc-500'}`}>KO</span>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-zinc-700 text-[#E27D60] shadow-sm' : 'text-zinc-500'}`}>EN</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
