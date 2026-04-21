import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 현재 활성 학습 언어 (추후 다국어 확장을 위해 상수화)
export const ACTIVE_LANGUAGE = 'es-ES';
export const ACTIVE_LANGUAGE_LABEL = 'Spanish / 스페인어';

// 초를 MM:SS 또는 H:MM:SS 형식으로 변환
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * ISO 날짜 문자열을 받아 '오늘', '3일 전', '2달 전' 등 한국어 상대 시간으로 변환합니다.
 */
export function relativeFromNowKo(iso: string | null): string {
  if (!iso) return '-';
  const past = new Date(iso);
  if (isNaN(past.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - past.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);
  if (diffDays <= 0) return '오늘';
  if (diffDays < 30) return `${diffDays}일 전`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months}달 전`;
  const years = Math.floor(months / 12);
  return `${years}년 전`;
}
