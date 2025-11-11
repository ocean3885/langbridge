import { createClient } from '@/lib/supabase/server';
import HeaderClient from '@/components/HeaderClient';

export default async function Header() {
  const supabase = await createClient();

  // SSR에서 사용자와 프로필을 조회해 깜빡임 없이 상태 고정
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  let isPremium = false;
  if (user) {
    const { data: profile } = await supabase
      .from('lang_profiles')
      .select('is_premium')
      .eq('id', user.id)
      .maybeSingle();
    isPremium = !!profile?.is_premium;
  }

  return (
    <HeaderClient
      isLoggedIn={!!user}
      userEmail={user?.email ?? null}
      isPremium={isPremium}
    />
  );
}