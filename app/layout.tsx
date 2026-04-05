// langbridge/app/layout.tsx

import { Inter } from 'next/font/google'; 
import Header from '@/components/Header'; 
import Footer from '@/components/Footer'; 
import './globals.css'; 
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LangBridge - 언어 학습 플랫폼',
  description: '문장 배열, 영상 스크립트, 반복 학습으로 외국어를 효과적으로 익히는 언어 학습 플랫폼',
};

// 폰트 설정
const inter = Inter({ subsets: ['latin'] });

// **Root Layout Component**
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
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
          <Footer />
        </div>
      </body>
    </html>
  );
}