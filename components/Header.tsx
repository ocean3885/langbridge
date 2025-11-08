'use client'; // 👈 클라이언트 컴포넌트로 선언

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // 👈 클라이언트 Supabase 가져오기
import Link from 'next/link';

// 사용자 상태를 나타내는 타입 정의 (필요하다면)
interface User {
  id: string;
  email: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient(); // Supabase 클라이언트 초기화

  // 1. 컴포넌트 마운트 시 사용자 세션 확인
  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Supabase의 user 객체에서 필요한 정보만 추출
        if (user) {
          setUser({ id: user.id, email: user.email! });
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, [supabase]);

  // 2. 로그아웃 핸들러 함수
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null); // 상태 업데이트
      router.push('/'); // 메인 페이지로 리디렉션
      router.refresh(); // Next.js 라우터 새로고침 (Server Component 상태 갱신)
    } else {
      console.error('Logout error:', error.message);
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
          <Link href="/categories" className="hover:text-blue-300 transition duration-150">카테고리</Link>
          <Link href="/protected" className="hover:text-blue-300 transition duration-150">Protected</Link>
          
          {user ? (
            // ✅ 로그인 상태: "로그아웃" 버튼 표시
            <>
              <span className="text-gray-300 hidden sm:inline">
                 {user.email}님
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 py-2 px-4 rounded transition duration-150 whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            // ✅ 로그아웃 상태: "로그인" 버튼 표시
            <Link 
              href="/auth/login" 
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