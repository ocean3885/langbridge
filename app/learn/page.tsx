import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Flame,
  Headphones,
  HelpCircle,
  Leaf,
  Play,
  RotateCcw,
  Sprout,
  Trophy,
  Volume2,
} from 'lucide-react';
import { getAppUserFromServer } from '@/lib/auth/app-user';

export const dynamic = 'force-dynamic';

const lessonCards = [
  {
    label: 'SHORT STORY',
    title: 'A Day in Madrid',
    image: '/images/heroimg_land.jpg',
    minutes: '12 min',
  },
  {
    label: 'DAILY CONVERSATION',
    title: 'Ordering at a Cafe',
    image: '/images/main.png',
    minutes: '8 min',
  },
  {
    label: 'GRAMMAR',
    title: 'The Present Tense: -ar Verbs',
    image: '/images/heroimg_port.jpg',
    minutes: '10 min',
  },
];

const activities = [
  {
    title: 'At the Restaurant',
    meta: 'Travel Spanish Essentials · Lesson 8',
    status: '72%',
    date: 'Today',
    image: '/images/heroimg_land.jpg',
  },
  {
    title: 'A Day in Madrid',
    meta: 'Short Story Bundle · Story 1',
    status: 'Completed',
    date: 'Yesterday',
    image: '/images/heroimg_port.jpg',
  },
  {
    title: 'Useful Phrases for Travel',
    meta: 'Daily Conversation · Lesson 3',
    status: '85%',
    date: '2 days ago',
    image: '/images/main.png',
  },
  {
    title: 'The Present Tense: -ar Verbs',
    meta: 'Grammar Bundle · Lesson 2',
    status: 'Completed',
    date: '3 days ago',
    image: '/images/learn_page_anony.png',
  },
];

const quickPractice = [
  { title: 'Flashcards', desc: 'Review vocabulary', icon: BookOpen, color: 'bg-[#e5f0e4] text-[#5d9361]' },
  { title: 'Quick Quiz', desc: '5 questions', icon: HelpCircle, color: 'bg-[#ede5fb] text-[#8564cf]' },
  { title: 'Listen & Repeat', desc: 'Improve your pronunciation', icon: Headphones, color: 'bg-[#e4edfb] text-[#4b75bd]' },
];

export default async function LearnPage() {
  const user = await getAppUserFromServer();

  if (!user) return <AnonymousLearnPage />;

  const name = user.email?.split('@')[0] || 'Learner';

  return <LoggedInLearnPage name={toDisplayName(name)} />;
}

function AnonymousLearnPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-2 pb-10 text-[#1f1b18]">
      <section className="grid min-h-[360px] gap-8 overflow-hidden rounded-[28px] bg-[#fffdfa] lg:grid-cols-[1fr_1.05fr]">
        <div className="flex flex-col justify-center px-4 py-8 sm:px-9 lg:px-10">
          <p className="mb-4 text-xs font-black uppercase tracking-widest text-[#4f8a50]">
            Learn with HolaLingo
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Learn Spanish,
            <br />
            the natural and cozy way.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-zinc-600 sm:text-lg">
            Short lessons, real conversations, and smart review help you learn and remember.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/auth/sign-up?redirectTo=/learn"
              className="inline-flex items-center gap-2 rounded-lg bg-[#57985a] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#477f4a]"
            >
              Try a Lesson Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="text-sm text-zinc-600">
              <div className="font-bold text-[#f2a51f]">★★★★★</div>
              <div>Loved by 10,000+ learners</div>
            </div>
          </div>
        </div>
        <div className="relative min-h-[320px] overflow-hidden rounded-[24px]">
          <Image
            src="/images/heroimg_land.jpg"
            alt="Spanish learner studying near a sunny window"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#fffdfa] to-transparent" />
          <div className="absolute left-8 top-16 w-56 rounded-xl border border-white/70 bg-white/90 p-5 shadow-xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <strong className="font-serif text-lg">¡Buenos dias!</strong>
              <Volume2 className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500">Good morning!</p>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5f9f61] text-white">
                <Check className="h-4 w-4" />
              </span>
              <span className="h-2 flex-1 rounded-full bg-[#e7ded4]" />
              <span className="h-2 flex-1 rounded-full bg-[#e7ded4]" />
              <span className="h-2 flex-1 rounded-full bg-[#e7ded4]" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-[28px] border border-zinc-200/80 bg-white/70 p-6 shadow-sm md:grid-cols-[0.8fr_1.25fr_0.55fr] md:p-8">
        <div>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef5ea] text-[#5f9f61]">
            <Leaf className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-2xl font-semibold">Experience a Lesson</h2>
          <p className="mt-4 leading-7 text-zinc-600">
            Try a short interactive lesson.
            <br />
            No sign-up required!
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-5 text-xs text-zinc-500">Fill in the blank</p>
          <p className="font-serif text-2xl">Maria pide un ________.</p>
          <p className="mt-2 text-zinc-500">Maria orders a coffee.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {['libro book', 'cafe coffee', 'casa house'].map((option, index) => (
              <button
                key={option}
                className={`rounded-lg border px-4 py-3 text-sm transition ${
                  index === 1
                    ? 'border-[#57985a] bg-[#f2fbf0] text-[#3f7d42]'
                    : 'border-zinc-200 bg-white text-zinc-700'
                }`}
              >
                <span className="block font-semibold">{option.split(' ')[0]}</span>
                <span className="text-xs text-zinc-500">{option.split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#65a766] text-white">
            <Check className="h-8 w-8" />
          </span>
          <strong className="text-lg">¡Correcto!</strong>
          <span className="mt-1 text-sm text-zinc-500">Great job!</span>
        </div>
      </section>

      <section className="rounded-[28px] bg-[#fffdfa] px-5 py-8 text-center shadow-sm">
        <h2 className="font-serif text-3xl font-semibold">How You Learn with HolaLingo</h2>
        <p className="mt-2 text-zinc-600">Learn, practice, and review in a simple cycle that sticks.</p>
        <div className="mt-9 grid gap-6 md:grid-cols-4">
          {[
            { title: '1. Read & Listen', desc: 'Real conversations and stories in context.', icon: BookOpen, bg: 'bg-[#e8efe1]' },
            { title: '2. Practice', desc: 'Engaging quizzes to understand and apply.', icon: HelpCircle, bg: 'bg-[#fde6d1]' },
            { title: '3. Review', desc: 'Smart review brings it back to your memory.', icon: RotateCcw, bg: 'bg-[#eee5fb]' },
            { title: '4. Grow', desc: 'Track progress and build confidence every day.', icon: Sprout, bg: 'bg-[#e7efdf]' },
          ].map((step) => (
            <div key={step.title} className="flex flex-col items-center">
              <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full ${step.bg}`}>
                <step.icon className="h-9 w-9 text-[#5c7f56]" />
              </div>
              <h3 className="font-bold">{step.title}</h3>
              <p className="mt-2 max-w-48 text-sm leading-6 text-zinc-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 rounded-[28px] bg-[#fff8ec] p-6 shadow-sm lg:grid-cols-[0.55fr_1fr] lg:p-9">
        <div>
          <h2 className="font-serif text-3xl font-semibold">
            Your Progress,
            <br />
            Beautifully Tracked
          </h2>
          <p className="mt-4 leading-7 text-zinc-600">Stay motivated with a clear view of your learning journey.</p>
          <ul className="mt-8 space-y-4 text-sm text-zinc-700">
            {['Daily goals & streaks', 'Lessons completed', 'Words learned', 'Areas to review'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#75a777]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StreakCard />
          <GoalCard />
          <MiniListCard />
          <ProgressChartCard />
        </div>
      </section>

      <section className="grid items-center gap-8 overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm md:grid-cols-[0.42fr_1fr]">
        <div className="relative h-44 overflow-hidden rounded-2xl">
          <Image src="/images/heroimg_port.jpg" alt="Spanish study desk" fill className="object-cover" sizes="360px" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#4f8a50]">Ready to start?</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold">
            Start your Spanish journey today
            <br />
            It&apos;s free to get started.
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <Link href="/auth/sign-up?redirectTo=/learn" className="inline-flex items-center gap-2 rounded-lg bg-[#57985a] px-6 py-3 text-sm font-bold text-white">
              Start Learning
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-sm text-zinc-500">No credit card required</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function LoggedInLearnPage({ name }: { name: string }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-2 pb-10 text-[#1f1b18] lg:grid-cols-[1fr_360px]">
      <div className="space-y-9">
        <section>
          <h1 className="font-serif text-4xl font-semibold sm:text-5xl">¡Buenos dias, {name}!</h1>
          <p className="mt-4 text-zinc-600">Keep going! Small lessons, big progress.</p>
        </section>

        <section>
          <SectionHeader title="Continue Learning" href="/bundles" />
          <div className="mt-4 grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:grid-cols-[0.44fr_1fr]">
            <div className="relative min-h-64">
              <Image src="/images/heroimg_land.jpg" alt="Travel Spanish lesson" fill className="object-cover" sizes="360px" priority />
            </div>
            <div className="flex flex-col justify-center p-7">
              <p className="text-xs font-black uppercase tracking-widest text-[#4d8b4f]">Travel Bundle</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold">Travel Spanish Essentials</h2>
              <p className="mt-4 text-zinc-600">Lesson 8 · At the Restaurant</p>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-2 flex-1 rounded-full bg-zinc-100">
                  <div className="h-full w-[72%] rounded-full bg-[#63a464]" />
                </div>
                <span className="text-sm font-medium">72%</span>
              </div>
              <div className="mt-7 flex items-center gap-4">
                <Link href="/bundles" className="rounded-full bg-[#63a464] px-7 py-3 text-sm font-bold text-white">
                  Continue Lesson
                </Link>
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm" aria-label="Play lesson">
                  <Play className="h-5 w-5 fill-current" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold">Today&apos;s Picks for You</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {lessonCards.map((card) => (
              <Link key={card.title} href="/bundles" className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-[#5a975d]">{card.label}</p>
                  <h3 className="mt-3 min-h-14 font-serif text-2xl font-semibold leading-tight">{card.title}</h3>
                </div>
                <div className="relative h-40">
                  <Image src={card.image} alt={card.title} fill className="object-cover" sizes="(max-width: 1280px) 50vw, 260px" />
                </div>
                <div className="flex items-center justify-between px-5 py-4 text-xs text-zinc-500">
                  <span>Beginner</span>
                  <span>{card.minutes}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Recent Activity" href="/my-videos" />
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {activities.map((activity) => (
              <div key={activity.title} className="grid grid-cols-[76px_1fr_auto] items-center gap-4 border-b border-zinc-100 p-4 last:border-b-0">
                <div className="relative h-14 overflow-hidden rounded-lg">
                  <Image src={activity.image} alt="" fill className="object-cover" sizes="76px" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{activity.title}</h3>
                  <p className="mt-1 truncate text-sm text-zinc-500">{activity.meta}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#4f934f]">{activity.status}</p>
                  <p className="mt-1 text-xs text-zinc-500">{activity.date}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-center p-4">
              <Link href="/my-videos" className="rounded-full border border-zinc-200 px-10 py-2 text-sm font-semibold">
                View full history
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold">Quick Practice</h2>
          <p className="mt-2 text-sm text-zinc-500">Short activities to keep your Spanish fresh.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {quickPractice.map((item) => (
              <Link key={item.title} href="/bundles" className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full ${item.color}`}>
                    <item.icon className="h-7 w-7" />
                  </span>
                  <span>
                    <strong className="block">{item.title}</strong>
                    <span className="text-sm text-zinc-500">{item.desc}</span>
                  </span>
                </div>
                <ArrowRight className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <StreakCard />
        <GoalCard />
        <ReviewCard />
        <QuoteCard />
        <ProgressSummaryCard />
        <EncouragementCard />
      </aside>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <Link href={href} className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold shadow-sm">
        View all
      </Link>
    </div>
  );
}

function StreakCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold">
        <Flame className="h-5 w-5 text-[#df7c38]" />
        7 Day Streak
      </h3>
      <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-zinc-600">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <div key={`${day}-${index}`} className="space-y-3">
            <span>{day}</span>
            <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${index < 5 ? 'bg-[#71a66e] text-white' : index === 5 ? 'border-2 border-[#eb7b36] bg-white' : 'bg-zinc-100'}`}>
              {index < 5 && <Check className="h-4 w-4" />}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-zinc-500">Great job! Let&apos;s keep it going.</p>
    </div>
  );
}

function GoalCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold">Today&apos;s Goal</h3>
        <button className="text-sm text-zinc-500">Edit</button>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[9px] border-[#e8eee5]">
          <div className="absolute inset-[-9px] rounded-full border-[9px] border-[#66a665] [clip-path:polygon(0_0,100%_0,100%_82%,0_82%)]" />
          <span className="relative text-2xl font-bold">80%</span>
        </div>
        <div>
          <p className="text-2xl font-bold">16 / 20</p>
          <p className="text-sm text-zinc-500">minutes</p>
          <p className="mt-3 text-sm text-zinc-500">Keep going!</p>
        </div>
      </div>
    </div>
  );
}

function ReviewCard() {
  const rows = [
    { label: 'Vocabulary', value: 12, icon: BookOpen, color: 'bg-[#e4f0e1] text-[#5d9361]' },
    { label: 'Expressions', value: 8, icon: Headphones, color: 'bg-[#e4edfb] text-[#5176bd]' },
    { label: 'Grammar', value: 5, icon: HelpCircle, color: 'bg-[#eee5fb] text-[#8564cf]' },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold">Review Needed</h3>
        <span className="rounded-full bg-[#ffe0bf] px-2 py-1 text-xs font-bold text-[#df7c38]">3</span>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${row.color}`}>
                <row.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{row.label}</span>
            </span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteCard() {
  return (
    <div className="overflow-hidden rounded-xl bg-[#fff0d9] p-7 shadow-sm">
      <p className="font-serif text-xl leading-8">
        &ldquo;Every day in a new language is a step toward a new you.&rdquo;
      </p>
      <div className="mt-4 flex justify-end text-[#6c9b6e]">
        <Leaf className="h-14 w-14" />
      </div>
    </div>
  );
}

function ProgressSummaryCard() {
  const rows = [
    ['Lessons Completed', '28'],
    ['Words Learned', '236'],
    ['Expressions Mastered', '57'],
    ['Current Level', 'Beginner A2'],
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold">Your Progress</h3>
        <Link href="/profile" className="text-sm text-zinc-500">View details</Link>
      </div>
      <div className="divide-y divide-zinc-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-3 text-sm">
            <span className="text-zinc-600">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function EncouragementCard() {
  return (
    <div className="rounded-xl bg-[#fff0d9] p-7 shadow-sm">
      <h3 className="font-serif text-xl font-semibold">You&apos;re doing amazing!</h3>
      <p className="mt-4 leading-7 text-zinc-600">Consistency is the key to fluency.</p>
      <div className="mt-5 flex justify-end text-[#6c9b6e]">
        <Trophy className="h-12 w-12" />
      </div>
    </div>
  );
}

function MiniListCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-bold">Recently Learned</h3>
      {[
        ['pedir', 'to order'],
        ['delicioso', 'delicious'],
        ['el menu', 'the menu'],
      ].map(([word, meaning]) => (
        <div key={word} className="flex items-center justify-between py-2 text-sm">
          <strong>{word}</strong>
          <span className="text-zinc-500">{meaning}</span>
        </div>
      ))}
      <button className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm font-semibold">Review</button>
    </div>
  );
}

function ProgressChartCard() {
  const bars = [18, 24, 22, 33, 50, 72, 78];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-bold">Progress</h3>
        <span className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-500">This Week</span>
      </div>
      <div className="flex h-36 items-end gap-2 border-b border-l border-zinc-100 pl-2">
        {bars.map((bar, index) => (
          <div key={index} className="flex flex-1 items-end">
            <div className="w-full rounded-t bg-[#9cc99b]" style={{ height: `${bar}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function toDisplayName(name: string) {
  const normalized = name.replace(/[._-]+/g, ' ').trim();
  if (!normalized) return 'Learner';
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
