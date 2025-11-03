'use client';
import { getAppId, getJiantieApiHost, getUid, request } from '@/services';
import { getWorksMaka } from '@/services/works2';
import { getUrlWithParam } from '@/utils';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
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
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import { WorksItem } from './types';

interface Props {
  update: number;
  limit?: number;
  onSelectItem: (item: WorksItem) => void;
  toEditor: (item: WorksItem) => void;
  showAll?: boolean;

  checkShare: (item: WorksItem) => void;
  changeActiveType: () => void;
}

const H5WorksList = (props: Props) => {
  const { onSelectItem, toEditor, showAll, changeActiveType, checkShare } =
    props;
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [worksList, setWorksList] = useState<WorksItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const t = useTranslations('Profile');
  const appid = getAppId();
  const router = useRouter();
  const [update, setUpdate] = useState(0);
  const loadingRef = useRef(false);

  const getWorksList = async () => {
    if (loadingRef.current) return;

    setLoading(true);
    loadingRef.current = true;
    try {
      const limit = showAll ? 20 : 2;
      let incSpecs = '7ee4c72fe272959de662fff3378e7063';
      let exSpecs = '';
      const res = await getWorksMaka({
        page,
        size: limit,
        incSpecs,
        exSpecs,
        incAnalytics: true,
      });

      setTotal(res?.total || 0);
      if (res?.list) {
        const worksIds = res.list.map((item: any) => item.id);
        const [worksDataList] = await Promise.all([getWorksData(worksIds)]);

        const _list = res.list.map((item: any) => {
          const worksData = worksDataList.find(
            (work: any) => work.works_id === item.id
          );

          return {
            ...item,
            bulletScreenTotal: worksData?.bulletScreenTotal || 0,
            huiZhiTotal: worksData?.huizhiTotal || 0,
          } as WorksItem;
        });
        setWorksList(_list);
        setFinished(_list.length < limit);
        setLoading(false);
      } else {
        setLoading(false);
        setFinished(true);
        loadingRef.current = false;
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const getWorksData = async (worksIds: string[]) => {
    try {
      const res = await request.post(
        `${getJiantieApiHost()}/work-data/forms-by-works`,
        {
          worksIds,
        }
      );
      return res.data;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    getWorksList();
  }, [page, update]);

  useEffect(() => {
    setPage(1);
    setFinished(false);
    setLoading(true);
    setUpdate(update + 1);
  }, [showAll, props.update]);

  const toDataVisible = (item: WorksItem, type: string) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/data-visible/${type}?works_id=${item.id}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        `/mobile/data-visible/${type}?works_id=${item.id}&appid=${appid}`
      );
    }
  };

  const toPreview = (item: WorksItem) => {
    if (item.editor_version === 10) {
      const uid = getUid();
      if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url: `${location.origin}/mobile/preview?works_id=${item.id}&uid=${uid}&is_full_screen=1&back=1`,
          type: 'URL',
        });
      } else {
        router.push(
          getUrlWithParam(
            `/mobile/preview?works_id=${item.id}&uid=${uid}&appid=${appid}`,
            'clickid'
          )
        );
      }
    } else {
      if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url: `${location.origin}/maka/mobile/works-preview?uid=${item.uid}&works_id=${item.id}&is_full_screen=1`,
          type: 'URL',
        });
      } else {
        router.push(
          `/maka/mobile/works-preview?uid=${item.uid}&works_id=${item.id}&appid=${getAppId()}`
        );
      }
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
        <Icon name='link-i406gdda' size={16} />
        H5网页
      </div>
      <div className={styles.listDesc}>
        像网页一样上下滑动，支持报名/定向邀请/数据统计。
      </div>
      <div className='flex flex-col gap-2 mt-2'>
        {/* {list.map((item) => renderH5Item(item))} */}
        {worksList.map(item => (
          <div key={item.id} className={styles.workItem}>
            <div className='flex items-start'>
              <div className={styles.workImg} onClick={() => toPreview(item)}>
                <img
                  alt='1'
                  src={cdnApi(item.thumb, {
                    resizeWidth: 160,
                  })}
                  onError={e => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      'https://img2.maka.im/assets/usual/icon_statistics/maka_icon.jpg';
                  }}
                ></img>
                {item.offline && (
                  <div className={styles.tag}>
                    <Icon name='lock-fill' size={14} color='#fff' />
                  </div>
                )}
              </div>
              <div className={styles.content}>
                <div className={styles.name}>
                  <span className={styles.text}>{item.title}</span>
                </div>
                {/* <p className={styles.ctime}>创建于{dayjs(item.create_time).format('YYYY-MM-DD')}</p> */}
                <div className={styles.datas}>
                  {item.analytics?.map((data, index) => (
                    <div
                      key={index}
                      className={styles.data}
                      onClick={() => {
                        if (APPBridge.judgeIsInApp()) {
                          APPBridge.navToPage({
                            url: data.url,
                            type: 'NATIVE',
                          });
                        } else {
                          router.push(data.url);
                        }
                      }}
                    >
                      {data.text === '浏览' && (
                        <Icon name='preview-fill' size={14} color='#00000073' />
                      )}
                      {data.text === '表单' && (
                        <Icon name='people-fill' size={14} color='#00000073' />
                      )}
                      {data.text === '转发' && (
                        <Icon
                          name='share-one-fill'
                          size={14}
                          color='#00000073'
                        />
                      )}
                      <span className={styles.num}>{data.data || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.btns}>
              <BehaviorBox
                className='flex-1'
                behavior={{
                  object_type: 'works_edit',
                  object_id: item.id,
                  parent_id: 'mine_page',
                }}
              >
                <Button
                  variant='secondary'
                  size='xs'
                  className={styles.btnItem}
                  onClick={() => toEditor(item)}
                >
                  <Icon name='edit' size={16} />
                  {t('edit')}
                </Button>
              </BehaviorBox>

              <BehaviorBox
                className='flex-1'
                behavior={{
                  object_type: 'works_publish',
                  object_id: item.id,
                  parent_id: 'mine_page',
                }}
              >
                <Button
                  variant='secondary'
                  size='xs'
                  className={styles.btnItem}
                  onClick={() => checkShare(item)}
                >
                  <Icon name='share' size={16} />
                  {t('share')}
                </Button>
              </BehaviorBox>
              {item.analytics && (
                <BehaviorBox className='flex-1'>
                  <Button
                    variant='secondary'
                    size='xs'
                    className={styles.btnItem}
                    onClick={() => {
                      if (APPBridge.judgeIsInApp()) {
                        APPBridge.navToPage({
                          url: item.analytics[0].url,
                          type: 'NATIVE',
                        });
                      } else {
                        router.push(item.analytics[0].url);
                      }
                    }}
                  >
                    <Icon name='list-checks' size={16} />
                    数据
                  </Button>
                </BehaviorBox>
              )}

              {item.editor_version === 10 && (
                <>
                  <BehaviorBox className='flex-1'>
                    <Button
                      variant='secondary'
                      size='xs'
                      className={styles.btnItem}
                      onClick={() => toDataVisible(item, 'huizhi')}
                    >
                      <Icon name='person' size={16} />
                      回执
                    </Button>
                  </BehaviorBox>
                  <BehaviorBox className='flex-1'>
                    <Button
                      variant='secondary'
                      size='xs'
                      className={styles.btnItem}
                      onClick={() => toDataVisible(item, 'bulletscreen')}
                    >
                      <Icon name='list-checks' size={16} />
                      留言
                    </Button>
                  </BehaviorBox>
                </>
              )}

              <Button
                variant='secondary'
                size='xs'
                className='px-[7px] h-[28px]'
                onClick={() => {
                  onSelectItem(item);
                }}
              >
                <Icon name='more' size={16} />
              </Button>
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
        <div className={styles.more} onClick={() => changeActiveType()}>
          <span>查看更多({total})</span>
        </div>
      )}
    </>
  );
};
export default H5WorksList;
