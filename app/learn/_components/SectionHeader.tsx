import Link from 'next/link';

export function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <Link
        href={href}
        className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800"
      >
        View all
      </Link>
    </div>
  );
}
