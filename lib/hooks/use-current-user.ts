"use client";

import { useCallback, useEffect, useState } from 'react';

type CurrentUser = {
  id: string;
  email: string | null;
  source: 'supabase' | 'sqlite';
  createdAt: string | null;
};

type MeResponse = {
  authenticated: boolean;
  user: CurrentUser | null;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/me', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || '사용자 정보를 가져오지 못했습니다.');
      }

      const data = (await response.json()) as MeResponse;
      setAuthenticated(Boolean(data.authenticated));
      setUser(data.user ?? null);
    } catch (err) {
      setAuthenticated(false);
      setUser(null);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    user,
    authenticated,
    loading,
    error,
    refresh,
  };
}
