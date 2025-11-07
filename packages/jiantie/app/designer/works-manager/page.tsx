'use client';

import { onScreenShot } from '@/components/GridV3/shared';
import { showSelector } from '@/components/showSelector';
import { getAppId, getUid } from '@/services';
import { updateWorksDetail2 } from '@/services/works2';
import { useStore } from '@/store';
import { trpc } from '@/utils/trpc';
import {
  cdnApi,
  getDesignerInfoForClient,
  type DesignerConfig,
} from '@mk/services';
import type { WorksEntity } from '@workspace/database/generated/client';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Copy,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { observer } from 'mobx-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// tRPC 传输类型：将 Date 类型转换为 string（JSON 序列化）
type SerializedWorksEntity = Omit<
  WorksEntity,
  'create_time' | 'update_time' | 'custom_time'
> & {
  create_time: string;
  update_time: string;
  custom_time: string | null;
};

const WorksManager = () => {
  const { setLoginShow } = useStore();
  const [uid, setUid] = useState<string>('');
  const [isDesigner, setIsDesigner] = useState<boolean | null>(null);
  const [designerName, setDesignerName] = useState<string>('');

  const [worksList, setWorksList] = useState<SerializedWorksEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workToDelete, setWorkToDelete] =
    useState<SerializedWorksEntity | null>(null);
  const [editingWork, setEditingWork] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // 封面管理相关
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [workToEditCover, setWorkToEditCover] =
    useState<SerializedWorksEntity | null>(null);
  const [newCover, setNewCover] = useState('');
  const [generatingCover, setGeneratingCover] = useState(false);

  // 加载作品列表
  const loadWorks = async (pageNum = page, search = keyword) => {
    const currentUid = getUid();
    if (!currentUid) {
      return;
    }

    setLoading(true);
    try {
      // 使用 tRPC API 查询作品列表
      const works = (await trpc.works.findMany.query({
        deleted: false,
        is_folder: false,
        keyword: search || undefined,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      })) as any as SerializedWorksEntity[];

      const count = (await trpc.works.count.query({
        deleted: false,
        is_folder: false,
        keyword: search || undefined,
      })) as any as number;

      setWorksList(works);
      setTotal(count);
    } catch (error) {
      toast.error('加载作品列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 验证设计师身份
  useEffect(() => {
    const currentUid = getUid();
    setUid(currentUid);

    if (!currentUid) {
      setLoginShow(true);
      return;
    }

    // 验证设计师身份
    getDesignerInfoForClient({
      uid: currentUid,
      appid: getAppId(),
    })
      .then((res: DesignerConfig) => {
        setIsDesigner(res.isDesigner);
        setDesignerName(res.fullName);
        if (!res.isDesigner) {
          toast.error('你还不是设计师，请联系管理员');
        }
      })
      .catch(() => {
        toast.error('需要登陆才能使用设计师功能');
        setIsDesigner(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载作品列表
  useEffect(() => {
    if (isDesigner && uid) {
      loadWorks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isDesigner, uid]);

  // 搜索
  const handleSearch = () => {
    setKeyword(searchValue);
    setPage(1);
    loadWorks(1, searchValue);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedWorks.size === worksList.length) {
      setSelectedWorks(new Set());
    } else {
      setSelectedWorks(new Set(worksList.map(w => w.id)));
    }
  };

  // 选择单个作品
  const toggleSelectWork = (workId: string) => {
    const newSelected = new Set(selectedWorks);
    if (newSelected.has(workId)) {
      newSelected.delete(workId);
    } else {
      newSelected.add(workId);
    }
    setSelectedWorks(newSelected);
  };

  // 删除作品
  const handleDelete = async (work: SerializedWorksEntity) => {
    try {
      await trpc.works.delete.mutate({ id: work.id });
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      setWorkToDelete(null);

      // 渐进式更新：直接从列表中移除
      setWorksList(prev => prev.filter(w => w.id !== work.id));
      setTotal(prev => prev - 1);

      // 如果当前页没有数据了且不是第一页，返回上一页
      if (worksList.length === 1 && page > 1) {
        setPage(page - 1);
      }
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedWorks.size === 0) {
      toast.error('请选择要删除的作品');
      return;
    }

    const deleteCount = selectedWorks.size;
    try {
      const deletePromises = Array.from(selectedWorks).map(
        workId => trpc.works.delete.mutate({ id: workId }) as any
      );
      await Promise.all(deletePromises);
      toast.success(`成功删除 ${deleteCount} 个作品`);

      // 渐进式更新：从列表中批量移除
      setWorksList(prev => prev.filter(w => !selectedWorks.has(w.id)));
      setTotal(prev => prev - deleteCount);
      setSelectedWorks(new Set());

      // 如果当前页没有数据了且不是第一页，返回上一页
      if (worksList.length === deleteCount && page > 1) {
        setPage(page - 1);
      }
    } catch (error) {
      toast.error('批量删除失败');
      console.error(error);
    }
  };

  // 复制作品
  const handleDuplicate = async (work: SerializedWorksEntity) => {
    try {
      const newWork = (await trpc.works.duplicate.mutate({
        id: work.id,
      })) as any as SerializedWorksEntity;
      toast.success('复制成功');

      // 渐进式更新：将新作品添加到列表顶部，移除最后一项保持页面大小
      setWorksList(prev => {
        const newList = [newWork, ...prev];
        // 如果超过页面大小，移除最后一项
        return newList.length > pageSize ? newList.slice(0, pageSize) : newList;
      });
      setTotal(prev => prev + 1);
    } catch (error) {
      toast.error('复制失败');
      console.error(error);
    }
  };

  // 编辑标题
  const startEditing = (work: SerializedWorksEntity) => {
    setEditingWork(work.id);
    setEditTitle(work.title);
  };

  const saveTitle = async (work: SerializedWorksEntity) => {
    if (!editTitle.trim()) {
      toast.error('标题不能为空');
      return;
    }

    try {
      await trpc.works.update.mutate({
        id: work.id,
        title: editTitle,
      });
      toast.success('更新成功');
      setEditingWork(null);

      // 渐进式更新：直接更新列表中的标题
      setWorksList(prev =>
        prev.map(w => (w.id === work.id ? { ...w, title: editTitle } : w))
      );
    } catch (error) {
      toast.error('更新失败');
      console.error(error);
    }
  };

  const cancelEditing = () => {
    setEditingWork(null);
    setEditTitle('');
  };

  // 打开设计师编辑器
  const openEditor = (work: SerializedWorksEntity) => {
    window.open(
      `/editor-designer?works_id=${work.id}&designer_tool=2&uid=${getUid()}&appid=${getAppId()}`,
      '_blank'
    );
  };

  // 预览作品
  const previewWork = (work: SerializedWorksEntity) => {
    if (work.child_works_id) {
      window.open(`/view/${work.child_works_id}`, '_blank');
    } else {
      toast.error('作品尚未发布');
    }
  };

  // 生成封面
  const genTemplateCover = async (templateId: string, designer_uid: string) => {
    const templateUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;
    const apiUrl =
      'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync';
    const apiUrlFinal = `${apiUrl}?url=${encodeURIComponent(
      templateUrl
    )}&width=540&height=960&works_id=${templateId}&uid=${designer_uid}&mode=template&watermark=0&setpts=0.5&pageCount=1`;

    const coverRes = await axios.get(apiUrlFinal, {
      timeout: 60000,
    });

    const coverUrl = coverRes.data.fullUrls[0];
    return coverUrl;
  };

  // 打开封面编辑对话框
  const openCoverDialog = (work: SerializedWorksEntity) => {
    setWorkToEditCover(work);
    setNewCover(work.cover || '');
    setCoverDialogOpen(true);
  };

  // 重新生成封面
  const handleGenerateCover = async () => {
    if (!workToEditCover) return;

    setGeneratingCover(true);
    try {
      const coverUrl = await onScreenShot({
        id: workToEditCover.id,
        width: 540,
        height: 960,
        appid: getAppId(),
      });
      setNewCover(coverUrl[0]);
      updateWorksDetail2(workToEditCover.id, {
        cover: coverUrl[0],
      });
      toast.success('封面生成成功');
    } catch (error) {
      toast.error('封面生成失败');
      console.error(error);
    } finally {
      setGeneratingCover(false);
    }
  };

  // 打开图片选择器上传封面
  const handleUploadCover = () => {
    if (!workToEditCover) return;

    showSelector({
      type: 'picture',
      worksId: workToEditCover.id,
      onSelected: async (params: any) => {
        console.log('params', params);
        setNewCover(cdnApi(params.ossPath));
        toast.success('图片选择成功');
      },
    });
  };

  // 保存封面
  const handleSaveCover = async () => {
    if (!workToEditCover || !newCover) return;

    try {
      await trpc.works.update.mutate({
        id: workToEditCover.id,
        cover: newCover,
      });
      toast.success('封面更新成功');
      setCoverDialogOpen(false);

      // 渐进式更新：直接更新列表中的封面
      setWorksList(prev =>
        prev.map(w =>
          w.id === workToEditCover.id ? { ...w, cover: newCover } : w
        )
      );
    } catch (error) {
      toast.error('封面更新失败');
      console.error(error);
    }
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

  // 加载中
  if (isDesigner === null) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='text-lg'>验证设计师身份中...</p>
        </div>
      </div>
    );
  }

  // 非设计师
  if (!isDesigner) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='mb-4 text-lg text-destructive'>
            你还不是设计师，请联系管理员
          </p>
          <Button onClick={() => window.history.back()}>返回</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-screen flex-col'>
      <div className='container mx-auto flex-1 overflow-auto p-6'>
        {/* 头部 */}
        <div className='mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='mb-2 text-3xl font-bold'>我的作品</h1>
              <p className='text-muted-foreground'>
                管理您的所有作品，快速编辑和分享
              </p>
            </div>
            {designerName && (
              <div className='text-sm text-muted-foreground'>
                设计师：{designerName}
              </div>
            )}
          </div>
        </div>

        {/* 工具栏 */}
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div className='flex flex-1 items-center gap-2'>
            <div className='relative flex-1 max-w-md'>
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
                className='pl-10'
              />
            </div>
            <Button onClick={handleSearch} variant='secondary'>
              搜索
            </Button>
          </div>

          {selectedWorks.size > 0 && (
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                已选择 {selectedWorks.size} 项
              </span>
              <Button
                variant='destructive'
                size='sm'
                onClick={handleBatchDelete}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                批量删除
              </Button>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        <div className='mb-4 text-sm text-muted-foreground'>
          共 {total} 个作品
        </div>

        {/* 作品列表 */}
        <div className='rounded-lg border bg-card mb-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12'>
                  <Checkbox
                    checked={
                      worksList.length > 0 &&
                      selectedWorks.size === worksList.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className='w-24'>封面</TableHead>
                <TableHead>标题</TableHead>
                <TableHead className='w-32'>创建时间</TableHead>
                <TableHead className='w-32'>更新时间</TableHead>
                <TableHead className='w-24'>状态</TableHead>
                <TableHead className='w-40 text-right'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center'>
                    加载中...
                  </TableCell>
                </TableRow>
              ) : worksList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center'>
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
                  <TableRow key={work.id} className='group'>
                    <TableCell>
                      <Checkbox
                        checked={selectedWorks.has(work.id)}
                        onCheckedChange={() => toggleSelectWork(work.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className='relative h-16 w-12 overflow-hidden rounded border bg-muted'>
                        {work.cover ? (
                          <Image
                            src={work.cover}
                            alt={work.title}
                            fill
                            className='object-cover'
                            unoptimized
                          />
                        ) : (
                          <div className='flex h-full items-center justify-center text-xs text-muted-foreground'>
                            无
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingWork === work.id ? (
                        <div className='flex items-center gap-2'>
                          <Input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                saveTitle(work);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            autoFocus
                            className='h-8'
                          />
                          <Button
                            size='sm'
                            onClick={() => saveTitle(work)}
                            variant='ghost'
                          >
                            保存
                          </Button>
                          <Button
                            size='sm'
                            onClick={cancelEditing}
                            variant='ghost'
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>{work.title}</span>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => startEditing(work)}
                            className='h-6 w-6 p-0'
                            title='重命名'
                          >
                            <Edit2 className='h-3 w-3' />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {dayjs(work.create_time).format('YYYY-MM-DD')}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {dayjs(work.update_time).format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell>
                      {work.child_works_id ? (
                        <span className='inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'>
                          已发布
                        </span>
                      ) : (
                        <span className='inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700'>
                          草稿
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => openEditor(work)}
                          className='h-8'
                        >
                          <Edit2 className='mr-1 h-4 w-4' />
                          编辑
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                            >
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            {work.child_works_id && (
                              <DropdownMenuItem
                                onClick={() => previewWork(work)}
                              >
                                <ExternalLink className='mr-2 h-4 w-4' />
                                预览
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(work)}
                            >
                              <Copy className='mr-2 h-4 w-4' />
                              复制
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCoverDialog(work)}
                            >
                              <ImageIcon className='mr-2 h-4 w-4' />
                              修改封面
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setWorkToDelete(work);
                                setDeleteDialogOpen(true);
                              }}
                              className='text-destructive'
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            <div className='border-t bg-background px-6 py-4'>
              <div className='container mx-auto flex items-center justify-between gap-4'>
                <div className='text-sm text-muted-foreground whitespace-nowrap'>
                  显示 {(page - 1) * pageSize + 1} 到{' '}
                  {Math.min(page * pageSize, total)} 条，共 {total} 条
                </div>
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
          );
        })()}

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className='sm:max-w-md p-6'>
          <DialogHeader className='mb-4'>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除作品 &ldquo;{workToDelete?.title}&rdquo;
              吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              onClick={() => {
                setDeleteDialogOpen(false);
                setWorkToDelete(null);
              }}
            >
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={() => workToDelete && handleDelete(workToDelete)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 封面管理对话框 */}
      <Dialog open={coverDialogOpen} onOpenChange={setCoverDialogOpen}>
        <DialogContent className='max-w-md p-6'>
          <DialogHeader className='mb-4'>
            <DialogTitle>修改封面</DialogTitle>
            <DialogDescription>
              为作品 &ldquo;{workToEditCover?.title}&rdquo; 重新生成或上传封面
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 mb-4'>
            <div className='flex justify-center'>
              {newCover ? (
                <div className='relative h-64 w-40 overflow-hidden rounded border bg-muted'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={newCover}
                    alt='封面预览'
                    className='h-full w-full object-cover'
                  />
                </div>
              ) : (
                <div className='flex h-64 w-40 items-center justify-center rounded border bg-muted text-muted-foreground'>
                  <p>暂无封面</p>
                </div>
              )}
            </div>
            <div className='flex items-center gap-2'>
              <Button
                disabled={generatingCover}
                size='sm'
                variant='outline'
                onClick={handleGenerateCover}
                className='flex-1'
              >
                {generatingCover ? '生成中...' : '重新生成封面'}
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='flex-1'
                onClick={handleUploadCover}
              >
                <Upload className='mr-2 h-4 w-4' />
                本地上传
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setCoverDialogOpen(false);
                setWorkToEditCover(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleSaveCover} disabled={!newCover}>
              确定修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default observer(WorksManager);
