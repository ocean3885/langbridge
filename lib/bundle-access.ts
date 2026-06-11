import { isSuperAdmin } from '@/lib/auth/super-admin';
import { hasActiveSubscription } from '@/lib/supabase/services/subscriptions';

export type BundleAccessLevel = 'free' | 'premium';

export type BundleAccessBundle = {
  is_published?: boolean | null;
  access_level?: BundleAccessLevel | string | null;
};

export type BundleAccessUser = {
  id: string;
  email?: string | null;
} | null | undefined;

export type BundleAccessResult = {
  canView: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  hasSubscription: boolean;
  reason: 'allowed' | 'unpublished' | 'login_required' | 'subscription_required';
};

export async function getBundleAccess(bundle: BundleAccessBundle, user: BundleAccessUser): Promise<BundleAccessResult> {
  const isAdmin = user ? await isSuperAdmin({ userId: user.id, email: user.email ?? null }) : false;
  const isPremium = bundle.access_level === 'premium';

  if (isAdmin) {
    return {
      canView: true,
      isAdmin,
      isPremium,
      hasSubscription: false,
      reason: 'allowed',
    };
  }

  if (!bundle.is_published) {
    return {
      canView: false,
      isAdmin,
      isPremium,
      hasSubscription: false,
      reason: 'unpublished',
    };
  }

  if (!isPremium) {
    return {
      canView: true,
      isAdmin,
      isPremium,
      hasSubscription: false,
      reason: 'allowed',
    };
  }

  if (!user) {
    return {
      canView: false,
      isAdmin,
      isPremium,
      hasSubscription: false,
      reason: 'login_required',
    };
  }

  const hasSubscription = await hasActiveSubscription(user.id);

  return {
    canView: hasSubscription,
    isAdmin,
    isPremium,
    hasSubscription,
    reason: hasSubscription ? 'allowed' : 'subscription_required',
  };
}
