'use client';

import { cdnApi } from '@/services';
import { getShareUrl } from '@/store';
import { trpc } from '@/utils/trpc';
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { ArrowLeft, DollarSign, FileText, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 20;
const BEHAVIOR_PAGE_SIZE = 100;

// 格式化日期
const formatDate = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    // hour: '2-digit',
    // minute: '2-digit',
    // second: '2-digit',
  });
};

// 格式化行为时间到东8区（包含完整时间）
const formatBehaviorTime = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [works, setWorks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [worksLoading, setWorksLoading] = useState(false);
  const [behaviorPage, setBehaviorPage] = useState(1);
  const [behaviorTotal, setBehaviorTotal] = useState(0);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const [behaviors, setBehaviors] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'works' | 'behavior'>('works');
  const [channelNameMap, setChannelNameMap] = useState<Map<number, string>>(
    new Map()
  );

  // 获取动态路由参数
  useEffect(() => {
    params.then(p => {
      const uid = parseInt(p.id, 10);
      if (!isNaN(uid)) {
        setUserId(uid);
      }
    });
  }, [params]);

  // 加载作品列表
  const loadWorks = async (targetPage?: number) => {
    if (!userId) return;

    const currentPage = targetPage !== undefined ? targetPage : page;
    setWorksLoading(true);

    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const result = await trpc.adminWorks.getWorksByUser.query({
        uid: userId,
        time_period: 'all',
        is_paid: 'all',
        skip,
        take: PAGE_SIZE,
      });

      setWorks(result.works || []);
      setTotal(result.total || 0);
      setUserInfo(result.userInfo || null);

      // 收集所有的频道ID（三级热词ID）
      const channelIds = new Set<number>();
      result.works?.forEach((work: any) => {
        if (work.metadata) {
          try {
            const metadata =
              typeof work.metadata === 'string'
                ? JSON.parse(work.metadata)
                : work.metadata;
            const channelId = metadata?.ref_page_id;
            if (channelId) {
              const id =
                typeof channelId === 'string'
                  ? parseInt(channelId, 10)
                  : channelId;
              if (!isNaN(id)) {
                channelIds.add(id);
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      });

      // 批量获取热词信息
      if (channelIds.size > 0) {
        try {
          const hotWords = await trpc.channel.getHotWordsByIds.query({
            ids: Array.from(channelIds),
          });
          const nameMap = new Map<number, string>();
          hotWords.forEach((hotWord: any) => {
            nameMap.set(
              hotWord.id,
              hotWord.display_name || hotWord.alias || ''
            );
          });
          setChannelNameMap(nameMap);
        } catch (error) {
          console.error('加载频道名称失败:', error);
        }
      } else {
        setChannelNameMap(new Map());
      }
    } catch (error) {
      console.error('加载作品列表失败:', error);
      setWorks([]);
      setTotal(0);
    } finally {
      setWorksLoading(false);
      setLoading(false);
    }
  };

  // 当userId变化时重新加载
  useEffect(() => {
    if (userId) {
      setPage(1);
      loadWorks(1);
      setBehaviorPage(1);
      setBehaviors([]);
      setBehaviorTotal(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 页码变化时重新加载
  useEffect(() => {
    if (userId && !loading) {
      loadWorks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 加载用户行为列表
  const loadBehaviors = async (targetPage?: number) => {
    if (!userId) return;

    const currentPage = targetPage !== undefined ? targetPage : behaviorPage;
    setBehaviorLoading(true);

    try {
      const skip = (currentPage - 1) * BEHAVIOR_PAGE_SIZE;
      const result = await trpc.userBehavior.getUserBehaviorByUid.query({
        uid: userId,
        skip,
        take: BEHAVIOR_PAGE_SIZE,
      });

      setBehaviors(result.items || []);
      setBehaviorTotal(result.total || 0);
    } catch (error) {
      console.error('加载用户行为失败:', error);
      setBehaviors([]);
      setBehaviorTotal(0);
    } finally {
      setBehaviorLoading(false);
    }
  };

  // 切换到行为 Tab 时加载行为数据
  useEffect(() => {
    if (activeTab === 'behavior' && userId) {
      loadBehaviors(behaviorPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId, behaviorPage]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const behaviorTotalPages = Math.ceil(behaviorTotal / BEHAVIOR_PAGE_SIZE);

  return (
    <div className='min-h-screen bg-slate-50 font-sans text-slate-800 pb-12'>
      {/* 头部导航 */}
      <header className='bg-white border-b border-slate-200  z-20 px-6 py-3 flex items-center justify-between shadow-sm'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => router.back()}
            className='p-1.5 hover:bg-slate-100 rounded-lg transition-colors'
          >
            <ArrowLeft size={20} className='text-slate-600' />
          </button>
          <div className='flex items-center gap-2'>
            <div className='bg-purple-600 text-white p-1.5 rounded-lg shadow-sm shadow-purple-200'>
              <User size={20} />
            </div>
            <h1 className='text-lg font-bold text-slate-800 tracking-tight'>
              用户详情
            </h1>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 py-8'>
        {/* 用户信息卡片 */}
        {loading && !userId ? (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6'>
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span className='ml-2'>加载中...</span>
            </div>
          </div>
        ) : userId ? (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6'>
            <div className='flex items-start gap-4'>
              <div className='w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0'>
                <User size={32} className='text-purple-600' />
              </div>
              <div className='flex-1'>
                <h2 className='text-xl font-bold text-slate-800 mb-2'>
                  用户 ID: {userId}
                </h2>
                <div className='flex flex-col gap-1 text-sm text-slate-600'>
                  <div className='flex flex-wrap gap-4'>
                    <span>用户ID: {userId}</span>
                    {userInfo?.appid && <span>应用: {userInfo.appid}</span>}
                  </div>
                  {userInfo && (
                    <div className='flex flex-wrap gap-4'>
                      <span>
                        注册日期:{' '}
                        {userInfo.register_date
                          ? formatDate(userInfo.register_date)
                          : '-'}
                      </span>
                      <span>注册设备: {userInfo.register_device || '-'}</span>
                      <span>注册来源: {userInfo.register_source || '-'}</span>
                      <span>广告计划ID: {userInfo.ad_plan_id || '-'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 列表类型切换 Tabs */}
        <div className='bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 mb-4'>
          <Tabs
            value={activeTab}
            onValueChange={value => setActiveTab(value as 'works' | 'behavior')}
          >
            <TabsList className='bg-transparent h-auto p-0 gap-4'>
              <TabsTrigger
                value='works'
                className='px-2 py-1.5 text-sm text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600'
              >
                用户作品
              </TabsTrigger>
              <TabsTrigger
                value='behavior'
                className='px-2 py-1.5 text-sm text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600'
              >
                用户行为
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === 'works' && (
          <>
            {/* 作品统计 */}
            <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6'>
              <div className='text-sm text-slate-500'>共 {total} 件作品</div>
            </div>

            {/* 作品列表表格 */}
            <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden'>
              <div className='px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50'>
                <h3 className='font-bold text-slate-800 flex items-center gap-2'>
                  <FileText size={18} className='text-purple-600' /> 作品列表
                </h3>
              </div>

              {worksLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>加载中...</span>
                </div>
              ) : works.length === 0 ? (
                <div className='text-center py-12 text-slate-500'>
                  暂无作品数据
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-left text-sm'>
                    <thead>
                      <tr className='bg-slate-50 text-slate-500 border-b border-slate-200'>
                        <th className='px-6 py-3 font-medium'>封面</th>
                        <th className='px-4 py-3 font-medium'>作品ID</th>
                        <th className='px-4 py-3 font-medium'>标题</th>
                        <th className='px-4 py-3 font-medium'>创建时间</th>
                        <th className='px-4 py-3 font-medium'>更新时间</th>
                        <th className='px-4 py-3 font-medium'>版本</th>
                        <th className='px-4 py-3 font-medium'>是否付费</th>
                        <th className='px-4 py-3 font-medium'>付费时间</th>
                        <th className='px-4 py-3 font-medium'>频道名称</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {works.map(work => {
                        // 解析metadata，提取频道ID和其他信息
                        let channelId: string | number | null = null;
                        let channelName: string | null = null;
                        if (work.metadata) {
                          try {
                            const metadata =
                              typeof work.metadata === 'string'
                                ? JSON.parse(work.metadata)
                                : work.metadata;
                            console.log('metadata', metadata);
                            channelId = metadata?.ref_page_id || null;
                            if (channelId) {
                              const id =
                                typeof channelId === 'string'
                                  ? parseInt(channelId, 10)
                                  : channelId;
                              if (!isNaN(id)) {
                                channelName = channelNameMap.get(id) || null;
                              }
                            }
                          } catch (e) {
                            console.error('解析metadata失败:', e);
                          }
                        }

                        return (
                          <tr
                            key={work.id}
                            className='hover:bg-slate-50 transition-colors cursor-pointer'
                            onClick={() => {
                              window.open(getShareUrl(work.id), '_blank');
                            }}
                          >
                            <td className='px-6 py-4'>
                              {work.cover ? (
                                <img
                                  src={cdnApi(work.cover)}
                                  alt={work.title || '作品封面'}
                                  className='w-16 h-16 object-cover rounded border border-slate-200'
                                />
                              ) : (
                                <span className='text-slate-400 text-xs'>
                                  -
                                </span>
                              )}
                            </td>
                            <td className='px-4 py-4 font-mono text-xs text-slate-600'>
                              {work.id.slice(0, 12)}...
                            </td>
                            <td className='px-4 py-4 text-slate-800 max-w-xs truncate'>
                              {work.title || '-'}
                            </td>
                            <td className='px-4 py-4 text-slate-600 text-xs'>
                              {work.create_time
                                ? formatDate(work.create_time)
                                : '-'}
                            </td>
                            <td className='px-4 py-4 text-slate-600 text-xs'>
                              {work.update_time
                                ? formatDate(work.update_time)
                                : '-'}
                            </td>
                            <td className='px-4 py-4 text-slate-600 text-xs font-mono'>
                              {work.version ?? '-'}
                            </td>
                            <td className='px-4 py-4'>
                              {work.is_paid ? (
                                <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700'>
                                  <DollarSign size={12} className='mr-1' />
                                  已付费
                                </span>
                              ) : (
                                <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600'>
                                  未付费
                                </span>
                              )}
                            </td>
                            <td className='px-4 py-4 text-slate-600 text-xs'>
                              {work.is_paid && work.order_time
                                ? formatDate(work.order_time)
                                : '-'}
                            </td>
                            <td className='px-4 py-4 text-slate-600 text-xs'>
                              {channelName || channelId || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className='px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50'>
                  <div className='text-sm text-slate-500'>
                    第 {page} / {totalPages} 页
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className='px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className='px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'behavior' && (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-bold text-slate-800 flex items-center gap-2'>
                <FileText size={18} className='text-purple-600' /> 用户行为列表
              </h3>
              <div className='text-xs text-slate-500'>
                每页展示 {BEHAVIOR_PAGE_SIZE} 条，按时间由近到远排序
              </div>
            </div>

            {behaviorLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='h-6 w-6 animate-spin' />
                <span className='ml-2'>行为数据加载中...</span>
              </div>
            ) : behaviors.length === 0 ? (
              <div className='text-center py-12 text-slate-500'>
                暂无行为数据
              </div>
            ) : (
              <>
                <div className='overflow-x-auto'>
                  <table className='w-full text-left text-sm'>
                    <thead>
                      <tr className='bg-slate-50 text-slate-500 border-b border-slate-200'>
                        <th className='px-4 py-3 font-medium'>时间</th>
                        <th className='px-4 py-3 font-medium'>行为类型</th>
                        <th className='px-4 py-3 font-medium'>详情</th>
                        <th className='px-4 py-3 font-medium'>页面类型</th>
                        <th className='px-4 py-3 font-medium'>页面/对象ID</th>
                        <th className='px-4 py-3 font-medium'>URL</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {behaviors.map(item => (
                        <tr
                          key={`${item.eventType}-${item.eventTime}-${item.url || item.pageId || item.objectId}`}
                        >
                          <td className='px-4 py-3 text-xs text-slate-600 whitespace-nowrap'>
                            {item.eventTime
                              ? formatBehaviorTime(item.eventTime)
                              : '-'}
                          </td>
                          <td className='px-4 py-3 text-slate-800 whitespace-nowrap'>
                            {item.behaviorLabel}
                          </td>
                          <td className='px-4 py-3 text-slate-600 max-w-md'>
                            <div className='text-xs break-all'>
                              {item.description}
                            </div>
                          </td>
                          <td className='px-4 py-3 text-xs text-slate-600 whitespace-nowrap'>
                            {item.pageType || '-'}
                          </td>
                          <td className='px-4 py-3 text-xs text-slate-600'>
                            <div className='flex flex-col gap-1'>
                              {item.pageId && (
                                <span>page_id: {item.pageId}</span>
                              )}
                              {item.refPageId && (
                                <span>ref_page_id: {item.refPageId}</span>
                              )}
                              {item.parentId && (
                                <span>parent_id: {item.parentId}</span>
                              )}
                              {item.objectId && (
                                <span>object_id: {item.objectId}</span>
                              )}
                            </div>
                          </td>
                          <td className='px-4 py-3 text-xs text-slate-600 max-w-md'>
                            {item.url ? (
                              <a
                                href={item.url}
                                target='_blank'
                                rel='noreferrer'
                                className='text-purple-600 hover:underline break-all'
                              >
                                {item.url}
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {behaviorTotalPages > 1 && (
                  <div className='mt-4 pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-xl -mx-6 px-6'>
                    <div className='text-sm text-slate-500'>
                      共 {behaviorTotal} 条行为记录，第 {behaviorPage} /{' '}
                      {behaviorTotalPages} 页
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => setBehaviorPage(p => Math.max(1, p - 1))}
                        disabled={behaviorPage === 1 || behaviorLoading}
                        className='px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                      >
                        上一页
                      </button>
                      <button
                        onClick={() =>
                          setBehaviorPage(p =>
                            Math.min(behaviorTotalPages, p + 1)
                          )
                        }
                        disabled={
                          behaviorPage === behaviorTotalPages || behaviorLoading
                        }
                        className='px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
