"use client";

import Image from 'next/image';
import {
  BookOpen,
  Briefcase,
  Coffee,
  Globe,
  Grid2X2,
  Plane,
  ScrollText,
  Target,
  ArrowRight,
  Bookmark,
  BarChart3,
  FileText,
  Gift,
} from "lucide-react";

const translations = {
  ko: {
    badge: "3. 번들 카테고리",
    title: (
      <>
        다양한 <span className="text-[#5B8A61]">번들</span>로 배우는 스페인어
      </>
    ),
    description: "여행, 일상, 비즈니스까지. 상황에 맞는 번들을 선택하고 체계적으로 학습해보세요.",
    viewAll: "모든 번들 보기",
    moreBundles: {
      title: "더 많은 번들을 만나보세요!",
      desc: "LangBridge는 계속 새로운 번들을 추가하고 있어요.",
    },
    categories: [
      { label: "전체", icon: Grid2X2 },
      { label: "일상 회화", icon: Coffee },
      { label: "여행", icon: Plane },
      { label: "비즈니스", icon: Briefcase },
      { label: "문법 & 표현", icon: BookOpen },
      { label: "문화", icon: Globe },
      { label: "시험 대비", icon: Target },
    ],
    bundles: [
      {
        category: "일상 회화",
        title: "카페에서 시작하는 스페인어",
        desc: "카페, 쇼핑, 약속 등 일상에서 자주 쓰는 표현들을 배워요.",
        count: "120 문장",
        level: "초급",
        color: "orange",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "여행",
        title: "스페인 여행 필수 표현",
        desc: "공항, 호텔, 식당, 관광지에서 바로 사용할 수 있는 표현들!",
        count: "150 문장",
        level: "초급~중급",
        color: "blue",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "비즈니스",
        title: "비즈니스 스페인어 마스터",
        desc: "회의, 이메일, 프레젠테이션 등 업무에 필요한 표현을 학습해요.",
        count: "110 문장",
        level: "중급",
        color: "green",
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "문법 & 표현",
        title: "동사 활용 완벽 마스터",
        desc: "스페인어 동사 변화를 체계적으로 익히고 다양한 표현을 확장해요.",
        count: "80 레슨",
        level: "초급~중급",
        color: "purple",
        image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "문화",
        title: "스페인 문화와 함께 배우기",
        desc: "문화 속 이야기와 표현을 통해 더 자연스럽게 스페인어를 익혀요.",
        count: "90 문장",
        level: "초급~중급",
        color: "yellow",
        image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "시험 대비",
        title: "DELE A2 완벽 대비",
        desc: "DELE 시험 유형에 맞춘 문제와 표현을 반복 학습하여 실력을 완성해요.",
        count: "200 문장",
        level: "중급~고급",
        color: "red",
        image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200&auto=format&fit=crop",
      },
    ]
  },
  en: {
    badge: "Bundle Categories",
    title: (
      <>
        Learn Spanish with <span className="text-[#5B8A61]">Diverse Bundles</span>
      </>
    ),
    description: "From travel to business, choose bundles that fit your situation and learn systematically.",
    viewAll: "View All Bundles",
    moreBundles: {
      title: "Discover more bundles!",
      desc: "LangBridge is constantly adding new learning content.",
    },
    categories: [
      { label: "All", icon: Grid2X2 },
      { label: "Daily", icon: Coffee },
      { label: "Travel", icon: Plane },
      { label: "Business", icon: Briefcase },
      { label: "Grammar", icon: BookOpen },
      { label: "Culture", icon: Globe },
      { label: "Exams", icon: Target },
    ],
    bundles: [
      {
        category: "Daily",
        title: "Spanish for Cafe Lovers",
        desc: "Learn expressions for cafes, shopping, and social meetings.",
        count: "120 Sentences",
        level: "Beginner",
        color: "orange",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "Travel",
        title: "Travel Essentials",
        desc: "Must-have expressions for airports, hotels, and restaurants!",
        count: "150 Sentences",
        level: "Beg~Int",
        color: "blue",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "Business",
        title: "Business Spanish Master",
        desc: "Master expressions for meetings, emails, and presentations.",
        count: "110 Sentences",
        level: "Intermediate",
        color: "green",
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "Grammar",
        title: "Verb Conjugation Master",
        desc: "Master Spanish verb changes and expand your expressions.",
        count: "80 Lessons",
        level: "Beg~Int",
        color: "purple",
        image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "Culture",
        title: "Learn with Spanish Culture",
        desc: "Acquire Spanish naturally through cultural stories and tips.",
        count: "90 Sentences",
        level: "Beg~Int",
        color: "yellow",
        image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=1200&auto=format&fit=crop",
      },
      {
        category: "Exams",
        title: "DELE A2 Prep",
        desc: "Practice with patterns tailored for the DELE A2 exam.",
        count: "200 Sentences",
        level: "Int~Adv",
        color: "red",
        image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200&auto=format&fit=crop",
      },
    ]
  }
};

