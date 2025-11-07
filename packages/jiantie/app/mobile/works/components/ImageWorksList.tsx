'use client';
import { onScreenShot } from '@/components/GridV3/shared';
import { getAppId, request } from '@/services';
import { useStore } from '@/store';
import { trpc, trpcWorks } from '@/utils/trpc';
import { API, cdnApi } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import { WorksItem } from './types';

interface Props {
  update: number;
  limit?: number;
  onSelectItem: (item: WorksItem) => void;
  toEditor: (works_id: string) => void;
  showAll: boolean;
  changeActiveType: () => void;
  specInfo: any;
}

const ImageWorksList = (props: Props) => {
  const { onSelectItem, toEditor, showAll, changeActiveType, specInfo } = props;
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(true);
  const [worksList, setImageWorksList] = useState<WorksItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [update, setUpdate] = useState(0);
  const { permissions } = useStore();
  const loadingRef = useRef(false);
  const searchParams = useSearchParams();
  const isDesigner = !!searchParams.get('designer_tool');
  const [updatingCover, setUpdatingCover] = useState<Record<string, boolean>>(
    {}
  );

  const getPurchasedWorks = async (worksIds: string[]) => {
    const res = await request.get(
      `${API('apiv10')}/user-resources?type=purchased&resourceIds=${worksIds}`
    );
    return res.data as Array<{
      expiryDate: string | null;
      resourceId: string;
    }>;
  };

  const getImageWorksList = async () => {
    if (loadingRef.current) return;

    setLoading(true);
    loadingRef.current = true;

    try {
      const limit = showAll ? 10 : 2;
      const skip = (page - 1) * limit;

      // H5 网页类型的 spec_id
      const H5_SPEC_ID = '7ee4c72fe272959de662fff3378e7063';

      // 获取作品列表和总数（排除 H5 网页类型）
      const [list, count] = await Promise.all([
        trpcWorks.findMany({
          deleted: false,
          spec_id_not: H5_SPEC_ID,
          take: limit,
          skip,
        }),
        trpcWorks.count({
          deleted: false,
          spec_id_not: H5_SPEC_ID,
        }),
      ]);

      setTotal(count || 0);
      if (list.length > 0) {
        const worksIds = list.map((item: any) => item.id);
        const [purchasedWorks] = await Promise.all([
          getPurchasedWorks(worksIds),
        ]);

        const _list = list.map((item: any) => {
          const purchased = purchasedWorks.find(
            (work: any) => work.resourceId === item.id
          );

          return {
            ...item,
            expiryDate: purchased?.expiryDate || '',
            isPurchased: !!purchased,
            purchaseType:
              !!purchased && dayjs(purchased.expiryDate).isAfter(dayjs())
                ? 'valid'
                : !purchased
                  ? 'invalid'
                  : 'expired',
          } as WorksItem;
        });
        setImageWorksList(_list);
        setFinished(_list.length < limit);
      } else {
        setFinished(true);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    getImageWorksList();
  }, [page, update]);

  useEffect(() => {
    setPage(1);
    setFinished(true);
    setLoading(false);
    setUpdate(update + 1);
  }, [showAll, props.update]);

  const updateCover = async (worksId: string) => {
    if (updatingCover[worksId]) return;
    setUpdatingCover(prev => ({ ...prev, [worksId]: true }));
    const appid = getAppId();
    try {
      const screenshotRes = await onScreenShot({
        id: worksId,
        width: 375,
        height: 375,
        appid,
      });
      await trpc.works.update.mutate({
        id: worksId,
        cover: screenshotRes[0],
      });
      setImageWorksList(
        worksList.map(item => {
          if (item.id === worksId) {
            return {
              ...item,
              cover: screenshotRes[0],
            };
          }
          return item;
        })
      );
    } finally {
      setUpdatingCover(prev => ({ ...prev, [worksId]: false }));
    }
  };

  const totalPages = Math.ceil(total / (showAll ? 10 : 2));

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              isActive={page === i}
              onClick={() => !loading && setPage(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink
            isActive={page === 1}
            onClick={() => !loading && setPage(1)}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (page > 3) {
        pages.push(
          <PaginationItem key='ellipsis-1'>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink
              isActive={page === i}
              onClick={() => !loading && setPage(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (page < totalPages - 2) {
        pages.push(
          <PaginationItem key='ellipsis-2'>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            isActive={page === totalPages}
            onClick={() => !loading && setPage(totalPages)}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pages;
  };

  return (
    <>
      <div className={styles.listTitle}>
        <Icon name='pic' size={16} />
        图片&视频
      </div>
      <div className={styles.listDesc}>
        单张海报或短视频，适配社交平台，快速传播核心信息。
      </div>
      <div className='gap-2 grid grid-cols-2 mt-2'>
        {worksList.map(item => (
          <div
            key={item.id}
            className={styles.imageItem}
            onClick={() => toEditor(item.id)}
          >
            {item.purchaseType === 'valid' && (
              <div className={styles.workCornerValid}>已购</div>
            )}

            {item.purchaseType === 'expired' && (
              <div className={styles.workCornerExpired}>过期</div>
            )}
            <div className={styles.coverContainer}>
              <img
                className={styles.cover}
                alt={item.title}
                src={cdnApi(item.cover, {
                  resizeWidth: 160,
                })}
                loading='lazy'
              ></img>
              {specInfo[item.spec_id] && (
                <div className={styles.spec}>
                  {specInfo[item.spec_id]?.display_name}
                </div>
              )}
            </div>

            <div className={styles.name}>{item.title}</div>

            {isDesigner && (
              <Button
                className={styles.updateCover}
                variant='outline'
                size='xs'
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateCover(item.id);
                }}
                disabled={!!updatingCover[item.id]}
              >
                {updatingCover[item.id] ? '更新中...' : '更新封面'}
              </Button>
            )}
            <div
              className={styles.setting}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onSelectItem(item);
              }}
            >
              <Icon name='more-ga3j8jod' size={24} />
            </div>
          </div>
        ))}
      </div>
      {loading && showAll && (
        <div className='flex justify-center p-2'>
          <Loading />
        </div>
      )}
      {finished && !loading && worksList.length === 0 && (
        <div
          className={styles.empty}
          style={{
            marginTop: showAll ? 120 : 0,
          }}
        >
          <img src={cdnApi('/cdn/webstore10/education/empty.png')} alt='' />
          <span>暂无记录</span>
        </div>
      )}
      {showAll && totalPages > 1 && !loading && (
        <Pagination className='justify-center mt-4'>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && !loading && setPage(page - 1)}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {renderPageNumbers()}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  page < totalPages && !loading && setPage(page + 1)
                }
                className={
                  page === totalPages ? 'pointer-events-none opacity-50' : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {!showAll && total > 0 && (
        <div
          className={styles.more}
          onClick={() => {
            changeActiveType();
          }}
        >
          <span>查看更多({total})</span>
        </div>
      )}
      {!showAll && <div className='mb-5'></div>}
    </>
  );
};
export default ImageWorksList;
