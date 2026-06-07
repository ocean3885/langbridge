import Link from 'next/link';

export function SectionHeader({
  title,
  href,
  actionLabel = 'View all',
  titleClassName = 'font-serif text-2xl font-semibold',
  actionClassName,
}: {
  title: string;
  href?: string;
  actionLabel?: string;
  titleClassName?: string;
  actionClassName?: string;
}) {
  const actionClasses = actionClassName ||
    'rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/20 dark:hover:bg-zinc-800';

  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className={titleClassName}>{title}</h2>
      {href && (
        <Link
          href={href}
          className={actionClasses}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
