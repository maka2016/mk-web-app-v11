'use client';

import { trpc } from '@/utils/trpc';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { BarChart3, Eye, FileText, MapPin, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FormSubmissionsList } from '../RSVP/FormSubmissionsList';
import { StatCard } from './StatCard';

interface DataViewProps {
  worksId: string;
}

interface StatisticsData {
  cumulative: {
    pv: number;
    uv: number;
    update_time: string | null;
  };
  today: {
    pv: number;
    uv: number;
  };
  daily: Array<{
    date: string;
    pv: number;
    uv: number;
  }>;
  provinces: Array<{
    name: string;
    pv: number;
    uv: number;
  }>;
}

export function DataView({ worksId }: DataViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formSubmissionsCount, setFormSubmissionsCount] = useState(0);

  // 从 URL 读取 tab 参数，如果没有则使用默认值 'spread'
  const tabFromUrl = searchParams.get('tab');
  const validTabs = ['spread', 'form'];
  const initialTab =
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'spread';
  const [activeTab, setActiveTab] = useState(initialTab);

  // 当 URL 中的 tab 参数变化时（比如浏览器前进/后退），同步更新 activeTab
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const validTabsList = ['spread', 'form'];
    if (urlTab && validTabsList.includes(urlTab)) {
      setActiveTab(prevTab => {
        // 只有当 URL 中的 tab 与当前 tab 不同时才更新
        return urlTab !== prevTab ? urlTab : prevTab;
      });
    }
  }, [searchParams]);

  // 当 activeTab 变化时，同步更新 URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', value);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!worksId) return;
      setIsLoading(true);
      try {
        const result = await trpc.works.getWorksStatistics.query({
          worksId,
          days,
        }) as any;
        setData(result as StatisticsData);
      } catch (error) {
        console.error('获取统计数据失败:', error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [worksId, days]);

  // 获取表单收集数
  useEffect(() => {
    const fetchFormSubmissionsCount = async () => {
      if (!worksId) {
        setFormSubmissionsCount(0);
        return;
      }

      try {
        const result = await trpc.rsvp.getSubmissionsByWorksId.query({
          works_id: worksId,
          skip: 0,
          take: 1, // 只需要总数，不需要实际数据
        });
        setFormSubmissionsCount(result?.total || 0);
      } catch (error) {
        console.error('获取表单收集数失败:', error);
        setFormSubmissionsCount(0);
      }
    };

    fetchFormSubmissionsCount();
  }, [worksId]);

  // 格式化更新时间
  const formatUpdateTime = (updateTime: string | null) => {
    if (!updateTime) return '暂无数据';
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
      return `截止更新至${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${hours}:${minutes}`;
    } else if (timeDate.getTime() === yesterday.getTime()) {
      return `截止更新至${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${hours}:${minutes}`;
    } else {
      const month = (time.getMonth() + 1).toString().padStart(2, '0');
      const day = time.getDate().toString().padStart(2, '0');
      return `截止更新至${time.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  // 格式化日期显示（MM-DD）
  // 后端返回的日期字符串已经是东八区日期（YYYY-MM-DD格式），直接解析即可
  const formatDate = (dateStr: string) => {
    // 直接解析日期字符串，避免时区问题
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 计算统计数据截止时间（昨日24:00）
  const getStatsCutoffTime = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `统计数据截止为${year}-${month}-${day} 24:00`;
  };

  return (
    <div className='bg-slate-50 min-h-screen'>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className='sticky top-0 z-10 bg-white border-b border-slate-200'>
          <TabsList className='w-full grid grid-cols-2 h-auto bg-transparent p-0'>
            <TabsTrigger
              value='spread'
              className='flex-1 py-3 text-center transition-none data-[state=active]:text-base data-[state=active]:font-semibold data-[state=active]:text-slate-800 data-[state=inactive]:text-sm data-[state=inactive]:font-normal data-[state=inactive]:text-slate-500'
            >
              传播数据
            </TabsTrigger>
            <TabsTrigger
              value='form'
              className='flex-1 py-3 text-center transition-none data-[state=active]:text-base data-[state=active]:font-semibold data-[state=active]:text-slate-800 data-[state=inactive]:text-sm data-[state=inactive]:font-normal data-[state=inactive]:text-slate-500'
            >
              表单收集数
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 传播数据 Tab */}
        <TabsContent value='spread' className='mt-0 transition-none'>
          <div className='space-y-4 p-4'>
            {/* 头部信息 */}
            <div className='mb-2'>
              <p className='text-xs text-slate-500 text-center'>
                {data?.cumulative?.update_time
                  ? formatUpdateTime(data.cumulative.update_time)
                  : '暂无数据'}
              </p>
            </div>

            {/* 数据概况 */}
            <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-4'>
              <div className='mb-2'>
                <h2 className='text-base font-semibold text-slate-800'>
                  数据概况
                </h2>
              </div>
              <div className='grid grid-cols-3 gap-2'>
                {/* 累计访问量 */}
                <StatCard
                  label='浏览量'
                  value={data?.cumulative?.pv || 0}
                  description={
                    isLoading
                      ? undefined
                      : `今日新增${formatNumber(data?.today?.pv || 0)}`
                  }
                  icon={Eye}
                  iconBgColor='bg-blue-50'
                  iconColor='text-blue-500'
                  isLoading={isLoading}
                  formatValue={formatNumber}
                />

                {/* 累计访客 */}
                <StatCard
                  label='访问人数'
                  value={data?.cumulative?.uv || 0}
                  description={
                    isLoading
                      ? undefined
                      : `今日新增${formatNumber(data?.today?.uv || 0)}`
                  }
                  icon={Users}
                  iconBgColor='bg-green-50'
                  iconColor='text-green-500'
                  isLoading={isLoading}
                  formatValue={formatNumber}
                />

                {/* 表单收集数 */}
                <StatCard
                  label='表单收集数'
                  value={formSubmissionsCount}
                  description='点击查看详情'
                  icon={FileText}
                  iconBgColor='bg-purple-50'
                  iconColor='text-purple-500'
                  isLoading={isLoading}
                  onClick={() => setActiveTab('form')}
                  formatValue={formatNumber}
                />
              </div>
            </div>

            {/* 传播数据 */}
            <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-4'>
              <div className='mb-3'>
                <h2 className='text-base font-semibold text-slate-800'>
                  传播数据
                </h2>
              </div>
              <div className='h-32'>
                {isLoading ? (
                  <div className='h-full flex items-center justify-center text-slate-400'>
                    加载中...
                  </div>
                ) : data?.daily && data.daily.length > 0 ? (
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={data.daily}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
                      <XAxis
                        dataKey='date'
                        tickFormatter={formatDate}
                        stroke='#64748b'
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis stroke='#64748b' style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                        labelFormatter={label => `日期: ${formatDate(label)}`}
                        formatter={(value: number | undefined) => formatNumber(value || 0)}
                      />
                      <Legend />
                      <Line
                        type='monotone'
                        dataKey='pv'
                        stroke='#3b82f6'
                        strokeWidth={2}
                        name='浏览量(PV)'
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                      <Line
                        type='monotone'
                        dataKey='uv'
                        stroke='#10b981'
                        strokeWidth={2}
                        name='访问人数(UV)'
                        dot={{ fill: '#10b981', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className='h-full flex items-center justify-center text-slate-400'>
                    暂无数据
                  </div>
                )}
              </div>
            </div>

            {/* 地区分布 */}
            <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-4'>
              <div className='mb-3'>
                <h2 className='text-base font-semibold text-slate-800'>
                  地区分布
                </h2>
              </div>
              {isLoading ? (
                <div className='h-24 flex items-center justify-center text-slate-400'>
                  加载中...
                </div>
              ) : data?.provinces && data.provinces.length > 0 ? (
                <div className='space-y-2'>
                  {data.provinces.map(
                    (
                      province: { name: string; pv: number; uv: number },
                      index: number
                    ) => (
                      <div
                        key={province.name}
                        className='flex items-center justify-between p-2 rounded-lg border border-slate-100 active:bg-slate-50 transition-colors'
                      >
                        <div className='flex items-center gap-2 flex-1 min-w-0'>
                          <div className='flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs'>
                            {index + 1}
                          </div>
                          <div className='flex items-center gap-1 flex-1 min-w-0'>
                            <MapPin
                              size={14}
                              className='text-slate-400 flex-shrink-0'
                            />
                            <span className='text-sm text-slate-700 font-medium truncate'>
                              {province.name}
                            </span>
                          </div>
                        </div>
                        <div className='flex items-center gap-3 flex-shrink-0 ml-2'>
                          <div className='text-right'>
                            <p className='text-xs text-slate-500'>浏览量</p>
                            <p className='text-xs font-semibold text-slate-800'>
                              {formatNumber(province.pv)}
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='text-xs text-slate-500'>访问人数</p>
                            <p className='text-xs font-semibold text-slate-800'>
                              {formatNumber(province.uv)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className='h-24 flex flex-col items-center justify-center text-slate-400'>
                  <div className='relative mb-4'>
                    <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center'>
                      <BarChart3 size={32} className='text-slate-300' />
                    </div>
                    <div className='absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center'>
                      <span className='text-blue-500 text-xs'>!</span>
                    </div>
                  </div>
                  <p className='text-sm'>
                    暂时还没有地区分布数据,快去分享作品吧~
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 表单收集数 Tab */}
        <TabsContent
          value='form'
          className='mt-0 min-h-[calc(100vh-49px)] transition-none'
        >
          <FormSubmissionsList worksId={worksId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
