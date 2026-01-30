'use client';

import { trpc } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { DialogFooter } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

type RiskLevel = 'low' | 'suspicious' | 'high';

interface SensitiveWordItem {
  id: string;
  word: string;
  level: RiskLevel;
}

const levelLabels: Record<RiskLevel, string> = {
  low: '低风险',
  suspicious: '可疑',
  high: '高危',
};

const levelColors: Record<RiskLevel, string> = {
  low: 'bg-blue-500/10 text-blue-600',
  suspicious: 'bg-yellow-500/10 text-yellow-600',
  high: 'bg-red-500/10 text-red-600',
};

export default function SensitiveWordManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [levelFilter, setLevelFilter] = useState<string>(
    searchParams.get('level') || 'all'
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SensitiveWordItem[]>([]);
  const [total, setTotal] = useState(0);

  // 编辑/创建对话框状态
  const [showDialog, setShowDialog] = useState(false);
  const [editingWord, setEditingWord] = useState<SensitiveWordItem | null>(
    null
  );
  const [formData, setFormData] = useState({
    word: '',
    level: 'suspicious' as RiskLevel,
  });

  const loadData = async (targetPage?: number) => {
    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const filters: any = {
        skip,
        take: PAGE_SIZE,
      };

      if (keyword) filters.keyword = keyword;
      if (levelFilter !== 'all') {
        filters.level = levelFilter as RiskLevel;
      }

      const result = await trpc.risk.listSensitiveWords.query(filters);

      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch sensitive words:', error);
      toast.error(`加载失败: ${error.message || '未知错误'}`);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData(1);
    updateURL();
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (levelFilter !== 'all') params.set('level', levelFilter);
    if (page > 1) params.set('page', String(page));
    router.replace(`/dashboard/manager/risk/sensitive?${params.toString()}`);
  };

  // 分页变化时重新查询
  useEffect(() => {
    loadData();
    updateURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 初始加载
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 打开创建对话框
  const handleCreate = () => {
    setEditingWord(null);
    setFormData({
      word: '',
      level: 'suspicious',
    });
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (word: SensitiveWordItem) => {
    setEditingWord(word);
    setFormData({
      word: word.word,
      level: word.level,
    });
    setShowDialog(true);
  };

  // 保存敏感词
  const handleSave = async () => {
    if (!formData.word.trim()) {
      toast.error('请输入敏感词');
      return;
    }

    try {
      if (editingWord) {
        // 更新
        await trpc.risk.updateSensitiveWord.mutate({
          id: editingWord.id,
          word: formData.word.trim(),
          level: formData.level,
        });
        toast.success('更新成功');
      } else {
        // 创建
        await trpc.risk.createSensitiveWord.mutate({
          word: formData.word.trim(),
          level: formData.level,
        });
        toast.success('创建成功');
      }
      setShowDialog(false);
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(`保存失败: ${error.message || '未知错误'}`);
    }
  };

  // 删除敏感词
  const handleDelete = async (id: string, word: string) => {
    if (!confirm(`确定要删除敏感词"${word}"吗？`)) {
      return;
    }
    try {
      await trpc.risk.deleteSensitiveWord.mutate({ id });
      toast.success('删除成功');
      await loadData();
      updateURL();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>敏感词管理</CardTitle>
            <Button onClick={handleCreate} size='sm'>
              <Plus className='h-4 w-4 mr-2' />
              新增敏感词
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {/* 搜索和筛选区域 */}
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[60px]'>
                  敏感词
                </Label>
                <Input
                  placeholder='搜索敏感词'
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className='h-9 w-[200px]'
                />
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-sm font-medium min-w-[70px]'>
                  风险等级
                </Label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className='h-9 w-[120px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部</SelectItem>
                    <SelectItem value='suspicious'>可疑</SelectItem>
                    <SelectItem value='high'>高危</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} size='sm' className='h-9'>
                <Search className='h-4 w-4 mr-2' />
                查询
              </Button>
            </div>

            {/* 数据表格 */}
            <div className='border rounded-lg overflow-x-auto'>
              {loading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>加载中...</span>
                </div>
              ) : data.length === 0 ? (
                <div className='text-center py-12 text-muted-foreground'>
                  暂无数据
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='min-w-[80px]'>ID</TableHead>
                      <TableHead className='min-w-[200px]'>敏感词</TableHead>
                      <TableHead className='min-w-[120px]'>风险等级</TableHead>
                      <TableHead className='min-w-[180px]'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className='font-mono text-xs'>
                          {item.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className='font-medium'>
                          {item.word}
                        </TableCell>
                        <TableCell>
                          <Badge className={levelColors[item.level]}>
                            {levelLabels[item.level]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className='h-4 w-4 mr-1' />
                              编辑
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleDelete(item.id, item.word)}
                            >
                              <Trash2 className='h-4 w-4 mr-1' />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* 分页 */}
            {total > 0 && (
              <div className='flex items-center justify-between'>
                <div className='text-sm text-muted-foreground'>
                  共 {total} 条记录，第 {page} / {totalPages} 页
                </div>
                <Pagination className='w-auto ml-auto mr-0'>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (page > 1) {
                            setPage(page - 1);
                          }
                        }}
                        className={
                          page <= 1 ? 'pointer-events-none opacity-50' : ''
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        p =>
                          p === 1 ||
                          p === totalPages ||
                          (p >= page - 2 && p <= page + 2)
                      )
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] < p - 1 && (
                            <PaginationItem>
                              <span className='px-2'>...</span>
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => {
                                setPage(p);
                              }}
                              isActive={p === page}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          if (page < totalPages) {
                            setPage(page + 1);
                          }
                        }}
                        className={
                          page >= totalPages
                            ? 'pointer-events-none opacity-50'
                            : ''
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showDialog}
        onOpenChange={setShowDialog}
        title={editingWord ? '编辑敏感词' : '新增敏感词'}
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='word'>敏感词 *</Label>
              <Input
                id='word'
                value={formData.word}
                onChange={e =>
                  setFormData({ ...formData, word: e.target.value })
                }
                placeholder='请输入敏感词'
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='level'>风险等级 *</Label>
              <Select
                value={formData.level}
                onValueChange={value =>
                  setFormData({ ...formData, level: value as RiskLevel })
                }
              >
                <SelectTrigger id='level'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='suspicious'>可疑</SelectItem>
                  <SelectItem value='high'>高危</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={!formData.word.trim()}>
                保存
              </Button>
            </DialogFooter>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
