import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CategoriesManager from './CategoriesManager';
import AdminSidebar from '../AdminSidebar';

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/categories');
  }
  
  // is_premium 확인
  const { data: profile } = await supabase
    .from('lang_profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();
  
  if (!profile?.is_premium) {
    redirect('/');
  }
  
  // 카테고리 목록 조회
  const { data: categories, error } = await supabase
    .from('lang_categories')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('카테고리 조회 오류:', error);
  }
  
  return (
    <>
      <AdminSidebar userEmail={user.email ?? ''} />
      <CategoriesManager initialCategories={categories || []} />
    </>
  );
}
