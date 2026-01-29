'use client';
import { useEffect, useState } from 'react';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import {
  cdnApi,
  deleteRecycleBin,
  getRecycleBin,
  moveRecycleBin,
} from '@/services';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Loading } from '@workspace/ui/components/loading';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';

interface Work {
  thumb: string;
  works_id: string;
  uid: number;
  title: string;
  left_days_text: string;
  left_days: number;
}

const PAGE_SIZE = 30;

const RecycleBin = () => {
  const [selections, setSelections] = useState<string[]>([]);
  const [list, setList] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [batchMode, setBatchMode] = useState(false);
  const [finished, setFinished] = useState(false);

  const getRecycleBinWorks = async () => {
    setLoading(true);
    const res = await getRecycleBin({ page, pageSize: PAGE_SIZE });
    setList(page === 0 ? res.data.works : [...list, ...res.data.works]);
    setLoading(false);
    setFinished(res.data.works.length < PAGE_SIZE);
  };

  useEffect(() => {
    getRecycleBinWorks();
  }, [page]);

  const onSelectAll = () => {
    if (list.length === selections.length) {
      setSelections([]);
    } else {
      setSelections(list.map(item => item.works_id));
    }
  };

  const onCheckedChange = (id: string) => {
    if (selections.includes(id)) {
      setSelections(selections.filter(item => item !== id));
    } else {
      setSelections([...selections, id]);
    }
  };

  const onDeleteWorks = async (ids: string[]) => {
    const res = (await deleteRecycleBin(ids)) as any;
    if (res.resultCode === 0) {
      toast.success('删除成功');
      getRecycleBinWorks();
      setSelections([]);
    } else {
      toast.error(res.error);
    }
  };

  const onMoveWorks = async (ids: string[]) => {
    const res = (await moveRecycleBin(ids)) as any;
    if (res.resultCode === 0) {
      toast.success('恢复作品成功');
      getRecycleBinWorks();
      setSelections([]);
    } else {
      toast.error(res.error);
    }
  };

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setPage(page + 1);
  };

  return (
    <div className='flex flex-col h-full bg-white'>
      <MobileHeader title='回收站' />

      {/* 内容区域 */}
      <div className='flex-1 overflow-y-auto' id='worksList'>
        {!loading && list.length === 0 && finished && (
          <div className='flex flex-col items-center justify-center py-16 text-gray-400'>
            <img
              src='https://img2.maka.im/cdn/editor7/material_empty_tip.png'
              width={120}
              height={72}
              alt='你删除的作品都会出现在这里'
            />
            <span className='mt-2'>你删除的作品都会出现在这里</span>
          </div>
        )}

        <InfiniteScroll
          initialLoad={false}
          hasMore={!finished}
          loadMore={loadMore}
          useWindow={false}
        >
          {list.map(work => (
            <div
              key={work.works_id}
              className='flex items-center p-3 border-b relative'
            >
              <div className='w-20 h-20 flex-shrink-0 rounded overflow-hidden'>
                <img
                  src={cdnApi(work.thumb, {
                    resizeWidth: 400,
                  })}
                  width={80}
                  height={80}
                  alt=''
                  className='w-full h-full object-cover'
                />
              </div>

              {/* 信息 */}
              <div className='flex-1 ml-3 flex flex-col gap-2 overflow-hidden'>
                <p className='font-medium text-sm overflow-hidden whitespace-nowrap text-ellipsis'>
                  {work.title}
                </p>
                <p className='text-xs text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis'>
                  {work.left_days_text}
                </p>
                {!batchMode && (
                  <div className='flex items-end gap-1'>
                    <Button
                      size='xs'
                      variant='outline'
                      onClick={() => onMoveWorks([work.works_id])}
                    >
                      恢复
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size='xs' variant='outline'>
                          删除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className='w-[320px]'>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            确定要永久删除作品吗
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            永久删除的作品将不可再恢复
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className='rounded-full'>
                            取消
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className='rounded-full'
                            onClick={() => onDeleteWorks([work.works_id])}
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              {batchMode && (
                <Checkbox
                  checked={selections.includes(work.works_id)}
                  onCheckedChange={() => onCheckedChange(work.works_id)}
                />
              )}
            </div>
          ))}
        </InfiniteScroll>
        {loading && (
          <div className='flex items-center justify-center'>
            <Loading />
          </div>
        )}
      </div>

      {/* 底部批量操作栏 */}
      {batchMode && (
        <div className='p-3 border-t bg-white flex items-center justify-between'>
          <div className='flex items-center'>
            <span className='ml-2 text-sm'>
              已选 {selections.length} 个作品
            </span>
          </div>
          <div className='flex gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={selections.length === 0}
              onClick={() => onMoveWorks(selections)}
            >
              恢复
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={selections.length === 0}
                >
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className='w-[320px]'>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定要永久删除作品吗</AlertDialogTitle>
                  <AlertDialogDescription>
                    永久删除的作品将不可再恢复
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className='rounded-full'>
                    取消
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className='rounded-full'
                    onClick={() => onDeleteWorks(selections)}
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => {
                setBatchMode(false);
                setSelections([]);
              }}
            >
              完成
            </Button>
          </div>
        </div>
      )}

      {!batchMode && list.length > 0 && (
        <div className='p-3 border-t bg-white'>
          <Button
            className='w-full'
            size='sm'
            variant='outline'
            onClick={() => setBatchMode(true)}
          >
            批量管理
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;
