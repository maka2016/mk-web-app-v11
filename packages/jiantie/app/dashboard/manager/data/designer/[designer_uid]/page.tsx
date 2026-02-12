'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { ArrowLeft, Eye, Loader2, Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const PAGE_SIZE = 20;

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString('zh-CN');
};

// 格式化金额
const formatAmount = (amount: number): string => {
  return (
    '¥' +
    amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

// 格式化日期
const formatDate = (date: Date | string | null): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 模板表格组件
const TemplatesTable = ({
  templates,
  page,
  total,
  onPageChange,
}: {
  templates: any[];
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) => {
  const router = useRouter();

  return (
    <>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='min-w-[100px]'>封面</TableHead>
              <TableHead className='min-w-[120px]'>模板ID</TableHead>
              <TableHead className='min-w-[150px]'>标签</TableHead>
              <TableHead className='min-w-[150px]'>上架时间</TableHead>
              <TableHead className='min-w-[100px]'>近30天销量</TableHead>
              <TableHead className='min-w-[120px]'>近30天销售额</TableHead>
              <TableHead className='min-w-[100px]'>综合分</TableHead>
              <TableHead className='min-w-[100px]'>历史销量</TableHead>
              <TableHead className='min-w-[120px]'>历史销售额</TableHead>
              <TableHead className='min-w-[100px]'>历史点击量</TableHead>
              <TableHead className='min-w-[100px]'>历史创作量</TableHead>
              <TableHead className='min-w-[80px]'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => {
              const coverUrl = template.coverV3?.url || '';
              return (
                <TableRow
                  key={template.id}
                  className='cursor-pointer hover:bg-slate-50 transition-colors'
                  onClick={() => {
                    router.push(
                      `/dashboard/manager/data/template/${template.id}`
                    );
                  }}
                >
                  <TableCell>
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt='cover'
                        className='w-16 h-16 object-contain rounded'
                      />
                    ) : (
                      <span className='text-muted-foreground text-sm'>-</span>
                    )}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {template.id}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {template.tag_names && template.tag_names.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {template.tag_names.map(
                          (tagName: string, idx: number) => (
                            <span
                              key={idx}
                              className='px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs'
                            >
                              {tagName}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <span className='text-muted-foreground'>-</span>
                    )}
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {formatDate(template.publish_date)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatNumber(template.sales_30d || 0)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatAmount(template.gmv_30d || 0)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {(template.composite_score || 0).toFixed(4)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatNumber(template.total_sales || 0)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatAmount(template.total_gmv || 0)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatNumber(template.total_clicks || 0)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {formatNumber(template.total_creations || 0)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={e => {
                        e.stopPropagation();
                        const url = `/mobile/template?id=${template.id}&appid=jiantie&template_name=${encodeURIComponent(template.title || '')}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Eye className='h-4 w-4 mr-1' />
                      预览
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {total > PAGE_SIZE && (
        <div className='mt-4 flex justify-center'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    if (page > 1) {
                      onPageChange(page - 1);
                    }
                  }}
                  className={
                    page === 1
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
              {Array.from(
                { length: Math.ceil(total / PAGE_SIZE) },
                (_, i) => i + 1
              )
                .filter(p => {
                  if (p === 1 || p === Math.ceil(total / PAGE_SIZE))
                    return true;
                  if (Math.abs(p - page) <= 2) return true;
                  return false;
                })
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && arr[idx - 1] < p - 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <PaginationItem>
                          <span className='px-2'>...</span>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => onPageChange(p)}
                          isActive={p === page}
                          className='cursor-pointer'
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  );
                })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    if (page < Math.ceil(total / PAGE_SIZE)) {
                      onPageChange(page + 1);
                    }
                  }}
                  className={
                    page >= Math.ceil(total / PAGE_SIZE)
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <div className='mt-4 text-sm text-slate-500 text-center'>
        共 {total} 条记录，第 {page} / {Math.ceil(total / PAGE_SIZE)} 页
      </div>
    </>
  );
};

export default function DesignerDetailPage({
  params,
}: {
  params: Promise<{ designer_uid: string }>;
}) {
  const router = useRouter();
  const [designerUid, setDesignerUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [designerInfo, setDesignerInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recent'>('all');
  const [page, setPage] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // 获取动态路由参数
  useEffect(() => {
    params.then(p => {
      setDesignerUid(p.designer_uid);
      setLoading(false);
    });
  }, [params]);

  // 获取设计师信息
  useEffect(() => {
    const loadDesignerInfo = async () => {
      if (!designerUid) return;

      const uid = Number(designerUid);
      if (isNaN(uid)) {
        console.error('无效的设计师UID:', designerUid);
        return;
      }

      try {
        const info = await trpc.designer.findByUid.query({ uid });
        setDesignerInfo(info);
      } catch (error) {
        console.error('加载设计师信息失败:', error);
      }
    };

    if (designerUid) {
      loadDesignerInfo();
    }
  }, [designerUid]);

  // 加载模板列表
  const loadTemplates = async (targetPage?: number) => {
    if (!designerUid) return;

    const currentPage = targetPage !== undefined ? targetPage : page;
    const uid = Number(designerUid);
    if (isNaN(uid)) {
      console.error('无效的设计师UID:', designerUid);
      return;
    }

    setTemplatesLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const result = await trpc.adminWorks.getTemplatesByDesigner.query({
        designer_uid: uid,
        skip,
        take: PAGE_SIZE,
        recent_days: activeTab === 'recent' ? 30 : undefined,
      });

      setTemplates(result.templates || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('加载模板列表失败:', error);
      setTemplates([]);
      setTotal(0);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // 当设计师UID、页码或tab变化时重新加载
  useEffect(() => {
    if (designerUid) {
      setPage(1); // 切换tab时重置到第一页
      loadTemplates(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designerUid, activeTab]);

  // 当页码变化时重新加载
  useEffect(() => {
    if (designerUid) {
      loadTemplates(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className='min-h-screen bg-slate-50 font-sans text-slate-800 pb-12'>
      {/* 头部导航 */}
      <header className='bg-white border-b border-slate-200 z-20 px-6 py-3 flex items-center justify-between shadow-sm'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => router.back()}
            className='p-1.5 hover:bg-slate-100 rounded-lg transition-colors'
          >
            <ArrowLeft size={20} className='text-slate-600' />
          </button>
          <div className='flex items-center gap-2'>
            <div className='bg-purple-600 text-white p-1.5 rounded-lg shadow-sm shadow-purple-200'>
              <Palette size={20} />
            </div>
            <h1 className='text-lg font-bold text-slate-800 tracking-tight'>
              设计师详情
            </h1>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 py-8'>
        {/* 设计师信息卡片 */}
        {loading ? (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6'>
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span className='ml-2'>加载中...</span>
            </div>
          </div>
        ) : designerUid ? (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6'>
            <div className='flex items-start gap-4'>
              <div className='w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0'>
                <Palette size={32} className='text-purple-600' />
              </div>
              <div className='flex-1'>
                <h2 className='text-xl font-bold text-slate-800 mb-2'>
                  {designerInfo?.name || '设计师'}
                </h2>
                <div className='flex items-center gap-4 text-sm text-slate-500'>
                  <span>设计师UID: {designerUid}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 模板列表 */}
        <div className='bg-white rounded-xl shadow-sm border border-slate-200 p-6'>
          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as 'all' | 'recent')}
          >
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-bold text-slate-800'>模板列表</h2>
              <TabsList>
                <TabsTrigger value='all'>历史模板</TabsTrigger>
                <TabsTrigger value='recent'>30天内新模板</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value='all' className='mt-0'>
              {templatesLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>加载中...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className='text-center py-12 text-slate-500'>
                  暂无模板数据
                </div>
              ) : (
                <TemplatesTable
                  templates={templates}
                  page={page}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </TabsContent>

            <TabsContent value='recent' className='mt-0'>
              {templatesLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>加载中...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className='text-center py-12 text-slate-500'>
                  暂无模板数据
                </div>
              ) : (
                <TemplatesTable
                  templates={templates}
                  page={page}
                  total={total}
                  onPageChange={setPage}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
