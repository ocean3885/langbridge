'use client';

import Link from 'next/link';
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
import { User as UserIcon, AudioLines, LogOut } from 'lucide-react';

interface Props {
  isLoggedIn: boolean;
  userEmail: string | null;
  isPremium: boolean;
}

export default function HeaderClient({ isLoggedIn, userEmail, isPremium }: Props) {
  const supabase = createClient();
  const pathname = usePathname();

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

  return (
    <header className="bg-gray-800 text-white p-4 shadow-xl sticky top-0 z-50">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-extrabold tracking-wide">LangBridge</Link>
        <div className="space-x-4 text-sm font-medium flex items-center">
          <Link href="/" className="hover:text-blue-300 transition duration-150">홈</Link>
          <Link href="/upload" className="hover:text-blue-300 transition duration-150">생성</Link>
          {isPremium && (
            <Link href="/admin" className="hover:text-blue-300 transition duration-150">운영관리</Link>
          )}
          {isLoggedIn && (
            <Link href="/my-audio" className="hover:text-blue-300 transition duration-150">내 오디오</Link>
          )}

          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded transition duration-150 whitespace-nowrap">
                  <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold">
                    {(userEmail ?? 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{userEmail}</span>
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
              className="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded transition duration-150 whitespace-nowrap"
            >
              로그인
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
