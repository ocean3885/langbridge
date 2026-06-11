import { LoginForm } from "@/components/auth/login-form";
import { getDisplayLanguage } from "@/lib/auth/app-user";
import { Suspense } from "react";

export default async function Page() {
  const language = await getDisplayLanguage();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div>{language === 'ko' ? '불러오는 중...' : 'Loading...'}</div>}>
          <LoginForm language={language} />
        </Suspense>
      </div>
    </div>
  );
}
