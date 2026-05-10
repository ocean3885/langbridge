import { cookies } from 'next/headers';
import { getAppUserFromServer } from '@/lib/auth/app-user';

import { Inter } from 'next/font/google'; 
import Header from '@/components/layout/Header'; 
import Footer from '@/components/layout/Footer'; 
import './globals.css'; 
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HolaLingo - 즐거운 스페인어 학습 플랫폼',
  description: 'AI 튜터와 함께 실시간 대화하며 배우는 나만의 스페인어 마스터 플랫폼, HolaLingo',
};

// 폰트 설정
const inter = Inter({ subsets: ['latin'] });

// Root Layout Component
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get('lb_display_language')?.value === 'en' ? 'en' : 'ko');

  return (
    <html lang={lang}>
      {/* 💡 개선: 폰트 클래스와 안티-앨리어싱(antialiased) 적용 */}
      <body className={`${inter.className} antialiased`}> 
        
        {/* 전체 컨테이너: flex-col 및 min-h-screen 유지 */}
        <div className="flex flex-col min-h-screen">
          
          {/* 1. 상단: 네비게이션 바 */}
          <Header />  
          
          {/* 2. 중간: 메인 콘텐츠 영역 */}
          {/* <main> 태그를 flex-grow로 설정하여 푸터를 하단에 고정 */}
          <main className="flex-grow container mx-auto p-4 sm:p-8"> 
            {children}
          </main>
          
          {/* 3. 하단: 푸터 */}
          <Footer language={lang} />
        </div>
      </body>
    </html>
  );
}