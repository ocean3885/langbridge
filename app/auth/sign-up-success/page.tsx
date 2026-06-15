import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { getDisplayLanguage } from "@/lib/auth/app-user";

const copy = {
  ko: {
    title: '이메일 인증이 필요합니다',
    description: '메일함에서 인증 링크를 확인해 주세요.',
    body: '회원가입 요청이 완료되었습니다. 가입을 마치려면 이메일로 전송된 인증 링크를 열어 계정을 인증해야 합니다.',
    login: '로그인으로 이동',
  },
  en: {
    title: 'Email verification required',
    description: 'Check your inbox for the confirmation link.',
    body: 'Your sign-up request is complete. To finish creating your account, open the confirmation link sent to your email.',
    login: 'Go to login',
  },
};

export default async function Page() {
  const language = await getDisplayLanguage();
  const t = copy[language];

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {t.title}
              </CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.body}
              </p>
              <Link href="/auth/login" className="inline-flex text-sm font-semibold underline underline-offset-4">
                {t.login}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
