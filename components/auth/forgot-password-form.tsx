"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '비밀번호 찾기',
    description: '가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.',
    email: '이메일',
    emailPlaceholder: 'm@example.com',
    guide: '메일함에서 재설정 링크를 확인하세요. 링크를 열면 새 비밀번호를 설정할 수 있습니다.',
    send: '재설정 링크 보내기',
    sending: '전송 중...',
    sent: '재설정 링크를 보냈습니다. 이메일을 확인해 주세요.',
    fallbackError: '재설정 링크 전송에 실패했습니다.',
    login: '로그인으로 돌아가기',
    hasAccount: '계정 정보가 기억나시나요?',
  },
  en: {
    title: 'Forgot your password?',
    description: 'We will send a password reset link to your account email.',
    email: 'Email',
    emailPlaceholder: 'm@example.com',
    guide: 'Check your inbox for the reset link. Open it to set a new password.',
    send: 'Send reset link',
    sending: 'Sending...',
    sent: 'Reset link sent. Please check your email.',
    fallbackError: 'Failed to send reset link.',
    login: 'Back to login',
    hasAccount: 'Remember your account?',
  },
};

export function ForgotPasswordForm({
  className,
  language = 'en',
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { language?: DisplayLanguage }) {
  const t = copy[language];
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
    });

    if (error) {
      setError(error.message || t.fallbackError);
    } else {
      setMessage(t.sent);
    }

    setIsLoading(false);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.emailPlaceholder}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t.guide}
            </p>
            {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t.sending : t.send}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t.hasAccount}{" "}
            <Link
              href="/auth/login"
              className="underline underline-offset-4"
            >
              {t.login}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
