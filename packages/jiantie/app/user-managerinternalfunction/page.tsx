'use client';

import { trpcWorks, type SerializedWorksEntity } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Loader2, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function UserManagerInternalFunctionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uid, setUid] = useState<string>('');
  const [worksList, setWorksList] = useState<SerializedWorksEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [pageSize] = useState<number>(10);

  const loadWorks = useCallback(
    async (currentPage: number = 1) => {
      if (!uid.trim()) {
        return;
      }

      setLoading(true);
      try {
        const result = await trpcWorks.findMany({
          deleted: false,
          is_folder: false,
          take: pageSize,
          skip: (currentPage - 1) * pageSize,
        });
        console.log('result', result);
        setWorksList(result);
        setTotal(result.length);
        setPage(currentPage);
      } catch (error) {
        console.error('Failed to load works:', error);
      } finally {
        setLoading(false);
      }
    },
    [uid, pageSize]
  );

  // 同步uid到URL
  const updateUrl = (newUid: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newUid.trim()) {
      params.set('uid', newUid.trim());
    } else {
      params.delete('uid');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // 从URL获取uid参数
  useEffect(() => {
    const urlUid = searchParams.get('uid');
    if (urlUid) {
      setUid(urlUid);
      // 如果URL中有uid参数，自动执行搜索
      loadWorks(1);
    }
  }, [searchParams, loadWorks]);

  const handleSearch = () => {
    if (uid.trim()) {
      loadWorks(1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusText = (works: SerializedWorksEntity) => {
    if (works.deleted) return '已删除';
    if (works.offline) return '已下线';
    if (works.is_paied) return '已付费';
    return '正常';
  };

  const getStatusColor = (works: SerializedWorksEntity) => {
    if (works.deleted) return 'text-red-500';
    if (works.offline) return 'text-orange-500';
    if (works.is_paied) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='text-xl font-semibold'>用户作品管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-4 items-end'>
            <div className='flex-1'>
              <label
                htmlFor='uid'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                用户ID (UID)
              </label>
              <Input
                id='uid'
                type='text'
                placeholder='请输入用户ID'
                value={uid}
                onChange={e => {
                  const newUid = e.target.value;
                  setUid(newUid);
                  updateUrl(newUid);
                }}
                onKeyPress={handleKeyPress}
                className='h-8'
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !uid.trim()}
              className='h-8 px-4'
            >
              {loading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Search className='h-4 w-4' />
              )}
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {worksList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-medium'>
              作品列表 (共 {total} 个作品)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-16'>封面</TableHead>
                    <TableHead className='min-w-48'>标题</TableHead>
                    <TableHead className='min-w-32'>描述</TableHead>
                    <TableHead className='w-24'>状态</TableHead>
                    <TableHead className='w-32'>创建时间</TableHead>
                    <TableHead className='w-32'>更新时间</TableHead>
                    <TableHead className='w-20'>版本</TableHead>
                    <TableHead className='w-24'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worksList.map(works => (
                    <TableRow key={works.id}>
                      <TableCell>
                        {works.cover ? (
                          <img
                            src={works.cover}
                            alt={works.title}
                            className='w-12 h-12 object-cover rounded'
                            onError={e => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <div className='w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs'>
                            无封面
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className='max-w-48'>
                          <div
                            className='font-medium truncate'
                            title={works.title}
                          >
                            {works.title}
                          </div>
                          <div className='text-sm text-gray-500 truncate'>
                            ID: {works.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className='max-w-32 truncate text-sm text-gray-600'
                          title={works.desc || ''}
                        >
                          {works.desc || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${getStatusColor(works)}`}>
                          {getStatusText(works)}
                        </span>
                      </TableCell>
                      <TableCell className='text-sm text-gray-600'>
                        {formatDate(works.create_time)}
                      </TableCell>
                      <TableCell className='text-sm text-gray-600'>
                        {formatDate(works.update_time)}
                      </TableCell>
                      <TableCell className='text-sm text-gray-600'>
                        v{works.version}
                      </TableCell>
                      <TableCell>
                        <div className='flex gap-1'>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-6 px-2 text-xs'
                            onClick={() =>
                              window.open(
                                `/editor?works_id=${works.id}&uid=${uid}&no_save=1`,
                                '_blank'
                              )
                            }
                          >
                            编辑器
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {total > pageSize && (
              <div className='flex justify-center items-center gap-2 mt-4'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page === 1 || loading}
                  onClick={() => loadWorks(page - 1)}
                  className='h-8'
                >
                  上一页
                </Button>
                <span className='text-sm text-gray-600'>
                  第 {page} 页，共 {Math.ceil(total / pageSize)} 页
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page >= Math.ceil(total / pageSize) || loading}
                  onClick={() => loadWorks(page + 1)}
                  className='h-8'
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uid && !loading && worksList.length === 0 && (
        <Card>
          <CardContent className='text-center py-12'>
            <div className='text-gray-500'>
              <Search className='h-12 w-12 mx-auto mb-4 text-gray-300' />
              <p>未找到该用户的作品</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
