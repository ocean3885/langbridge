'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ChevronRight,
  Languages,
  BookOpen,
  MessageSquare,
  BookMarked,
  Images,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';

interface AdminSidebarProps {
  userEmail: string;
  language?: 'ko' | 'en';
}

export default function AdminSidebar({ userEmail, language = 'en' }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, href: '/admin' },
    { id: 'languages', label: '언어 관리', icon: Languages, href: '/admin/languages' },
    { id: 'words', label: '단어 관리', icon: BookOpen, href: '/admin/words' },
    { id: 'sentences', label: '문장 관리', icon: MessageSquare, href: '/admin/sentences' },
    { id: 'bundles', label: '번들 관리', icon: BookMarked, href: '/admin/bundles' },
    { id: 'assets', label: '에셋 관리', icon: Images, href: '/admin/assets' },
  ];

  return (
    <>
      {/* Mobile Toggle Button (Floating Action Button) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-6 right-6 z-[60] p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-[50]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-[#F9F7F2] dark:bg-gray-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto z-[60] transition-transform duration-300
        md:top-[5rem] md:h-[calc(100vh-5rem)] md:z-40
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 md:shadow-none'}
      `}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">운영관리</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 break-all">{userEmail}</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-[#EEF7EF] dark:bg-emerald-500/10 text-[#5B8A61] dark:text-emerald-400 font-medium' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:text-[#5B8A61] dark:hover:text-emerald-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">
              {language === 'ko' ? '사이트로 돌아가기' : 'Back to site'}
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
