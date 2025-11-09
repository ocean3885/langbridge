'use client'; // 👈 클라이언트 컴포넌트로 선언

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // 👈 클라이언트 Supabase 가져오기
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User as UserIcon, AudioLines, LogOut } from 'lucide-react';

// 사용자 상태를 나타내는 타입 정의 (필요하다면)
interface User {
  id: string;
  email: string;
  isPremium?: boolean;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient(); // Supabase 클라이언트 초기화

  // 세션 확인 + 인증 상태 변화 구독
  useEffect(() => {
    let isMounted = true;

    async function syncUser() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!isMounted) return;
      
      // Auth session missing은 로그아웃 상태에서 정상 - 에러로 처리하지 않음
      if (userError && userError.message !== 'Auth session missing!') {
        console.error('Unexpected auth error:', userError);
      }
      
      if (!user) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // 유저가 있으면 일단 기본 정보로 설정 (프로필 조회 전)
      setUser({ 
        id: user.id, 
        email: user.email ?? '',
        isPremium: false // 일단 기본값
      });
      setLoading(false); // 여기서 먼저 로딩 해제
      
      // 프로필은 비동기로 나중에 업데이트
      try {
        const { data: profile } = await supabase
          .from('lang_profiles')
          .select('is_premium')
          .eq('id', user.id)
          .maybeSingle();
        
        if (isMounted && profile) {
          setUser(prev => prev ? { ...prev, isPremium: profile.is_premium ?? false } : null);
        }
      } catch (err) {
        // 프로필 조회 실패는 무시 (기본값 사용)
      }
    }

    // 초기 동기화
    syncUser();

    // 인증 상태 변화 구독: 로그인/로그아웃/토큰 갱신 시 상태 반영
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const u = session?.user;
        if (u) {
          // 일단 기본 정보로 설정
          setUser({ 
            id: u.id, 
            email: u.email ?? '',
            isPremium: false
          });
          setLoading(false);
          
          // 프로필은 비동기로 업데이트
          try {
            const { data: profile } = await supabase
              .from('lang_profiles')
              .select('is_premium')
              .eq('id', u.id)
              .maybeSingle();
            
            if (isMounted && profile) {
              setUser(prev => prev ? { ...prev, isPremium: profile.is_premium ?? false } : null);
            }
          } catch (err) {
            // 프로필 조회 실패 무시
          }
        } else {
          setUser(null);
          setLoading(false);
        }
        router.refresh();
      }
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        router.push('/'); // 메인 페이지로 리다이렉트
        router.refresh();
      }

      // 세션 만료 감지 및 자동 재인증 시도
      if (event === 'TOKEN_REFRESHED' && !session) {
        setUser(null);
        setLoading(false);
        router.push('/auth/login?redirectTo=' + encodeURIComponent(window.location.pathname));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // 2. 로그아웃 핸들러 함수
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error.message);
        alert('로그아웃 중 오류가 발생했습니다: ' + error.message);
        return;
      }
      
      setUser(null);
      setLoading(false);
      
      // 강제로 메인 페이지로 이동 후 새로고침
      window.location.href = '/';
    } catch (err) {
      console.error('Logout exception:', err);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 로딩 중일 때 (UX 개선)
  if (loading) {
    return (
      <header className="bg-gray-800 text-white p-4 shadow-xl sticky top-0 z-10">
        <nav className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-extrabold tracking-wide">LangBridge</Link>
          <div className="space-x-4 text-sm font-medium">
            <span className="text-gray-400">Loading...</span>
          </div>
        </nav>
      </header>
    );
  }

  // 3. 렌더링: user 상태에 따라 버튼 변경
  return (
    <header className="bg-gray-800 text-white p-4 shadow-xl sticky top-0 z-10">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-extrabold tracking-wide">LangBridge</Link>
        <div className="space-x-4 text-sm font-medium flex items-center">
          <Link href="/" className="hover:text-blue-300 transition duration-150">홈</Link>
          <Link href="/upload" className="hover:text-blue-300 transition duration-150">생성</Link>
          {user?.isPremium && (
            <Link href="/categories" className="hover:text-blue-300 transition duration-150">카테고리</Link>
          )}
          {user && (
            <Link href="/my-audio" className="hover:text-blue-300 transition duration-150">내 오디오</Link>
          )}
          
          {user ? (
            // ✅ 로그인 상태: 드롭다운 메뉴
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded transition duration-150 whitespace-nowrap">
                    <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold">
                      {user.email[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{user.email}</span>
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
            </>
          ) : (
            // ✅ 로그아웃 상태: "로그인" 버튼 표시
            <Link 
              href={`/auth/login?redirectTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
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