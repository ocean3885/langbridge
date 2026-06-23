'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileBillingRefresh() {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    const refreshSubscription = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < 1500) return;

      lastRefreshAt.current = now;
      router.refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSubscription();
      }
    };

    window.addEventListener('focus', refreshSubscription);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshSubscription);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return null;
}
