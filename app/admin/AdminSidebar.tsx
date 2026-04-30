'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  AudioLines, 
  Settings,
  ChevronRight,
  Languages,
  BookOpen,
  MessageSquare,
  GitMerge,
  BookMarked,
  FolderTree,
  Video,
  Menu,
  X
} from 'lucide-react';

interface AdminSidebarProps {
  userEmail: string;
}

export default function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, href: '/admin' },
    { id: 'languages', label: '언어 관리', icon: Languages, href: '/admin/languages' },
    { id: 'words', label: '단어 관리', icon: BookOpen, href: '/admin/words' },
    { id: 'sentences', label: '문장 관리', icon: MessageSquare, href: '/admin/sentences' },
    { id: 'channels', label: '채널 관리', icon: FolderTree, href: '/admin/channels' },
    { id: 'videos', label: '영상 관리', icon: Video, href: '/admin/videos' },
    { id: 'users', label: '사용자 관리', icon: Users, href: '/admin/users' },
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
        fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 overflow-y-auto z-[60] transition-transform duration-300
        md:top-[5rem] md:h-[calc(100vh-5rem)] md:z-40
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 md:shadow-none'}
      `}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">운영관리</h2>
          <p className="text-xs text-gray-500 mt-1 break-all">{userEmail}</p>
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
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
