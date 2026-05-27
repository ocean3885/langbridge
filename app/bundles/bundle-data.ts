import {
  BookOpen,
  Camera,
  Landmark,
  MessageCircle,
  Users,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BundleCopy, Language } from './types';

export const translations: Record<Language, BundleCopy> = {
  ko: {
    title: 'Explore Bundles',
    description: 'Choose from six learning paths designed to help you build Spanish naturally, one bundle at a time.',
    search: 'Search bundles, topics, or situations...',
    categories: 'Bundle Categories',
    featured: 'Featured this week',
    start: 'Start Bundle',
    preview: 'Preview',
    viewAll: 'View all',
    noBundlesTitle: 'No published bundles',
    noBundlesDesc: 'New learning bundles are being prepared. Please wait!',
    bundles: 'bundles',
    lessons: 'lessons',
    minutes: 'min',
    beginner: 'Beginner',
    journey: 'Start your Spanish journey',
    journeySub: 'Step by step, in your way.',
  },
  en: {
    title: 'Explore Bundles',
    description: 'Choose from six learning paths designed to help you build Spanish naturally, one bundle at a time.',
    search: 'Search bundles, topics, or situations...',
    categories: 'Bundle Categories',
    featured: 'Featured this week',
    start: 'Start Bundle',
    preview: 'Preview',
    viewAll: 'View all',
    noBundlesTitle: 'No published bundles',
    noBundlesDesc: 'New learning bundles are being prepared. Please wait!',
    bundles: 'bundles',
    lessons: 'lessons',
    minutes: 'min',
    beginner: 'Beginner',
    journey: 'Start your Spanish journey',
    journeySub: 'Step by step, in your way.',
  },
};

export const categoryStyles: {
  icon: LucideIcon;
  color: string;
  iconColor: string;
}[] = [
  {
    icon: Waves,
    color: 'bg-[#edf3df]',
    iconColor: 'text-[#4f8a50]',
  },
  {
    icon: MessageCircle,
    color: 'bg-[#ffe3ad]',
    iconColor: 'text-[#8a6828]',
  },
  {
    icon: Users,
    color: 'bg-[#dce9f6]',
    iconColor: 'text-[#4c7197]',
  },
  {
    icon: Camera,
    color: 'bg-[#e7def9]',
    iconColor: 'text-[#7260a8]',
  },
  {
    icon: BookOpen,
    color: 'bg-[#f9dfca]',
    iconColor: 'text-[#9a6645]',
  },
  {
    icon: Landmark,
    color: 'bg-[#e9f0dc]',
    iconColor: 'text-[#637d50]',
  },
];

export const fallbackImages = [
  '/images/heroimg_land.jpg',
  '/images/main.png',
  '/images/heroimg_port.jpg',
];
