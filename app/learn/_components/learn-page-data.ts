import { BookOpen, Headphones, HelpCircle, RotateCcw, Sprout } from 'lucide-react';

export const lessonCards = [
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

export const quickPractice = [
  {
    title: 'Flashcards',
    desc: 'Review vocabulary',
    icon: BookOpen,
    color: 'bg-[#e5f0e4] text-[#5d9361] dark:bg-emerald-950/50 dark:text-emerald-200',
  },
  {
    title: 'Quick Quiz',
    desc: '5 questions',
    icon: HelpCircle,
    color: 'bg-[#ede5fb] text-[#8564cf] dark:bg-violet-950/50 dark:text-violet-200',
  },
  {
    title: 'Listen & Repeat',
    desc: 'Improve your pronunciation',
    icon: Headphones,
    color: 'bg-[#e4edfb] text-[#4b75bd] dark:bg-sky-950/50 dark:text-sky-200',
  },
];

export const learningCycleSteps = [
  {
    title: '1. Read & Listen',
    desc: 'Real conversations and stories in context.',
    icon: BookOpen,
    bg: 'bg-[#e8efe1] dark:bg-emerald-950/50',
  },
  {
    title: '2. Practice',
    desc: 'Engaging quizzes to understand and apply.',
    icon: HelpCircle,
    bg: 'bg-[#fde6d1] dark:bg-orange-950/40',
  },
  {
    title: '3. Review',
    desc: 'Smart review brings it back to your memory.',
    icon: RotateCcw,
    bg: 'bg-[#eee5fb] dark:bg-violet-950/50',
  },
  {
    title: '4. Grow',
    desc: 'Track progress and build confidence every day.',
    icon: Sprout,
    bg: 'bg-[#e7efdf] dark:bg-lime-950/40',
  },
];
