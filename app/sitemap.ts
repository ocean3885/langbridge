import type { MetadataRoute } from 'next';
import { getBlogPosts } from '@/lib/supabase/services/blog';
import { absoluteUrl } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getBlogPosts();
  const staticRoutes = [
    '',
    '/learn',
    '/bundles',
    '/pricing',
    '/blog',
    '/terms',
    '/privacy-policy',
    '/refund-policy',
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: now,
      changeFrequency: route === '/blog' ? ('weekly' as const) : ('monthly' as const),
      priority: route === '' ? 1 : route === '/blog' ? 0.8 : 0.6,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
