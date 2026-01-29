'use client';

import { BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';

interface ProductLayoutProps {
  children: ReactNode;
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appid = searchParams.get('appid') || '';

  // 获取当前视图：从路径中提取最后一个部分，如果是 index 或 product，则默认为 index
  const pathParts = pathname?.split('/').filter(Boolean) || [];
  const lastPart = pathParts[pathParts.length - 1] || 'uni';
  const currentView = lastPart === 'product' ? 'uni' : lastPart;

  // 构建带参数的 URL
  const buildUrl = (path: string) => {
    if (appid) {
      return `${path}?appid=${appid}`;
    }
    return path;
  };

  // 根据 appid 显示标题
  const getTitle = () => {
    if (appid === 'jiantie') {
      return '简帖看板';
    } else if (appid === 'maka') {
      return 'MAKA看板';
    }
    return '产品看板';
  };

  return (
    <div className='h-dvh bg-slate-50 font-sans text-slate-800 pb-12 overflow-hidden'>
      {/* Header */}
      <header className='bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3 flex items-center justify-between shadow-sm'>
        <div className='flex items-center gap-2'>
          <div
            className={`text-white p-1.5 rounded-lg shadow-sm ${
              appid === 'jiantie'
                ? 'bg-red-300 shadow-red-200'
                : appid === 'maka'
                  ? 'bg-blue-600 shadow-blue-200'
                  : 'bg-slate-400 shadow-slate-300'
            }`}
          >
            <BarChart2 size={20} />
          </div>
          <h1 className='text-lg font-bold text-slate-800 tracking-tight'>
            {getTitle()}
          </h1>
          <div className='mx-4 h-6 w-px bg-slate-200'></div>

          <div className='flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar'>
            <Link
              href={buildUrl('/dashboard/manager/data/bi/product/index')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'index'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 综合面板
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/bi/product/gain')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'gain'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 渠道获客面板
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/bi/product/channel')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'channel'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 频道看板
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/bi/product/templateList')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'templateList'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 模板列表
            </Link>
            <Link
              href={buildUrl(
                '/dashboard/manager/data/bi/product/tempalteGenSales'
              )}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'tempalteGenSales'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 模板产销
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/bi/product/userlist')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'userlist'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 用户列表
            </Link>
            {/* <Link
              href={buildUrl('/dashboard/manager/data/bi/product/userinfo')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'userinfo'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 用户分析
            </Link> */}
            <Link
              href={buildUrl('/dashboard/manager/data/bi/product/orders')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'orders'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> 订单列表
            </Link>
            <Link
              href={buildUrl('/dashboard/manager/data/bi/product/abtest')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                currentView === 'abtest'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart2 size={16} /> ABtest看板
            </Link>
            {/* 搜索看板 - 仅当 appid=maka 时显示 */}
            {appid === 'maka' && (
              <Link
                href={buildUrl('/dashboard/manager/data/bi/product/search')}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  currentView === 'search'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart2 size={16} /> 搜索词看板
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className='mx-auto px-4 sm:px-6 py-8 h-dvh overflow-y-auto pb-32'>
        {children}
      </main>
    </div>
  );
}
