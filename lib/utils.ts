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
