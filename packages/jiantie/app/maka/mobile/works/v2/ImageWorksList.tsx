'use client';
import { getAppId } from '@/services';
import { getWorksMaka, updateWorksDetail2 } from '@/services/works2';
import { cdnApi } from '@mk/services';
import { onScreenShot } from '@mk/widgets/GridV3/shared';
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
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import { WorksItem } from './types';

interface Props {
  update: number;
  limit?: number;
  onSelectItem: (item: WorksItem) => void;
  toEditor: (item: WorksItem) => void;
  showAll: boolean;
  changeActiveType: () => void;
  specInfo: any;
}

const ImageWorksList = (props: Props) => {
  const { onSelectItem, toEditor, showAll, changeActiveType, specInfo } = props;
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [worksList, setImageWorksList] = useState<WorksItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [update, setUpdate] = useState(0);
  const loadingRef = useRef(false);
  const searchParams = useSearchParams();
  const isDesigner = !!searchParams.get('designer_tool');
  const [updatingCover, setUpdatingCover] = useState<Record<string, boolean>>(
    {}
  );

  const getImageWorksList = async () => {
    if (loadingRef.current) return;

    setLoading(true);
    loadingRef.current = true;

    try {
      const limit = showAll ? 20 : 2;
      let incSpecs = '';
      let exSpecs = '7ee4c72fe272959de662fff3378e7063';

      const res = await getWorksMaka({
        page,
        size: limit,
        incSpecs,
        exSpecs,
      });

      setTotal(res?.total || 0);
      if (res?.list) {
        const _list = res.list as WorksItem[];
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
    setFinished(false);
    setLoading(true);
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
      updateWorksDetail2(worksId, {
        cover: screenshotRes[0],
      } as any);
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

  const totalPages = Math.ceil(total / (showAll ? 20 : 2));

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
            onClick={() => toEditor(item)}
          >
            <div className={styles.coverContainer}>
              <img
                className={styles.cover}
                alt={item.title}
                src={cdnApi(item.cover, {
                  resizeWidth: 160,
                })}
                loading='lazy'
                onError={e => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    'https://img2.maka.im/assets/usual/icon_statistics/maka_icon.jpg';
                }}
              ></img>
              {item?.spec?.name && (
                <div className={styles.spec}>{item?.spec?.name}</div>
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
