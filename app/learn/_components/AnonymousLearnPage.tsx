import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, Leaf, Volume2 } from 'lucide-react';
import { GoalCard, MiniListCard, ProgressChartCard, StreakCard } from './ProgressCards';
import { learningCycleSteps } from './learn-page-data';

export function AnonymousLearnPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-2 pb-10 text-[#1f1b18] dark:text-zinc-100">
      <AnonymousHeroSection />
      <LessonPreviewSection />
      <LearningCycleSection />
      <ProgressPreviewSection />
      <StartCtaSection />
    </div>
  );
}

function AnonymousHeroSection() {
  return (
    <section className="grid min-h-[360px] gap-8 overflow-hidden rounded-[28px] bg-[#fffdfa] dark:bg-zinc-900 lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col justify-center px-4 py-8 sm:px-9 lg:px-10">
        <p className="mb-4 text-xs font-black uppercase tracking-widest text-[#4f8a50]">
          Learn with HolaLingo
        </p>
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
          Learn Spanish,
          <br />
          the natural and cozy way.
        </h1>
        <p className="mt-6 max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
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
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
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
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#fffdfa] to-transparent dark:from-zinc-900" />
        <div className="absolute left-8 top-16 w-56 rounded-xl border border-white/70 bg-white/90 p-5 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
          <div className="mb-3 flex items-center justify-between">
            <strong className="font-serif text-lg">¡Buenos dias!</strong>
            <Volume2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Good morning!</p>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5f9f61] text-white">
              <Check className="h-4 w-4" />
            </span>
            <span className="h-2 flex-1 rounded-full bg-[#e7ded4] dark:bg-zinc-700" />
            <span className="h-2 flex-1 rounded-full bg-[#e7ded4] dark:bg-zinc-700" />
            <span className="h-2 flex-1 rounded-full bg-[#e7ded4] dark:bg-zinc-700" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LessonPreviewSection() {
  return (
    <section className="grid gap-6 rounded-[28px] border border-zinc-200/80 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/20 md:grid-cols-[0.8fr_1.25fr_0.55fr] md:p-8">
      <div>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef5ea] text-[#5f9f61] dark:bg-emerald-950/50 dark:text-emerald-200">
          <Leaf className="h-6 w-6" />
        </div>
        <h2 className="font-serif text-2xl font-semibold">Experience a Lesson</h2>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">
          Try a short interactive lesson.
          <br />
          No sign-up required!
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
        <p className="mb-5 text-xs text-zinc-500 dark:text-zinc-400">Fill in the blank</p>
        <p className="font-serif text-2xl">Maria pide un ________.</p>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Maria orders a coffee.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {['libro book', 'cafe coffee', 'casa house'].map((option, index) => (
            <button
              key={option}
              className={`rounded-lg border px-4 py-3 text-sm transition ${
                index === 1
                  ? 'border-[#57985a] bg-[#f2fbf0] text-[#3f7d42] dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-100'
                  : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
              }`}
            >
              <span className="block font-semibold">{option.split(' ')[0]}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{option.split(' ')[1]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#65a766] text-white">
          <Check className="h-8 w-8" />
        </span>
        <strong className="text-lg">¡Correcto!</strong>
        <span className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Great job!</span>
      </div>
    </section>
  );
}

function LearningCycleSection() {
  return (
    <section className="rounded-[28px] bg-[#fffdfa] px-5 py-8 text-center shadow-sm dark:bg-zinc-900 dark:shadow-black/20">
      <h2 className="font-serif text-3xl font-semibold">How You Learn with HolaLingo</h2>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">Learn, practice, and review in a simple cycle that sticks.</p>
      <div className="mt-9 grid gap-6 md:grid-cols-4">
        {learningCycleSteps.map((step) => (
          <div key={step.title} className="flex flex-col items-center">
            <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full ${step.bg}`}>
              <step.icon className="h-9 w-9 text-[#5c7f56] dark:text-emerald-200" />
            </div>
            <h3 className="font-bold">{step.title}</h3>
            <p className="mt-2 max-w-48 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgressPreviewSection() {
  return (
    <section className="grid gap-8 rounded-[28px] bg-[#fff8ec] p-6 shadow-sm dark:bg-zinc-900 dark:shadow-black/20 lg:grid-cols-[0.55fr_1fr] lg:p-9">
      <div>
        <h2 className="font-serif text-3xl font-semibold">
          Your Progress,
          <br />
          Beautifully Tracked
        </h2>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">Stay motivated with a clear view of your learning journey.</p>
        <ul className="mt-8 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
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
  );
}

function StartCtaSection() {
  return (
    <section className="grid items-center gap-8 overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 md:grid-cols-[0.42fr_1fr]">
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
          <span className="text-sm text-zinc-500 dark:text-zinc-400">No credit card required</span>
        </div>
      </div>
    </section>
  );
}
