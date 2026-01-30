'use client';

import { getUid } from '@/services';
import { useStore } from '@/store';
import { trpc, type SerializedWorksEntity } from '@/utils/trpc';
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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@workspace/ui/components/table';
import cls from 'classnames';
import { ExternalLink, Maximize2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface WorksListProps {
  currentWorksId?: string;
  onSelectWork?: (work: SerializedWorksEntity) => void;
}

const WorksList = ({ currentWorksId, onSelectWork }: WorksListProps) => {
  const { setLoginShow } = useStore();
  const [uid, setUid] = useState<string>('');
  const [worksList, setWorksList] = useState<SerializedWorksEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // 加载作品列表
  const loadWorks = async (pageNum = page, search = keyword) => {
    const currentUid = getUid();
    if (!currentUid) {
      return;
    }

    setLoading(true);
    try {
      // 使用 tRPC API 查询作品列表
      const [works, count] = (await Promise.all([
        trpc.works.findMany.query({
          deleted: false,
          is_folder: false,
          keyword: search || undefined,
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
        trpc.works.count.query({
          deleted: false,
          is_folder: false,
          keyword: search || undefined,
        }),
      ])) as any as [SerializedWorksEntity[], number];

      setWorksList(works);
      setTotal(count);
    } catch (error) {
      toast.error('加载作品列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 检查登录状态
  useEffect(() => {
    const currentUid = getUid();
    setUid(currentUid);

    if (!currentUid) {
      setLoginShow(true);
      return;
    }

    // 加载作品列表
    loadWorks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当页码变化时重新加载
  useEffect(() => {
    if (uid) {
      loadWorks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, uid]);

  // 搜索
  const handleSearch = () => {
    setKeyword(searchValue);
    setPage(1);
    loadWorks(1, searchValue);
  };

  // 在当前窗口打开编辑器
  const openEditorInCurrentWindow = (work: SerializedWorksEntity) => {
    const params = new URLSearchParams(window.location.search);
    params.set('works_id', work.id);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.location.replace(newUrl);
  };

  // 在新窗口打开编辑器
  const openEditorInNewWindow = (work: SerializedWorksEntity) => {
    const params = new URLSearchParams(window.location.search);
    params.set('works_id', work.id);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.open(newUrl, '_blank');
  };

  // 未登录
  if (!uid) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='mb-4 text-lg'>请先登录</p>
          <Button onClick={() => setLoginShow(true)}>登录</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='flex-1 overflow-auto p-4'>
        {/* 工具栏 */}
        <div className='mb-4 flex flex-col gap-2'>
          {/* 紧凑模式下的简化工具栏 */}
          <div className='flex items-center gap-2 flex-wrap'>
            <div className='relative flex-1 min-w-[200px]'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='搜索作品标题...'
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className='pl-10 h-8 text-sm'
              />
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className='mb-4 text-sm text-muted-foreground'>
          共 {total} 个作品
        </div>

        {/* 作品列表 */}
        <div className='rounded-lg border bg-card'>
          <Table>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className='h-32 text-center'>
                    加载中...
                  </TableCell>
                </TableRow>
              ) : worksList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className='h-32 text-center'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <p className='text-muted-foreground'>
                        {keyword ? '没有找到匹配的作品' : '还没有作品'}
                      </p>
                      {keyword && (
                        <Button
                          variant='link'
                          onClick={() => {
                            setKeyword('');
                            setSearchValue('');
                            setPage(1);
                            loadWorks(1, '');
                          }}
                        >
                          清除搜索
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                worksList.map(work => (
                  <TableRow
                    key={work.id}
                    className={cls(
                      'group',
                      onSelectWork && 'cursor-pointer hover:bg-muted/50',
                      currentWorksId && work.id === currentWorksId
                        ? 'bg-blue-50'
                        : ''
                    )}
                    onClick={
                      onSelectWork ? () => onSelectWork(work) : undefined
                    }
                  >
                    <TableCell className='p-1'>
                      <div className='relative h-16 w-12 overflow-hidden rounded border bg-muted'>
                        {work.cover ? (
                          <img
                            src={work.cover}
                            alt={work.title}
                            className='h-full w-full object-cover'
                          />
                        ) : (
                          <div className='flex h-full items-center justify-center text-xs text-muted-foreground'>
                            无
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='p-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{work.title}</span>
                        {currentWorksId === work.id && (
                          <span className='text-xs text-blue-600'>
                            当前作品
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='p-1'>
                      <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={e => {
                            e.stopPropagation();
                            openEditorInCurrentWindow(work);
                          }}
                          className='h-6 w-6 p-0'
                          title='在当前窗口打开'
                        >
                          <Maximize2 className='h-3.5 w-3.5' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={e => {
                            e.stopPropagation();
                            openEditorInNewWindow(work);
                          }}
                          className='h-6 w-6 p-0'
                          title='在新窗口打开'
                        >
                          <ExternalLink className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 分页区域 - 固定在底部 */}
      {total > pageSize &&
        (() => {
          const totalPages = Math.ceil(total / pageSize);
          const pages = [];

          // 生成页码数组
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
            }
          } else {
            if (page <= 3) {
              pages.push(1, 2, 3, 4, 5, -1, totalPages);
            } else if (page >= totalPages - 2) {
              pages.push(
                1,
                -1,
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages
              );
            } else {
              pages.push(1, -1, page - 1, page, page + 1, -1, totalPages);
            }
          }

          return (
            <div className='border-t bg-background sticky bottom-0 px-3 py-2'>
              <div className='flex items-center justify-between gap-4'>
                <div className='text-xs text-gray-500 whitespace-nowrap shrink-0'>
                  共 {total} 个作品
                </div>
                <div className='flex-1 min-w-0 overflow-hidden'>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={
                            page === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      {pages.map((pageNum, index) =>
                        pageNum === -1 ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                              className='cursor-pointer'
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage(p => Math.min(totalPages, p + 1))
                          }
                          className={
                            page >= totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default WorksList;
