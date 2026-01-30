'use client';

import { trpc } from '@/utils/trpc';
import {
  BarChart2,
  Clock,
  LayoutDashboard,
  List,
  Receipt,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
} from 'react';

// 格式化更新时间显示
const formatUpdateTime = (updateTime: Date | string | null): string => {
  if (!updateTime) {
    return '暂无数据';
  }

  const time = new Date(updateTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const timeDate = new Date(
    time.getFullYear(),
    time.getMonth(),
    time.getDate()
  );

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  if (timeDate.getTime() === today.getTime()) {
    return `今日 ${hours}:${minutes}`;
  } else if (timeDate.getTime() === yesterday.getTime()) {
    return `昨日 ${hours}:${minutes}`;
  } else {
    const month = (time.getMonth() + 1).toString().padStart(2, '0');
    const day = time.getDate().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }
};

export default function ChannelDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeapp = searchParams.get('typeapp');
  const currentView = pathname?.split('/').pop() || 'report';

  // 构建带参数的 URL
  const buildUrl = (path: string) => {
    if (typeapp) {
      return `${path}?typeapp=${typeapp}`;
    }
    return path;
  };
  const [latestUpdateTime, setLatestUpdateTime] = useState<
    Date | string | null
  >(null);

  // 获取最后更新时间
  useEffect(() => {
    const fetchUpdateTime = async () => {
      try {
        const updateTime = await trpc.channel.getLatestUpdateTime.query();
        setLatestUpdateTime(updateTime);
      } catch (error) {
        console.error('获取更新时间失败:', error);
      }
    };

    fetchUpdateTime();
  }, []);

  const latestUpdateTimeText = formatUpdateTime(latestUpdateTime);
  const isRankingView = currentView === 'ranking';

  return (
    <div className='h-dvh bg-slate-50 font-sans text-slate-800 pb-12 overflow-hidden'>
      {/* Header */}
      <header className='bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3 flex items-center justify-between shadow-sm'>
        <div className='flex items-center gap-2'>
          <div
            className={`text-white p-1.5 rounded-lg shadow-sm ${
              typeapp === 'jiantie'
                ? 'bg-red-300 shadow-red-200'
                : 'bg-blue-600 shadow-blue-200'
            }`}
          >
            <LayoutDashboard size={20} />
          </div>
          <h1 className='text-lg font-bold text-slate-800 tracking-tight'>
            {typeapp === 'jiantie'
              ? '简帖数据面板'
              : typeapp === 'maka'
                ? 'MAKA数据面板'
                : '数据面板'}
          </h1>
          <div className='mx-4 h-6 w-px bg-slate-200'></div>

          <div className='flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar'>
            <Link
              href={buildUrl('/dashboard/manager/data/channel/report')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'report'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 业务报表
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/channel/ranking')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'ranking'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={16} /> 商城排序
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/channel/orders')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'orders'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Receipt size={16} /> 订单列表
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/channel/userList')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'userList'
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={16} /> 用户列表
            </Link>
            {/* <Link
              href={buildUrl('/dashboard/manager/data/channel/market')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'market'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MousePointer2 size={16} /> 市场渠道
            </Link> */}
            {typeapp !== 'maka' && (
              <Link
                href={buildUrl('/dashboard/manager/data/channel/creator')}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  currentView === 'creator'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserCheck size={16} /> 创作者分析
              </Link>
            )}
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <div className='hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200'>
            <Clock size={14} />
            <span>数据更新: {latestUpdateTimeText}</span>
          </div>
        </div>
      </header>

      <main className=' max-w-7xl mx-auto px-4 sm:px-6 py-8 h-dvh overflow-y-auto pb-32'>
        {Children.map(children, child => {
          if (isValidElement(child)) {
            return cloneElement(child, { appid: 'jiantie' } as any);
          }
          return child;
        })}
      </main>
    </div>
  );
}
