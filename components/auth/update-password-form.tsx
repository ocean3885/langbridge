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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DisplayLanguage = 'ko' | 'en';

const copy = {
  ko: {
    title: '비밀번호 변경',
    description: '새 비밀번호를 입력하세요.',
    newPassword: '새 비밀번호',
    newPasswordPlaceholder: '새 비밀번호',
    save: '새 비밀번호 저장',
    saving: '저장 중...',
    fallbackError: '오류가 발생했습니다.',
    updateFailed: '비밀번호 변경에 실패했습니다.',
  },
  en: {
    title: 'Change Your Password',
    description: 'Please enter your new password below.',
    newPassword: 'New password',
    newPasswordPlaceholder: 'New password',
    save: 'Save new password',
    saving: 'Saving...',
    fallbackError: 'An error occurred',
    updateFailed: 'Failed to update password.',
  },
};

export function UpdatePasswordForm({
  className,
  language = 'en',
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { language?: DisplayLanguage }) {
  const t = copy[language];
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message || t.updateFailed);

      router.push('/profile');
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
          <CardDescription>
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">{t.newPassword}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.newPasswordPlaceholder}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t.saving : t.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
