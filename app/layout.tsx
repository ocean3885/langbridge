import { cookies } from 'next/headers';
import { getAppUserFromServer, getDisplayLanguage } from '@/lib/auth/app-user';

import { Inter, Noto_Sans_KR } from 'next/font/google'; 
import Header from '@/components/layout/Header'; 
import Footer from '@/components/layout/Footer'; 
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css'; 
import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'HolaLingo - Fun Spanish Learning Platform',
  description: 'Your own Spanish master platform where you learn through real-time conversations with AI tutors, HolaLingo',
};

// 폰트 설정
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const noto = Noto_Sans_KR({ 
  preload: false,
  weight: ['100', '300', '400', '500', '700', '900'],
  variable: '--font-noto',
});

// Root Layout Component
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getDisplayLanguage();

  return (
    <html lang={lang} suppressHydrationWarning>
      {/* 💡 개선: 폰트 변수와 안티-앨리어싱 적용 */}
      <body className={`${inter.variable} ${noto.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
