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

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '회원가입',
    description: '새 계정을 만드세요.',
    email: '이메일',
    password: '비밀번호',
    repeatPassword: '비밀번호 확인',
    passwordMismatch: '비밀번호가 일치하지 않습니다.',
    fallbackError: '오류가 발생했습니다.',
    signUpFailed: '회원가입에 실패했습니다.',
    creating: '계정 생성 중...',
    signUp: '회원가입',
    hasAccount: '이미 계정이 있으신가요?',
    login: '로그인',
  },
  en: {
    title: 'Sign up',
    description: 'Create a new account.',
    email: 'Email',
    password: 'Password',
    repeatPassword: 'Repeat Password',
    passwordMismatch: 'Passwords do not match',
    fallbackError: 'An error occurred',
    signUpFailed: 'Sign up failed.',
    creating: 'Creating an account...',
    signUp: 'Sign up',
    hasAccount: 'Already have an account?',
    login: 'Login',
  },
};

export function SignUpForm({
  className,
  language = 'en',
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { language?: DisplayLanguage }) {
  const t = copy[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError(t.passwordMismatch);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || t.signUpFailed);
      }

      window.location.href = '/auth/sign-up-success';
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t.fallbackError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
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
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">{t.repeatPassword}</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t.creating : t.signUp}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t.hasAccount}{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                {t.login}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
