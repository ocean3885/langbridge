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
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '로그인',
    description: '계정 이메일과 비밀번호를 입력하세요.',
    email: '이메일',
    password: '비밀번호',
    forgotPassword: '비밀번호를 잊으셨나요?',
    login: '로그인',
    loggingIn: '로그인 중...',
    noAccount: '계정이 없으신가요?',
    signUp: '회원가입',
    fallbackError: '오류가 발생했습니다.',
    loginFailed: '로그인에 실패했습니다.',
  },
  en: {
    title: 'Login',
    description: 'Enter your email and password to log in to your account.',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot your password?',
    login: 'Login',
    loggingIn: 'Logging in...',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    fallbackError: 'An error occurred',
    loginFailed: 'Login failed.',
  },
};

export function LoginForm({
  className,
  language = 'en',
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { language?: DisplayLanguage }) {
  const t = copy[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || t.loginFailed);
      }

      window.location.href = redirectTo;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t.fallbackError);
      setIsLoading(false);
    }
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
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{t.password}</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    {t.forgotPassword}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t.loggingIn : t.login}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t.noAccount}{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                {t.signUp}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
