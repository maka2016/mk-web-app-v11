'use client';

import { getShareUrl, useStore } from '@/store';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import dayjs from 'dayjs';
import { ExternalLink, Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface RSVPItem {
  id: string;
  works_id: string;
  title: string;
  desc: string | null;
  enabled: boolean;
  create_time: Date | string;
  update_time: Date | string;
  works: {
    id: string;
    title: string;
    cover: string | null;
    uid: number;
    create_time: Date | string;
  } | null;
}

export default function RSVPManagerPage() {
  const store = useStore();
  const [rsvpList, setRsvpList] = useState<RSVPItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [worksId, setWorksId] = useState('');
  const [worksIdValue, setWorksIdValue] = useState('');
  const [uid, setUid] = useState<number | undefined>(undefined);
  const [uidValue, setUidValue] = useState('');

  // 详情对话框
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRsvp, setSelectedRsvp] = useState<RSVPItem | null>(null);
  const [invitees, setInvitees] = useState<any[]>([]);
  const [loadingInvitees, setLoadingInvitees] = useState(false);

  // 加载RSVP列表
  const loadRSVPs = async (
    pageNum = page,
    search = keyword,
    worksIdFilter = worksId,
    uidFilter = uid
  ) => {
    setLoading(true);
    try {
      const result = await trpc.rsvp.listAllRSVPs.query({
        keyword: search || undefined,
        worksId: worksIdFilter || undefined,
        uid: uidFilter || undefined,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      });

      setRsvpList(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      toast.error('加载RSVP列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRSVPs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 搜索
  const handleSearch = () => {
    setKeyword(searchValue);
    setWorksId(worksIdValue);
    const parsedUid = uidValue ? parseInt(uidValue, 10) : undefined;
    setUid(parsedUid);
    setPage(1);
    loadRSVPs(1, searchValue, worksIdValue, parsedUid);
  };

  // 查看作品
  const handleViewWorks = (worksId: string) => {
    window.open(getShareUrl(worksId), '_blank');
  };

  // 打开详情对话框
  const handleOpenDetail = async (rsvp: RSVPItem) => {
    setSelectedRsvp(rsvp);
    setDetailDialogOpen(true);
    setLoadingInvitees(true);
    setInvitees([]);

    try {
      // 获取邀请的嘉宾列表
      const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
        form_config_id: rsvp.id,
      });
      setInvitees(data || []);
    } catch (error: any) {
      toast.error(error.message || '加载嘉宾列表失败');
      console.error(error);
    } finally {
      setLoadingInvitees(false);
    }
  };

  // 关闭详情对话框
  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedRsvp(null);
    setInvitees([]);
  };

  // 计算统计数据
  const totalInvitees = invitees.length;
  const respondedInvitees = invitees.filter(
    (item: any) => item.has_response
  ).length;

  return (
    <div className='container mx-auto py-6 px-4'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-2'>RSVP管理员</h1>
        <p className='text-muted-foreground'>管理所有简帖用户的RSVP列表</p>
      </div>

      {/* 搜索栏 */}
      <div className='mb-6 space-y-3'>
        <div className='flex gap-2'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4' />
            <Input
              placeholder='搜索RSVP标题或作品标题...'
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className='pl-10'
            />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
        </div>
        <div className='flex gap-2'>
          <Input
            placeholder='作品ID'
            value={worksIdValue}
            onChange={e => setWorksIdValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className='flex-1'
          />
          <Input
            placeholder='用户ID'
            type='number'
            value={uidValue}
            onChange={e => setUidValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className='flex-1'
          />
        </div>
      </div>

      {/* 统计信息 */}
      <div className='mb-4 text-sm text-muted-foreground'>
        共 {total} 个RSVP
      </div>

      {/* RSVP列表 */}
      <div className='rounded-lg border bg-card mb-6'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-24'>封面</TableHead>
              <TableHead>RSVP标题</TableHead>
              <TableHead>作品标题</TableHead>
              <TableHead className='w-24'>用户UID</TableHead>
              <TableHead className='w-32'>创建时间</TableHead>
              <TableHead className='w-24'>状态</TableHead>
              <TableHead className='w-40 text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center py-8'>
                  加载中...
                </TableCell>
              </TableRow>
            ) : rsvpList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='text-center py-8 text-muted-foreground'
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              rsvpList.map(rsvp => (
                <TableRow key={rsvp.id}>
                  <TableCell>
                    {rsvp.works?.cover ? (
                      <div className='w-16 h-16 relative rounded overflow-hidden'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rsvp.works.cover}
                          alt={rsvp.works.title}
                          className='w-full h-full object-cover'
                        />
                      </div>
                    ) : (
                      <div className='w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs'>
                        无封面
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className='font-medium'>{rsvp.title}</div>
                    {rsvp.desc && (
                      <div className='text-sm text-muted-foreground line-clamp-1'>
                        {rsvp.desc}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {rsvp.works ? (
                      <div className='font-medium'>{rsvp.works.title}</div>
                    ) : (
                      <div className='text-muted-foreground'>作品已删除</div>
                    )}
                  </TableCell>
                  <TableCell>{rsvp.works?.uid || '-'}</TableCell>
                  <TableCell>
                    {dayjs(rsvp.create_time).format('YYYY-MM-DD HH:mm')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        rsvp.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rsvp.enabled ? '启用' : '禁用'}
                    </span>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleViewWorks(rsvp.works_id)}
                        disabled={!rsvp.works}
                      >
                        <ExternalLink className='w-4 h-4 mr-1' />
                        查看作品
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleOpenDetail(rsvp)}
                      >
                        <Eye className='w-4 h-4 mr-1' />
                        详情
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => {
                  if (page > 1) {
                    setPage(page - 1);
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
              { length: Math.ceil(total / pageSize) },
              (_, i) => i + 1
            )
              .filter(
                pageNum =>
                  pageNum === 1 ||
                  pageNum === Math.ceil(total / pageSize) ||
                  Math.abs(pageNum - page) <= 2
              )
              .map((pageNum, index, array) => (
                <div key={pageNum} className='flex items-center'>
                  {index > 0 && array[index - 1] !== pageNum - 1 && (
                    <PaginationEllipsis />
                  )}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={pageNum === page}
                      className='cursor-pointer'
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                </div>
              ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => {
                  if (page < Math.ceil(total / pageSize)) {
                    setPage(page + 1);
                  }
                }}
                className={
                  page >= Math.ceil(total / pageSize)
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* RSVP详情对话框 */}
      <ResponsiveDialog
        isOpen={detailDialogOpen}
        onOpenChange={open => {
          if (open) {
            setDetailDialogOpen(true);
          } else {
            handleCloseDetail();
          }
        }}
        title='RSVP详情'
        description='查看RSVP表单详情和邀请的嘉宾列表'
        contentProps={{
          className: 'max-w-4xl max-h-[80vh] overflow-y-auto',
        }}
      >
        {selectedRsvp && (
          <div className='space-y-6 p-4'>
            {/* RSVP基本信息 */}
            <div>
              <h3 className='text-lg font-semibold mb-3'>基本信息</h3>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm text-muted-foreground'>
                    RSVP标题
                  </label>
                  <div className='font-medium'>{selectedRsvp.title}</div>
                </div>
                <div>
                  <label className='text-sm text-muted-foreground'>
                    作品标题
                  </label>
                  <div className='font-medium'>
                    {selectedRsvp.works?.title || '作品已删除'}
                  </div>
                </div>
                <div>
                  <label className='text-sm text-muted-foreground'>
                    用户UID
                  </label>
                  <div className='font-medium'>
                    {selectedRsvp.works?.uid || '-'}
                  </div>
                </div>
                <div>
                  <label className='text-sm text-muted-foreground'>状态</label>
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedRsvp.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedRsvp.enabled ? '启用' : '禁用'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className='text-sm text-muted-foreground'>
                    创建时间
                  </label>
                  <div className='font-medium'>
                    {dayjs(selectedRsvp.create_time).format(
                      'YYYY-MM-DD HH:mm:ss'
                    )}
                  </div>
                </div>
                <div>
                  <label className='text-sm text-muted-foreground'>
                    更新时间
                  </label>
                  <div className='font-medium'>
                    {dayjs(selectedRsvp.update_time).format(
                      'YYYY-MM-DD HH:mm:ss'
                    )}
                  </div>
                </div>
                {selectedRsvp.desc && (
                  <div className='col-span-2'>
                    <label className='text-sm text-muted-foreground'>
                      描述
                    </label>
                    <div className='font-medium'>{selectedRsvp.desc}</div>
                  </div>
                )}
              </div>
            </div>

            {/* 统计数据 */}
            <div>
              <h3 className='text-lg font-semibold mb-3'>统计数据</h3>
              <div className='grid grid-cols-3 gap-4'>
                <div className='p-4 bg-muted rounded-lg'>
                  <div className='text-sm text-muted-foreground'>邀请总数</div>
                  <div className='text-2xl font-bold'>{totalInvitees}</div>
                </div>
                <div className='p-4 bg-muted rounded-lg'>
                  <div className='text-sm text-muted-foreground'>已响应</div>
                  <div className='text-2xl font-bold'>{respondedInvitees}</div>
                </div>
                <div className='p-4 bg-muted rounded-lg'>
                  <div className='text-sm text-muted-foreground'>未响应</div>
                  <div className='text-2xl font-bold'>
                    {totalInvitees - respondedInvitees}
                  </div>
                </div>
              </div>
            </div>

            {/* 嘉宾列表 */}
            <div>
              <h3 className='text-lg font-semibold mb-3'>邀请的嘉宾</h3>
              {loadingInvitees ? (
                <div className='text-center py-8 text-muted-foreground'>
                  加载中...
                </div>
              ) : invitees.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  暂无嘉宾
                </div>
              ) : (
                <div className='border rounded-lg overflow-hidden'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead>手机号</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>响应状态</TableHead>
                        <TableHead>是否出席</TableHead>
                        <TableHead>响应时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitees.map((invitee: any) => (
                        <TableRow key={invitee.id}>
                          <TableCell>{invitee.name || '-'}</TableCell>
                          <TableCell>{invitee.phone || '-'}</TableCell>
                          <TableCell>{invitee.email || '-'}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                invitee.has_response
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {invitee.has_response ? '已响应' : '未响应'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {invitee.has_response ? (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  invitee.will_attend
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {invitee.will_attend ? '出席' : '不出席'}
                              </span>
                            ) : (
                              <span className='text-muted-foreground'>-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {invitee.submission?.create_time
                              ? dayjs(invitee.submission.create_time).format(
                                  'YYYY-MM-DD HH:mm'
                                )
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
