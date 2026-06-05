import { Check, Flame } from 'lucide-react';

export function StreakCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <h3 className="flex items-center gap-2 font-bold">
        <Flame className="h-5 w-5 text-[#df7c38]" />
        7 Day Streak
      </h3>
      <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-zinc-600 dark:text-zinc-400">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <div key={`${day}-${index}`} className="space-y-3">
            <span>{day}</span>
            <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${index < 5 ? 'bg-[#71a66e] text-white' : index === 5 ? 'border-2 border-[#eb7b36] bg-white dark:bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
              {index < 5 && <Check className="h-4 w-4" />}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">Great job! Let&apos;s keep it going.</p>
    </div>
  );
}

export function GoalCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold">Today&apos;s Goal</h3>
        <button className="text-sm text-zinc-500 dark:text-zinc-400">Edit</button>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[9px] border-[#e8eee5] dark:border-zinc-800">
          <div className="absolute inset-[-9px] rounded-full border-[9px] border-[#66a665] [clip-path:polygon(0_0,100%_0,100%_82%,0_82%)]" />
          <span className="relative text-2xl font-bold">80%</span>
        </div>
        <div>
          <p className="text-2xl font-bold">16 / 20</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">minutes</p>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Keep going!</p>
        </div>
      </div>
    </div>
  );
}

export function MiniListCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <h3 className="mb-4 font-bold">Recently Learned</h3>
      {[
        ['pedir', 'to order'],
        ['delicioso', 'delicious'],
        ['el menu', 'the menu'],
      ].map(([word, meaning]) => (
        <div key={word} className="flex items-center justify-between py-2 text-sm">
          <strong>{word}</strong>
          <span className="text-zinc-500 dark:text-zinc-400">{meaning}</span>
        </div>
      ))}
      <button className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Review</button>
    </div>
  );
}

export function ProgressChartCard() {
  const bars = [18, 24, 22, 33, 50, 72, 78];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-bold">Progress</h3>
        <span className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">This Week</span>
      </div>
      <div className="flex h-36 items-end gap-2 border-b border-l border-zinc-100 pl-2 dark:border-zinc-800">
        {bars.map((bar, index) => (
          <div key={index} className="flex flex-1 items-end">
            <div className="w-full rounded-t bg-[#9cc99b]" style={{ height: `${bar}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
