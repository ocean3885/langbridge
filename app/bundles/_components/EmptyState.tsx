import { BookOpen } from 'lucide-react';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
      <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{title}</h2>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}
