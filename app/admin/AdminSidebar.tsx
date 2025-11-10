'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  AudioLines, 
  FolderTree, 
  Settings,
  ChevronRight,
  Languages,
  BookOpen,
  MessageSquare,
  GitMerge,
  BookMarked
} from 'lucide-react';

interface AdminSidebarProps {
  userEmail: string;
}

export default function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, href: '/admin' },
    { id: 'languages', label: '언어 관리', icon: Languages, href: '/admin/languages' },
    { id: 'words', label: '단어 관리', icon: BookOpen, href: '/admin/words' },
    { id: 'sentences', label: '문장 관리', icon: MessageSquare, href: '/admin/sentences' },
    { id: 'conjugations', label: '동사 활용', icon: GitMerge, href: '/admin/verb-conjugations' },
    { id: 'mappings', label: '단어-문장 매핑', icon: BookMarked, href: '/admin/word-sentence-map' },
    { id: 'users', label: '사용자 관리', icon: Users, href: '/admin/users' },
    { id: 'audio', label: '오디오 관리', icon: AudioLines, href: '/admin/audio' },
    { id: 'categories', label: '카테고리 관리', icon: FolderTree, href: '/admin/categories' },
    { id: 'settings', label: '시스템 설정', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <div className="fixed left-0 top-[5rem] h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto z-40">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">운영관리</h2>
        <p className="text-xs text-gray-500 mt-1">{userEmail}</p>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.id}
              href={item.href}
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
  );
}
