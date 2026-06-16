import { 
  Users, 
  BookOpen, 
  BookMarked,
  MessageSquare
} from 'lucide-react';

type AdminDashboardStats = {
  totalUsers: number;
  publishedBundles: number;
  totalWords: number;
  totalSentences: number;
};

interface AdminDashboardProps {
  stats: AdminDashboardStats;
}

const statCards = [
  {
    label: '전체 사용자',
    valueKey: 'totalUsers',
    icon: Users,
    iconClassName: 'text-blue-500',
  },
  {
    label: '공개 번들',
    valueKey: 'publishedBundles',
    icon: BookMarked,
    iconClassName: 'text-emerald-500',
  },
  {
    label: '전체 단어',
    valueKey: 'totalWords',
    icon: BookOpen,
    iconClassName: 'text-green-500',
  },
  {
    label: '전체 문장',
    valueKey: 'totalSentences',
    icon: MessageSquare,
    iconClassName: 'text-orange-500',
  },
] as const;

export default function AdminDashboard({ stats }: AdminDashboardProps) {
  const numberFormatter = new Intl.NumberFormat('ko-KR');

  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-zinc-950">
      {/* 메인 콘텐츠 영역 */}
      <div className="md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">관리자 대시보드</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">시스템 현황을 확인하고 관리할 수 있습니다.</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.valueKey}
                  className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-6 border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                        {numberFormatter.format(stats[card.valueKey])}
                      </p>
                    </div>
                    <Icon className={`w-10 h-10 ${card.iconClassName}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