const colorStyles = {
  orange: {
    border: "border-[#F4D8CB] dark:border-orange-500/30",
    bg: "bg-[#FFF8F4] dark:bg-orange-950/10",
    text: "text-[#EA7A4C] dark:text-orange-400",
    badge: "bg-[#FFF1EA] dark:bg-orange-950/30",
  },
  blue: {
    border: "border-[#D6E5F5] dark:border-blue-500/30",
    bg: "bg-[#F7FBFF] dark:bg-blue-950/10",
    text: "text-[#4A83C7] dark:text-blue-400",
    badge: "bg-[#EEF5FD] dark:bg-blue-950/30",
  },
  green: {
    border: "border-[#DCEBDE] dark:border-emerald-500/30",
    bg: "bg-[#F8FCF8] dark:bg-emerald-950/10",
    text: "text-[#5B9A66] dark:text-emerald-400",
    badge: "bg-[#EEF8F0] dark:bg-emerald-950/30",
  },
  purple: {
    border: "border-[#E7DCF5] dark:border-purple-500/30",
    bg: "bg-[#FCFAFF] dark:bg-purple-950/10",
    text: "text-[#9B73D6] dark:text-purple-400",
    badge: "bg-[#F5F0FD] dark:bg-purple-950/30",
  },
  yellow: {
    border: "border-[#F6E2B8] dark:border-amber-500/30",
    bg: "bg-[#FFFDF7] dark:bg-amber-950/10",
    text: "text-[#E5A92E] dark:text-amber-400",
    badge: "bg-[#FFF5DB] dark:bg-amber-950/30",
  },
  red: {
    border: "border-[#F6D8D8] dark:border-red-500/30",
    bg: "bg-[#FFF8F8] dark:bg-red-950/10",
    text: "text-[#E36D6D] dark:text-red-400",
    badge: "bg-[#FFF0F0] dark:bg-red-950/30",
  },
};

export default function BundleCategoriesSection({ lang = 'ko' }: { lang?: 'ko' | 'en' }) {
  const t = translations[lang];

  return (
    <section className="bg-[#F8F5F1] dark:bg-zinc-950 py-12 sm:py-16 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Top Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#BFD6C2] dark:border-emerald-500/20 bg-white dark:bg-emerald-500/10 px-5 py-2 text-sm font-medium text-[#5B8A61] dark:text-emerald-300">
            <BookOpen className="h-4 w-4" />
            {t.badge}
          </div>
        </div>

        {/* Heading */}
        <div className="mx-auto mt-8 max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#1D1D1D] dark:text-zinc-100 sm:text-4xl md:text-5xl lg:text-6xl break-words">
            {t.title}
          </h2>

          <p className="mt-4 text-base leading-relaxed text-[#6F6F6F] dark:text-zinc-400 md:mt-6 md:text-lg break-words">
            {t.description}
          </p>
        </div>

        {/* Category Pills */}
        <div className="mt-10 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {t.categories.map((item, idx) => {
            const Icon = item.icon;
            const isActive = idx === 0;

            return (
              <button
                key={idx}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all duration-200 ${isActive
                    ? "border-[#5B8A61] bg-[#5B8A61] text-white shadow-md shadow-emerald-900/10"
                    : "border-[#E8E3DC] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#555] dark:text-zinc-300 hover:border-[#C7D8C9] hover:bg-[#F7FBF7] dark:hover:bg-zinc-800"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Bundle Grid/Swipe */}
        <div className="mt-8 flex gap-5 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-3">
          {t.bundles.map((bundle, idx) => {
            const style = colorStyles[bundle.color as keyof typeof colorStyles];

            return (
              <div
                key={idx}
                className={`group w-[calc(100vw-120px)] shrink-0 snap-start overflow-hidden rounded-[2rem] border transition-all duration-300 isolate md:w-auto md:hover:-translate-y-1 md:hover:shadow-xl ${style.border} ${style.bg}`}
              >
                {/* Image */}
                <div className="relative h-[160px] sm:h-[180px] overflow-hidden rounded-t-[2rem]">
                  <Image
                    src={bundle.image}
                    alt={bundle.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />

                  <div className="absolute right-4 top-4 rounded-full bg-white/90 dark:bg-zinc-900/90 p-2 shadow-sm backdrop-blur">
                    <Bookmark className={`h-4 w-4 ${style.text}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6">
                  <div
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style.badge} ${style.text}`}
                  >
                    {bundle.category}
                  </div>

                  <h3 className="mt-4 text-2xl font-bold leading-tight text-[#1D1D1D] dark:text-zinc-100 sm:text-3xl break-words">
                    {bundle.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-[#666] dark:text-zinc-400 sm:text-base break-words">
                    {bundle.desc}
                  </p>

                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-between border-t border-black/5 dark:border-white/10 pt-4">
                    <div className="flex items-center gap-5 text-sm font-medium text-[#777]">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        {bundle.count}
                      </div>

                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-zinc-400" />
                        {bundle.level}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-[#EAE5DE] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm md:mt-10 lg:flex-row lg:items-center lg:p-8">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EEF7EF] dark:bg-emerald-500/10 text-[#5B8A61] dark:text-emerald-400">
              <Gift className="h-7 w-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#1D1D1D] dark:text-zinc-100 sm:text-2xl break-words">
                {t.moreBundles.title}
              </h3>

              <p className="mt-1 text-sm text-[#6B6B6B] dark:text-zinc-400 sm:text-base break-words">
                {t.moreBundles.desc}
              </p>
            </div>
          </div>

          <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5B8A61] px-8 py-4 text-base font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-[#4D7953] active:scale-95 lg:w-auto">
            {t.viewAll}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}