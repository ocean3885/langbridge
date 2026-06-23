'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ProfilePasswordFormProps = {
  language: 'ko' | 'en';
};

const translations = {
  ko: {
    title: '비밀번호 변경',
    description: '보안을 위해 현재 비밀번호를 확인한 후 변경합니다.',
    currentPassword: '현재 비밀번호',
    newPassword: '새 비밀번호',
    confirmPassword: '새 비밀번호 확인',
    placeholder: '6자 이상 입력해 주세요',
    submit: '비밀번호 변경',
    submitting: '변경 중...',
    mismatch: '새 비밀번호가 일치하지 않습니다.',
    samePassword: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
    success: '비밀번호가 변경되었습니다.',
    incorrectCurrentPassword: '현재 비밀번호가 올바르지 않습니다.',
    genericError: '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  en: {
    title: 'Change password',
    description: 'For security, confirm your current password before changing it.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    placeholder: 'Enter at least 6 characters',
    submit: 'Change password',
    submitting: 'Changing...',
    mismatch: 'The new passwords do not match.',
    samePassword: 'Your new password must be different from your current password.',
    success: 'Your password has been changed.',
    incorrectCurrentPassword: 'Your current password is incorrect.',
    genericError: 'Unable to change your password. Please try again shortly.',
  },
} as const;

export function ProfilePasswordForm({ language }: ProfilePasswordFormProps) {
  const t = translations[language];
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(t.mismatch);
      return;
    }

    if (currentPassword === newPassword) {
      setError(t.samePassword);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(
          result.error === '현재 비밀번호가 올바르지 않습니다.'
            ? t.incorrectCurrentPassword
            : t.genericError
        );
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t.success);
    } catch {
      setError(t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="max-w-md space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="current-password">{t.currentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder={t.placeholder}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">{t.confirmPassword}</Label>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
              {success}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t.submitting : t.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
