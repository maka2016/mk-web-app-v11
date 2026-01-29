//数据源说明
//内部设计师业绩分析
//每个设计师按照拥有的模板数据进行聚合排序分析
//聚合指标为：GMV、销量、新品量、综合评分（暂时为0）、环比增长
//新品为create_time在周期内的模板

//近14天新品爬坡监控
//关注create_time在至今14天内的新模板
// 冷启动期: 发布 3 天内，曝光 < 5000，侧重观察点击率。
// 爬坡期: 发布 3-7 天，侧重观察转化率。
// 爆发期: 发布 14 天内，

'use client';

import { cdnApi } from '@/services';
import { trpc } from '@/utils/trpc';
import { Flame, History, Medal, Rocket, TrendingUp, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { renderScore } from '../shared/components';
import { formatMoney, formatNumber } from '../shared/constants';

// 创作者排行榜组件
const CreatorLeaderboard = () => {
  const router = useRouter();
  const [mode, setMode] = useState<
    | 'current_month'
    | 'last_month'
    | 'current_quarter'
    | 'last_quarter'
    | 'total'
  >('current_month');
  const [isLoading, setIsLoading] = useState(true);
  const [currentData, setCurrentData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await trpc.channel.getCreatorStatistics.query({
          mode,
          device: 'all',
        });
        setCurrentData(data || []);
      } catch (error) {
        console.error('获取设计师统计数据失败:', error);
        setCurrentData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [mode]);

  const isPeriodMode = () => {
    return (
      mode === 'current_month' ||
      mode === 'last_month' ||
      mode === 'current_quarter' ||
      mode === 'last_quarter'
    );
  };

  const getLabel = (key: string) => {
    const prefix =
      mode === 'current_month'
        ? '本月'
        : mode === 'last_month'
          ? '上月'
          : mode === 'current_quarter'
            ? '本季'
            : mode === 'last_quarter'
              ? '上季'
              : '累计';
    const labels: Record<string, string> = {
      gmv: `${prefix}GMV`,
      sales: `${prefix}销量`,
      templateCount: `${prefix}模板上新量`,
      newTemplateSales: `${prefix}新模板销量`,
      newTemplateGmv: `${prefix}新模板销售额`,
    };
    return labels[key] || key;
  };

  const getIcon = () => {
    if (mode === 'current_month')
      return <Flame size={18} className='text-red-500' />;
    if (mode === 'last_month')
      return <History size={18} className='text-blue-500' />;
    if (mode === 'current_quarter')
      return <TrendingUp size={18} className='text-green-500' />;
    if (mode === 'last_quarter')
      return <History size={18} className='text-purple-500' />;
    return <Medal size={18} className='text-yellow-600' />;
  };

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col'>
      <div className='px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30'>
        <div className='flex items-center gap-4'>
          <h3 className='font-bold text-slate-800 flex items-center gap-2'>
            {getIcon()}
            设计师排行榜
          </h3>
          <div className='bg-slate-200 p-1 rounded-lg flex flex-wrap gap-1 text-xs font-medium'>
            <button
              onClick={() => setMode('current_month')}
              className={`px-3 py-1 rounded-md transition-all ${
                mode === 'current_month'
                  ? 'bg-white shadow text-red-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              本月趋势
            </button>
            <button
              onClick={() => setMode('last_month')}
              className={`px-3 py-1 rounded-md transition-all ${
                mode === 'last_month'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              上月排行
            </button>
            <button
              onClick={() => setMode('current_quarter')}
              className={`px-3 py-1 rounded-md transition-all ${
                mode === 'current_quarter'
                  ? 'bg-white shadow text-green-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              本季趋势
            </button>
            <button
              onClick={() => setMode('last_quarter')}
              className={`px-3 py-1 rounded-md transition-all ${
                mode === 'last_quarter'
                  ? 'bg-white shadow text-purple-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              上季排行
            </button>
            <button
              onClick={() => setMode('total')}
              className={`px-3 py-1 rounded-md transition-all ${
                mode === 'total'
                  ? 'bg-white shadow text-yellow-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              历史总榜
            </button>
          </div>
        </div>
      </div>
      <div className='overflow-x-auto flex-1'>
        <table className='w-full text-left text-sm'>
          <thead className='bg-slate-50 text-slate-500 font-medium'>
            <tr>
              <th className='px-6 py-3 w-16 text-center'>排名</th>
              <th className='px-4 py-3'>设计师</th>
              <th className='px-4 py-3 text-right'>{getLabel('gmv')}</th>
              <th className='px-4 py-3 text-right'>{getLabel('sales')}</th>
              {isPeriodMode() && (
                <>
                  <th className='px-4 py-3 text-right'>
                    {getLabel('templateCount')}
                  </th>
                  <th className='px-4 py-3 text-right'>
                    {getLabel('newTemplateSales')}
                  </th>
                  <th className='px-4 py-3 text-right'>
                    {getLabel('newTemplateGmv')}
                  </th>
                </>
              )}
              <th className='px-4 py-3 text-center'>综合评分</th>
              {isPeriodMode() && (
                <th className='px-4 py-3 text-right'>环比增长</th>
              )}
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {isLoading ? (
              <tr>
                <td
                  colSpan={mode === 'total' ? 5 : 8}
                  className='px-6 py-8 text-center text-slate-400'
                >
                  加载中...
                </td>
              </tr>
            ) : currentData.length === 0 ? (
              <tr>
                <td
                  colSpan={mode === 'total' ? 5 : 8}
                  className='px-6 py-8 text-center text-slate-400'
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              currentData.map((c: any) => (
                <tr
                  key={c.id}
                  className='hover:bg-slate-50'
                  onClick={() => {
                    router.push(
                      `/dashboard/manager/data/designer/${c.designer_uid}`
                    );
                  }}
                >
                  <td className='px-6 py-3 text-center'>
                    <span
                      className={`font-bold text-lg font-mono ${
                        c.rank <= 3
                          ? mode === 'total'
                            ? 'text-yellow-600'
                            : 'text-red-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {c.rank}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <span className='font-bold text-slate-700'>
                      {c.name || '设计师名称'}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-bold ${
                      mode === 'total' ? 'text-slate-700' : 'text-red-600'
                    }`}
                  >
                    {formatMoney(c.gmv || 0)}
                  </td>
                  <td className='px-4 py-3 text-right font-mono text-slate-600'>
                    {formatNumber(c.sales || 0)}
                  </td>
                  {isPeriodMode() && (
                    <>
                      <td className='px-4 py-3 text-right font-mono text-slate-600'>
                        {formatNumber(c.templateCount || 0)}
                      </td>
                      <td className='px-4 py-3 text-right font-mono text-slate-600'>
                        {formatNumber(c.newTemplateSales || 0)}
                      </td>
                      <td className='px-4 py-3 text-right font-mono font-bold text-blue-600'>
                        {formatMoney(c.newTemplateGmv || 0)}
                      </td>
                    </>
                  )}
                  <td className='px-4 py-3 text-center'>
                    {renderScore(c.score || 0)}
                  </td>
                  {isPeriodMode() && (
                    <td className='px-4 py-3 text-right'>
                      <div
                        className={`text-xs flex items-center justify-end font-bold ${
                          c.trend > 0
                            ? 'text-red-500'
                            : c.trend < 0
                              ? 'text-green-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {c.trend !== 0 ? (
                          <TrendingUp
                            size={12}
                            className={`mr-1 ${c.trend < 0 ? 'rotate-180' : ''}`}
                          />
                        ) : null}
                        {c.trend === 0 ? '-' : `${Math.abs(c.trend || 0)}%`}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 新品爬坡监控组件
const NewWorksMonitor = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [works, setWorks] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await trpc.channel.getNewWorksMonitor.query({
          device: 'all',
        });
        // 按销量、CTR从大到小排序
        const sortedData = (data || []).sort((a: any, b: any) => {
          const salesA = a.metrics?.order_count || 0;
          const salesB = b.metrics?.order_count || 0;
          const ctrA = a.metrics?.ctr || 0;
          const ctrB = b.metrics?.ctr || 0;

          // 首先按销量降序
          if (salesA !== salesB) {
            return salesB - salesA;
          }
          // 销量相同则按CTR降序
          return ctrB - ctrA;
        });
        setWorks(sortedData);
      } catch (error) {
        console.error('获取新品爬坡监控数据失败:', error);
        setWorks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const displayWorks = showAll ? works : works.slice(0, 10);
  const hasMore = works.length > 10;

  return (
    <div className='mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden'>
      <div className='px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50'>
        <h3 className='font-bold text-slate-800 flex items-center gap-2'>
          <Rocket size={18} className='text-orange-500' /> 近14天新品爬坡监控
        </h3>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className='text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 transition-colors'
          >
            {showAll ? '收起' : '查看全部'}
          </button>
        )}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100'>
        {isLoading ? (
          <div className='col-span-5 px-6 py-8 text-center text-slate-400'>
            加载中...
          </div>
        ) : works.length === 0 ? (
          <div className='col-span-5 px-6 py-8 text-center text-slate-400'>
            暂无数据
          </div>
        ) : (
          (() => {
            // 计算最大销量用于进度条比例
            const maxSales = Math.max(
              ...displayWorks.map((w: any) => w.metrics?.order_count || 0),
              1
            );

            return displayWorks.map((work: any) => {
              const getStageLabel = () => {
                if (work.stage === 'cold_start') return '冷启动期';
                if (work.stage === 'climbing') return '爬坡期';
                if (work.stage === 'explosive') return '爆发期';
                return '正常期';
              };

              return (
                <div
                  key={work.id}
                  className='p-4 hover:bg-slate-50 transition-colors group relative overflow-hidden flex flex-col h-full bg-white'
                >
                  {/* 封面图 */}
                  {work.cover && (
                    <div className='mb-3 rounded-lg overflow-hidden bg-slate-100 aspect-[4/3] relative'>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cdnApi(work.cover, {
                          resizeWidth: 200,
                          format: 'webp',
                        })}
                        alt={work.title}
                        className='w-full h-full object-cover object-top'
                      />
                      {/* 阶段标签 - 右上角 */}
                      <div className='absolute top-2 right-2'>
                        <span
                          className={`inline-block px-2 py-1 rounded-md text-xs font-medium text-white ${
                            work.stage === 'explosive'
                              ? 'bg-red-500'
                              : work.stage === 'climbing'
                                ? 'bg-orange-500'
                                : work.stage === 'cold_start'
                                  ? 'bg-blue-500'
                                  : 'bg-slate-500'
                          }`}
                        >
                          {getStageLabel()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 标题 */}
                  <div className='mb-2'>
                    <h4 className='text-sm font-bold text-slate-800 line-clamp-1 mb-1'>
                      {work.title || '作品标题'}
                    </h4>
                    <p className='text-xs text-slate-500 flex items-center gap-1 justify-between'>
                      <span className='text-slate-400 flex'>
                        {' '}
                        <User size={10} />
                        {work.designer_name}
                      </span>
                      <span className='text-slate-400'>
                        上线{' '}
                        {(() => {
                          const days =
                            work.daysSinceOnline ?? work.daysSinceCreation ?? 0;
                          const hours =
                            work.hoursSinceOnline ??
                            work.hoursSinceCreation ??
                            0;
                          if (days === 0 && hours === 0) {
                            return '0小时';
                          }
                          if (days === 0) {
                            return `${hours}小时`;
                          }
                          if (hours === 0) {
                            return `${days}天`;
                          }
                          return `${days}天${hours}小时`;
                        })()}
                      </span>
                    </p>
                  </div>

                  {/* 关键指标 - 只显示3个 */}
                  <div className='mt-auto space-y-2 text-xs'>
                    <div className='flex justify-between items-center text-slate-600'>
                      <span>曝光</span>
                      <span className='font-mono font-medium'>
                        {formatNumber(work.metrics.view_pv)}
                      </span>
                    </div>
                    <div className='flex justify-between items-center text-slate-600'>
                      <span>CTR</span>
                      <span className='font-mono font-medium text-green-600'>
                        {work.metrics.ctr.toFixed(1)}%
                      </span>
                    </div>
                    <div className='flex justify-between items-center text-slate-600'>
                      <span>销量</span>
                      <span className='font-mono font-medium'>
                        {formatNumber(work.metrics.order_count)}
                      </span>
                    </div>
                  </div>

                  {/* 底部进度条 */}
                  <div className='mt-3 h-1 bg-slate-200 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-red-500 transition-all'
                      style={{
                        width: `${
                          maxSales > 0
                            ? Math.min(
                                ((work.metrics?.order_count || 0) / maxSales) *
                                  100,
                                100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>
      <div className='px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 space-y-1'>
        <p className='font-bold text-slate-500 mb-1'>指标定义说明：</p>
        <p>
          • <span className='font-medium text-blue-600'>冷启动期</span>: 发布 3
          天内，曝光 &lt; 500，侧重观察点击率。
        </p>
        <p>
          • <span className='font-medium text-blue-600'>爬坡期</span>: 发布 3-7
          天，销量增长率 &gt; 10%，侧重观察转化率。
        </p>
        <p>
          • <span className='font-medium text-red-600'>爆发期</span>: 发布 14
          天内，日均销量 &gt; 50 或 综合评分 &gt; 9.0。
        </p>
      </div>
    </div>
  );
};

export default function CreatorPage() {
  return (
    <div className='animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2'>
        <div>
          <h2 className='text-xl font-bold text-slate-800'>
            内部设计师业绩分析
          </h2>
          <p className='text-sm text-slate-500 mt-1'>
            关注总GMV贡献与近期新品趋势
          </p>
        </div>
      </div>

      {/* Unified Ranking Table */}
      <div className='h-auto'>
        <CreatorLeaderboard />
      </div>

      {/* Bottom: New Works Monitor */}
      <NewWorksMonitor />
    </div>
  );
}
