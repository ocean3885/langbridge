import { getAppUserFromServer } from '@/lib/auth/app-user';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import LanguageSelector from './LanguageSelector';

const translations = {
  ko: {
    title: '내 프로필',
    accountInfo: '계정 정보',
    accountDesc: '현재 로그인된 계정의 정보입니다.',
    email: '이메일',
    joinDate: '가입일',
    settings: '서비스 설정',
    settingsDesc: '애플리케이션 전반에 걸쳐 사용될 언어를 설정합니다.',
    displayLang: '표시 언어 (Display Language)',
    footerNote: '향후 프로필 편집, 비밀번호 변경 등이 추가될 예정입니다.',
    loginRequired: '로그인이 필요합니다.',
    goToLogin: '로그인 페이지로 이동',
    unknown: '알 수 없음'
  },
  en: {
    title: 'My Profile',
    accountInfo: 'Account Information',
    accountDesc: 'Details of the currently logged-in account.',
    email: 'Email',
    joinDate: 'Joined Date',
    settings: 'Service Settings',
    settingsDesc: 'Set the language to be used across the application.',
    displayLang: 'Display Language',
    footerNote: 'Profile editing and password changes will be added in the future.',
    loginRequired: 'Login required.',
    goToLogin: 'Go to Login Page',
    unknown: 'Unknown'
  }
};

// 프로필 페이지
export default async function ProfilePage() {
  const user = await getAppUserFromServer();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Profile</h1>
        <p className="mb-4">Login is required.</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">Go to Login Page</Link>
      </div>
    );
  }

  const lang = user.displayLanguage || 'ko';
  const t = translations[lang];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">{t.title}</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.accountInfo}</CardTitle>
            <CardDescription>{t.accountDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">{t.email}</p>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t.joinDate}</p>
              <p className="text-sm text-gray-600">
                {user.createdAt ? new Date(user.createdAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US') : t.unknown}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings}</CardTitle>
            <CardDescription>{t.settingsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">{t.displayLang}</p>
              <LanguageSelector currentLanguage={lang} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <p className="text-gray-500 text-sm">{t.footerNote}</p>
      </div>
    </div>
  );
}
