import { BookOpen } from 'lucide-react';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
      <h2 className="text-xl font-bold text-zinc-800">{title}</h2>
      <p className="mt-2 text-zinc-500">{description}</p>
    </div>
  );
}
