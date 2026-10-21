import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface CategoryBundlesPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

export default async function CategoryBundlesPage({ params }: CategoryBundlesPageProps) {
  const { categorySlug } = await params;
  redirect(`/bundles?category=${encodeURIComponent(categorySlug)}`);
}
