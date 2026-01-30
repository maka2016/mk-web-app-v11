'use client';

import { cdnApi } from '@/services';
import { getShareUrl } from '@/store';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Loader2,
  MousePointerClick,
  PenTool,
  ShoppingCart,
  TrendingUp,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

// 时间筛选选项
const timePeriods = [
  { id: 'today', label: '今天' },
  { id: 'yesterday', label: '昨天' },
  { id: 'near7', label: '近7天' },
  { id: 'history', label: '历史' },
];

// 支付状态选项
const paymentStatusOptions = [
  { id: 'all', label: '全部' },
  { id: 'paid', label: '已付费' },
  { id: 'unpaid', label: '未付费' },
];

// 格式化日期
const formatDate = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 格式化数字
const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString('zh-CN');
};

// 格式化金额
const formatAmount = (amount: number) => {
  if (amount >= 10000) {
    return '¥' + (amount / 10000).toFixed(2) + '万';
  }
  return '¥' + amount.toFixed(2);
};

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [template, setTemplate] = useState<any | null>(null);
  const [timePeriod, setTimePeriod] = useState<
    'today' | 'yesterday' | 'near7' | 'history'
  >('near7');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid'>(
    'all'
  );
  const [paymentTimePeriod, setPaymentTimePeriod] = useState<
    'all' | 'today' | 'yesterday' | 'near7' | 'history'
  >('all');
  const [page, setPage] = useState(1);
  const [works, setWorks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [worksLoading, setWorksLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [designerInfo, setDesignerInfo] = useState<any>(null);
  const [designerLoading, setDesignerLoading] = useState(false);
  const [mountedChannels, setMountedChannels] = useState<any[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    designer_uid: '',
    appids: [] as string[],
    channelIds: [] as number[],
  });
  const [appidInput, setAppidInput] = useState('');
  const [statisticsAppid, setStatisticsAppid] = useState<string>('all');
  const [statisticsSceneType, setStatisticsSceneType] = useState<string>('all');
  const [allChannels, setAllChannels] = useState<any[]>([]);
  const [channelsLoadingForEdit, setChannelsLoadingForEdit] = useState(false);

  // 获取动态路由参数
  useEffect(() => {
    params.then(p => {
      setTemplateId(p.id);
    });
  }, [params]);

  // 加载模板详情
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) return;

      try {
        const templateData = await trpc.template.findById.query({
          id: templateId,
        });
        setTemplate(templateData);
      } catch (error) {
        console.error('加载模板详情失败:', error);
      }
    };

    loadTemplate();
  }, [templateId]);

  // 加载统计数据
  useEffect(() => {
    const loadStatistics = async () => {
      if (!templateId) return;

      setStatisticsLoading(true);
      try {
        const stats = await trpc.template.getTemplateStatistics.query({
          id: templateId,
          appid: statisticsAppid !== 'all' ? statisticsAppid : undefined,
          scene_type:
            statisticsSceneType !== 'all' ? statisticsSceneType : undefined,
        });
        setStatistics(stats);
      } catch (error) {
        console.error('加载统计数据失败:', error);
      } finally {
        setStatisticsLoading(false);
      }
    };

    loadStatistics();
  }, [templateId, statisticsAppid, statisticsSceneType]);

  // 加载设计师信息
  useEffect(() => {
    const loadDesignerInfo = async () => {
      if (!template?.designer_uid) return;

      setDesignerLoading(true);
      try {
        const info = await trpc.designer.findByUid.query({
          uid: template.designer_uid,
        });
        setDesignerInfo(info);
      } catch (error) {
        console.error('加载设计师信息失败:', error);
      } finally {
        setDesignerLoading(false);
      }
    };

    loadDesignerInfo();
  }, [template?.designer_uid]);

  // 加载挂载的频道信息
  useEffect(() => {
    const loadMountedChannels = async () => {
      if (!templateId) return;

      setChannelsLoading(true);
      try {
        const channels = await trpc.template.getMountedChannels.query({
          id: templateId,
        });
        setMountedChannels(channels || []);
      } catch (error) {
        console.error('加载挂载频道失败:', error);
        setMountedChannels([]);
      } finally {
        setChannelsLoading(false);
      }
    };

    loadMountedChannels();
  }, [templateId]);

  // 加载所有四级频道
  const loadAllChannels = async () => {
    setChannelsLoadingForEdit(true);
    try {
      const channels = await trpc.adminChannel.list.query({
        class: 'level_4',
        include_children: false,
      });
      // 确保频道包含父级信息
      const channelsWithParent = await Promise.all(
        (channels || []).map(async (channel: any) => {
          if (!channel.parent && channel.parent_id) {
            // 如果频道没有加载父级信息，需要单独加载
            try {
              const parentChannel = await trpc.adminChannel.findById.query({
                id: channel.parent_id,
                include_children: false,
              });
              return {
                ...channel,
                parent: parentChannel,
              };
            } catch {
              return channel;
            }
          }
          return channel;
        })
      );
      setAllChannels(channelsWithParent);
    } catch (error) {
      console.error('加载频道列表失败:', error);
      setAllChannels([]);
    } finally {
      setChannelsLoadingForEdit(false);
    }
  };

  // 打开编辑弹窗
  const handleOpenEditDialog = async () => {
    if (!template) return;

    // 加载所有四级频道
    await loadAllChannels();

    // 获取当前挂载的频道ID列表
    const currentChannelIds = mountedChannels.map(ch => ch.level4Id);

    setEditFormData({
      designer_uid: template.designer_uid?.toString() || '',
      appids: template.appids || [],
      channelIds: currentChannelIds,
    });
    setAppidInput('');
    setEditDialogOpen(true);
  };

  // 添加 appid
  const handleAddAppid = () => {
    if (!appidInput.trim()) return;
    if (editFormData.appids.includes(appidInput.trim())) {
      toast.error('该 appid 已存在');
      return;
    }
    setEditFormData({
      ...editFormData,
      appids: [...editFormData.appids, appidInput.trim()],
    });
    setAppidInput('');
  };

  // 删除 appid
  const handleRemoveAppid = (appid: string) => {
    setEditFormData({
      ...editFormData,
      appids: editFormData.appids.filter(a => a !== appid),
    });
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!templateId) return;

    try {
      // 更新模板基本信息
      await trpc.template.update.mutate({
        id: templateId,
        designer_uid: editFormData.designer_uid
          ? Number(editFormData.designer_uid)
          : null,
        appids: editFormData.appids,
      });

      // 更新频道挂载关系
      // 获取所有四级频道
      const allLevel4Channels = await trpc.adminChannel.list.query({
        class: 'level_4',
        include_children: false,
      });

      // 更新每个频道的模板列表
      for (const channel of allLevel4Channels) {
        const currentTemplateIds = channel.template_ids || [];
        const currentlyHasTemplate = currentTemplateIds.includes(templateId);
        const shouldHaveTemplate = editFormData.channelIds.includes(channel.id);

        // 只有当状态发生变化时才更新
        if (currentlyHasTemplate !== shouldHaveTemplate) {
          let newTemplateIds: string[];

          if (shouldHaveTemplate) {
            // 需要添加模板
            newTemplateIds = [...new Set([...currentTemplateIds, templateId])];
          } else {
            // 需要移除模板
            newTemplateIds = currentTemplateIds.filter(
              (id: string) => id !== templateId
            );
          }

          await trpc.adminChannel.updateTemplateIds.mutate({
            id: channel.id,
            template_ids: newTemplateIds,
          });
        }
      }

      toast.success('更新成功');
      setEditDialogOpen(false);

      // 重新加载模板数据
      const templateData = await trpc.template.findById.query({
        id: templateId,
      });
      setTemplate(templateData);

      // 重新加载挂载的频道信息
      const channels = await trpc.template.getMountedChannels.query({
        id: templateId,
      });
      setMountedChannels(channels || []);
    } catch (error: any) {
      console.error('更新失败:', error);
      toast.error(error.message || '更新失败');
    }
  };

  // 加载作品列表
  const loadWorks = async (targetPage?: number) => {
    if (!templateId) return;

    const currentPage = targetPage !== undefined ? targetPage : page;
    setWorksLoading(true);

    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const result = await trpc.adminWorks.getWorksByTemplate.query({
        template_id: templateId,
        time_period: timePeriod,
        is_paid: paymentStatus,
        payment_time_period: paymentTimePeriod,
        skip,
        take: PAGE_SIZE,
      });

      setWorks(result.works || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('加载作品列表失败:', error);
      setWorks([]);
      setTotal(0);
    } finally {
      setWorksLoading(false);
      setLoading(false);
    }
  };

  // 当筛选条件或页码变化时重新加载
  useEffect(() => {
    if (templateId) {
      setPage(1);
      loadWorks(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, timePeriod, paymentStatus, paymentTimePeriod]);

  // 页码变化时重新加载
  useEffect(() => {
    if (templateId && !loading) {
      loadWorks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            <div className='bg-blue-600 text-white p-1.5 rounded-lg shadow-sm shadow-blue-200'>
              <FileText size={20} />
            </div>
            <h1 className='text-lg font-bold text-slate-800 tracking-tight'>
              模板详情
            </h1>
          </div>
        </div>
        {template && (
          <div className='flex items-center gap-2'>
            <button
              onClick={() => {
                const url = `/mobile/template?id=${template.id}&appid=jiantie&template_name=${encodeURIComponent(template.title || '')}`;
                window.open(url, '_blank');
              }}
              className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium'
            >
              <Eye size={16} />
              预览
            </button>
            <button
              onClick={handleOpenEditDialog}
              className='flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium'
            >
              <Edit size={16} />
              编辑模板信息
            </button>
          </div>
        )}
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 py-8'>
        {/* 模板信息卡片 */}
        {loading && !template ? (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6'>
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span className='ml-2'>加载中...</span>
            </div>
          </div>
        ) : template ? (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6'>
            <div className='flex items-start gap-4 mb-4'>
              {(template.coverV3 as { url: string; width: number; height: number } | null)?.url && (
                <img
                  src={cdnApi((template.coverV3 as { url: string; width: number; height: number }).url)}
                  alt={template.title}
                  className='w-32 h-32 object-cover rounded-lg border border-slate-200'
                />
              )}
              <div className='flex-1'>
                <h2 className='text-xl font-bold text-slate-800 mb-2'>
                  {template.title}
                </h2>
                {template.desc && (
                  <p className='text-sm text-slate-600 mb-3'>{template.desc}</p>
                )}
                <div className='flex items-center gap-4 text-sm text-slate-500'>
                  <span>模板ID: {template.id}</span>
                  {template.create_time && (
                    <span className='flex items-center gap-1'>
                      <Clock size={14} />
                      创建时间: {formatDate(template.create_time)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 统计信息筛选器 */}
            <div className='border-t border-slate-200 pt-4 mb-4'>
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <Label className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                    AppID:
                  </Label>
                  <Select
                    value={statisticsAppid}
                    onValueChange={setStatisticsAppid}
                  >
                    <SelectTrigger className='h-9 w-[150px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部</SelectItem>
                      {template?.appids &&
                        template.appids.map((appid: string) => (
                          <SelectItem key={appid} value={appid}>
                            {appid}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex items-center gap-2'>
                  <Label className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                    场类型:
                  </Label>
                  <Select
                    value={statisticsSceneType}
                    onValueChange={setStatisticsSceneType}
                  >
                    <SelectTrigger className='h-9 w-[150px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部</SelectItem>
                      <SelectItem value='channel'>频道</SelectItem>
                      <SelectItem value='search'>搜索</SelectItem>
                      <SelectItem value='other'>其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 基础信息 */}
            {(statistics || designerInfo || template?.tags) && (
              <div className='border-t border-slate-200 pt-4'>
                <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3'>
                  {/* 设计师信息 */}
                  {template?.designer_uid && (
                    <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                      <div className='text-xs font-medium text-slate-600 mb-1.5'>
                        设计师
                      </div>
                      {designerLoading ? (
                        <div className='flex items-center gap-1 text-slate-500'>
                          <Loader2 size={12} className='animate-spin' />
                          <span className='text-xs'>加载中</span>
                        </div>
                      ) : designerInfo ? (
                        <div className='space-y-0.5'>
                          <div className='text-sm font-semibold text-slate-800 truncate'>
                            {designerInfo.name || '-'}
                          </div>
                          <div className='text-xs text-slate-500'>
                            {template.designer_uid}
                          </div>
                        </div>
                      ) : (
                        <div className='text-xs text-slate-500'>
                          {template.designer_uid}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 历史销量 */}
                  <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
                      <ShoppingCart size={12} />
                      历史销量
                    </div>
                    {statisticsLoading ? (
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Loader2 size={12} className='animate-spin' />
                        <span className='text-xs'>加载中</span>
                      </div>
                    ) : (
                      <div className='text-lg font-bold text-slate-800'>
                        {formatNumber(statistics?.total_sales || 0)}
                      </div>
                    )}
                  </div>

                  {/* 历史GMV */}
                  <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
                      <DollarSign size={12} />
                      历史GMV
                    </div>
                    {statisticsLoading ? (
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Loader2 size={12} className='animate-spin' />
                        <span className='text-xs'>加载中</span>
                      </div>
                    ) : (
                      <div className='text-lg font-bold text-slate-800'>
                        {formatAmount(statistics?.total_gmv || 0)}
                      </div>
                    )}
                  </div>

                  {/* 近30天销量 */}
                  <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
                      <TrendingUp size={12} />
                      近30天销量
                    </div>
                    {statisticsLoading ? (
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Loader2 size={12} className='animate-spin' />
                        <span className='text-xs'>加载中</span>
                      </div>
                    ) : (
                      <div className='text-lg font-bold text-blue-600'>
                        {formatNumber(statistics?.sales_30d || 0)}
                      </div>
                    )}
                  </div>

                  {/* 近30天GMV */}
                  <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
                      <DollarSign size={12} />
                      近30天GMV
                    </div>
                    {statisticsLoading ? (
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Loader2 size={12} className='animate-spin' />
                        <span className='text-xs'>加载中</span>
                      </div>
                    ) : (
                      <div className='text-lg font-bold text-blue-600'>
                        {formatAmount(statistics?.gmv_30d || 0)}
                      </div>
                    )}
                  </div>

                  {/* 近30天创作 */}
                  <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
                      <PenTool size={12} />
                      近30天创作
                    </div>
                    {statisticsLoading ? (
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Loader2 size={12} className='animate-spin' />
                        <span className='text-xs'>加载中</span>
                      </div>
                    ) : (
                      <div className='text-lg font-bold text-blue-600'>
                        {formatNumber(statistics?.creations_30d || 0)}
                      </div>
                    )}
                  </div>

                  {/* 历史点击 */}
                  <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
                      <MousePointerClick size={12} />
                      历史点击
                    </div>
                    {statisticsLoading ? (
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Loader2 size={12} className='animate-spin' />
                        <span className='text-xs'>加载中</span>
                      </div>
                    ) : (
                      <div className='text-lg font-bold text-slate-800'>
                        {formatNumber(statistics?.total_clicks || 0)}
                      </div>
                    )}
                  </div>

                  {/* 历史创作 */}
                  <div className='bg-slate-50 rounded-lg p-3 border border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1'>
                      <PenTool size={12} />
                      历史创作
                    </div>
                    {statisticsLoading ? (
                      <div className='flex items-center gap-1 text-slate-500'>
                        <Loader2 size={12} className='animate-spin' />
                        <span className='text-xs'>加载中</span>
                      </div>
                    ) : (
                      <div className='text-lg font-bold text-slate-800'>
                        {formatNumber(statistics?.total_creations || 0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 模板标签 */}
                {template?.tags && template.tags.length > 0 && (
                  <div className='mt-4 pt-4 border-t border-slate-200'>
                    <div className='text-xs font-medium text-slate-600 mb-2'>
                      模板标签
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {template.tags.map((tag: any) => (
                        <span
                          key={tag.id}
                          className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200'
                        >
                          {tag.name}
                          {tag.type && (
                            <span className='text-blue-500'>({tag.type})</span>
                          )}
                          <button
                            type='button'
                            onClick={async () => {
                              if (
                                !confirm(`确定要删除标签 "${tag.name}" 吗？`)
                              ) {
                                return;
                              }
                              try {
                                // 删除标签关系
                                await trpc.template.removeTag.mutate({
                                  templateId: templateId!,
                                  tagId: tag.id,
                                });

                                toast.success('删除标签成功');

                                // 重新加载模板数据
                                const templateData =
                                  await trpc.template.findById.query({
                                    id: templateId!,
                                  });
                                setTemplate(templateData);
                              } catch (error: any) {
                                console.error('删除标签失败:', error);
                                toast.error(error.message || '删除标签失败');
                              }
                            }}
                            className='ml-1 hover:text-blue-900 hover:bg-blue-200 rounded-full p-0.5 transition-colors'
                            title='删除标签'
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AppIDs */}
                <div className='mt-4 pt-4 border-t border-slate-200'>
                  <div className='text-xs font-medium text-slate-600 mb-2'>
                    AppIDs
                  </div>
                  {template.appids && template.appids.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {template.appids.map((appid: string, index: number) => (
                        <span
                          key={index}
                          className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200'
                        >
                          {appid}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className='text-sm text-slate-400'>暂无</span>
                  )}
                </div>

                {/* 挂载的频道 */}
                <div className='mt-4 pt-4 border-t border-slate-200'>
                  <div className='text-xs font-medium text-slate-600 mb-2'>
                    挂载的频道
                  </div>
                  {channelsLoading ? (
                    <div className='flex items-center gap-1 text-slate-500'>
                      <Loader2 size={12} className='animate-spin' />
                      <span className='text-xs'>加载中</span>
                    </div>
                  ) : mountedChannels.length > 0 ? (
                    <div className='space-y-2'>
                      {mountedChannels.map((channel, index) => (
                        <div
                          key={index}
                          className='text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200'
                        >
                          {channel.path}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className='text-sm text-slate-400'>暂无挂载频道</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 筛选器 */}
        <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6'>
          <div className='flex flex-wrap items-center gap-4'>
            <div className='flex items-center gap-2'>
              <label className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                创作时间筛选:
              </label>
              <div className='relative'>
                <select
                  value={timePeriod}
                  onChange={e =>
                    setTimePeriod(
                      e.target.value as
                      | 'today'
                      | 'yesterday'
                      | 'near7'
                      | 'history'
                    )
                  }
                  className='appearance-none bg-slate-50 text-slate-700 text-sm font-medium rounded-lg pl-3 pr-8 py-2 hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors border border-slate-200'
                >
                  {timePeriods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                />
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <label className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                支付状态:
              </label>
              <div className='relative'>
                <select
                  value={paymentStatus}
                  onChange={e =>
                    setPaymentStatus(
                      e.target.value as 'all' | 'paid' | 'unpaid'
                    )
                  }
                  className='appearance-none bg-slate-50 text-slate-700 text-sm font-medium rounded-lg pl-3 pr-8 py-2 hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors border border-slate-200'
                >
                  {paymentStatusOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                />
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <label className='text-sm font-medium text-slate-700 whitespace-nowrap'>
                支付时间筛选:
              </label>
              <div className='relative'>
                <select
                  value={paymentTimePeriod}
                  onChange={e =>
                    setPaymentTimePeriod(
                      e.target.value as
                      | 'all'
                      | 'today'
                      | 'yesterday'
                      | 'near7'
                      | 'history'
                    )
                  }
                  className='appearance-none bg-slate-50 text-slate-700 text-sm font-medium rounded-lg pl-3 pr-8 py-2 hover:bg-slate-100 focus:outline-none cursor-pointer transition-colors border border-slate-200'
                >
                  <option value='all'>全部</option>
                  {timePeriods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                />
              </div>
            </div>

            <div className='ml-auto text-sm text-slate-500'>
              共 {total} 件作品
            </div>
          </div>
        </div>

        {/* 作品列表表格 */}
        <div className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden'>
          <div className='px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50'>
            <h3 className='font-bold text-slate-800 flex items-center gap-2'>
              <FileText size={18} className='text-blue-600' /> 作品列表
            </h3>
          </div>

          {worksLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span className='ml-2'>加载中...</span>
            </div>
          ) : works.length === 0 ? (
            <div className='text-center py-12 text-slate-500'>暂无作品数据</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead>
                  <tr className='bg-slate-50 text-slate-500 border-b border-slate-200'>
                    <th className='px-6 py-3 font-medium'>作品ID</th>
                    <th className='px-4 py-3 font-medium'>标题</th>
                    <th className='px-4 py-3 font-medium'>封面</th>
                    <th className='px-4 py-3 font-medium'>AppID</th>
                    <th className='px-4 py-3 font-medium'>用户ID</th>
                    <th className='px-4 py-3 font-medium'>创建时间</th>
                    <th className='px-4 py-3 font-medium'>更新时间</th>
                    <th className='px-4 py-3 font-medium'>版本号</th>
                    <th className='px-4 py-3 font-medium'>支付状态</th>
                    <th className='px-4 py-3 font-medium'>支付时间</th>
                    <th className='px-4 py-3 font-medium'>行为统计</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {works.map(work => (
                    <tr
                      key={work.id}
                      className='hover:bg-slate-50 transition-colors cursor-pointer'
                    >
                      <td
                        onClick={() => {
                          window.open(getShareUrl(work.id), '_blank');
                        }}
                        className='px-6 py-4 font-mono text-xs text-slate-600'
                      >
                        {work.id.slice(0, 12)}...
                      </td>
                      <td
                        onClick={() => {
                          window.open(getShareUrl(work.id), '_blank');
                        }}
                        className='px-4 py-4 text-slate-800 max-w-xs truncate cursor-pointer hover:text-blue-600'
                      >
                        {work.title || '-'}
                      </td>
                      <td className='px-4 py-4'>
                        {work.cover ? (
                          <img
                            src={cdnApi(work.cover)}
                            alt={work.title}
                            className='w-16 h-16 object-cover rounded border border-slate-200 hover:text-blue-600'
                          />
                        ) : (
                          <span className='text-slate-400 text-xs'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-4 text-slate-600 text-xs'>
                        {work.appid || '-'}
                      </td>
                      <td
                        className='px-4 py-4 text-slate-700 hover:text-blue-600'
                        onClick={() => {
                          router.push(
                            `/dashboard/manager/data/user/${work.uid}`
                          );
                        }}
                      >
                        {work.uid}
                      </td>
                      <td className='px-4 py-4 text-slate-600 text-xs'>
                        {work.create_time ? formatDate(work.create_time) : '-'}
                      </td>
                      <td className='px-4 py-4 text-slate-600 text-xs'>
                        {work.update_time ? formatDate(work.update_time) : '-'}
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
                        {work.stat_publish_count != null ||
                          work.stat_viewer_pv != null ||
                          work.stat_vip_inter_count != null ||
                          work.stat_share_count != null ? (
                          <div className='space-y-0.5'>
                            <div>
                              编辑右上角点击：{' '}
                              <span className='font-medium'>
                                {work.stat_publish_count ?? 0}
                              </span>
                            </div>

                            <div>
                              VIP拦截:{' '}
                              <span className='font-medium'>
                                {work.stat_vip_inter_count ?? 0}
                              </span>
                            </div>
                            <div>
                              分享点击:{' '}
                              <span className='font-medium'>
                                {work.stat_share_count ?? 0}
                              </span>
                            </div>
                            <div>
                              viewerPV:{' '}
                              <span className='font-medium'>
                                {work.stat_viewer_pv ?? 0}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
      </main>

      {/* 编辑模板信息弹窗 */}
      <ResponsiveDialog
        isDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title='编辑模板信息'
        contentProps={{
          className: 'max-w-[600px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='designer_uid'>设计师UID</Label>
              <Input
                id='designer_uid'
                type='number'
                value={editFormData.designer_uid}
                onChange={e =>
                  setEditFormData({
                    ...editFormData,
                    designer_uid: e.target.value,
                  })
                }
                placeholder='请输入设计师UID'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='appids'>AppIDs</Label>
              <div className='flex gap-2'>
                <Input
                  id='appids'
                  value={appidInput}
                  onChange={e => setAppidInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAppid();
                    }
                  }}
                  placeholder='输入 appid 后按回车或点击添加'
                />
                <Button type='button' onClick={handleAddAppid} size='sm'>
                  添加
                </Button>
              </div>
              {editFormData.appids.length > 0 && (
                <div className='flex flex-wrap gap-2 mt-2'>
                  {editFormData.appids.map((appid, index) => (
                    <span
                      key={index}
                      className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200'
                    >
                      {appid}
                      <button
                        type='button'
                        onClick={() => handleRemoveAppid(appid)}
                        className='ml-1 hover:text-purple-900'
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label>挂载的频道</Label>
              {channelsLoadingForEdit ? (
                <div className='flex items-center gap-2 text-sm text-slate-500'>
                  <Loader2 size={14} className='animate-spin' />
                  <span>加载频道列表...</span>
                </div>
              ) : (
                <div className='space-y-2 max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg p-3'>
                  {allChannels.length === 0 ? (
                    <div className='text-sm text-slate-400 text-center py-4'>
                      暂无四级频道
                    </div>
                  ) : (
                    allChannels.map((channel: any) => {
                      // 构建频道路径
                      const getChannelPath = (
                        ch: any,
                        depth: number = 0
                      ): string => {
                        if (depth > 5) return ch.display_name || ch.alias; // 防止无限递归
                        if (ch.parent) {
                          const parentPath = getChannelPath(
                            ch.parent,
                            depth + 1
                          );
                          return `${parentPath} - ${ch.display_name || ch.alias}`;
                        }
                        return ch.display_name || ch.alias;
                      };
                      const channelPath = getChannelPath(channel);

                      return (
                        <label
                          key={channel.id}
                          className='flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer'
                        >
                          <input
                            type='checkbox'
                            checked={editFormData.channelIds.includes(
                              channel.id
                            )}
                            onChange={e => {
                              if (e.target.checked) {
                                setEditFormData({
                                  ...editFormData,
                                  channelIds: [
                                    ...editFormData.channelIds,
                                    channel.id,
                                  ],
                                });
                              } else {
                                setEditFormData({
                                  ...editFormData,
                                  channelIds: editFormData.channelIds.filter(
                                    id => id !== channel.id
                                  ),
                                });
                              }
                            }}
                            className='rounded border-slate-300 text-blue-600 focus:ring-blue-500'
                          />
                          <span className='text-sm text-slate-700 flex-1'>
                            {channelPath}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button variant='outline' onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
