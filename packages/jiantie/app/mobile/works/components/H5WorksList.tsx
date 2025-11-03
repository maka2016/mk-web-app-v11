'use client';
import {
  getAppId,
  getJiantieApiHost,
  getUid,
  request,
  worksServerV2,
} from '@/services';
import { useStore } from '@/store';
import { getUrlWithParam } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { API, cdnApi } from '@mk/services';
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
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import { WorksItem } from './types';

interface Props {
  update: number;
  limit?: number;
  onSelectItem: (item: WorksItem) => void;
  toEditor: (works_id: string) => void;
  showAll?: boolean;
  changeActiveType: () => void;
}

const H5WorksList = (props: Props) => {
  const { onSelectItem, toEditor, showAll, changeActiveType } = props;
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(true);
  const [worksList, setWorksList] = useState<WorksItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const t = useTranslations('Profile');
  const appid = getAppId();
  const { isVip, customerVips, permissions } = useStore();
  const router = useRouter();
  const [update, setUpdate] = useState(0);
  const loadingRef = useRef(false);
  const { canShareWithoutWatermark } = useCheckPublish();
  const { toShare } = useShareNavigation();

  const getPurchasedWorks = async (worksIds: string[]) => {
    const res = await request.get(
      `${API('apiv10')}/user-resources?type=purchased&resourceIds=${worksIds}`
    );
    return res.data as Array<{
      expiryDate: string | null;
      resourceId: string;
    }>;
  };

  const getWorksList = async () => {
    if (loadingRef.current) return;

    setLoading(true);
    loadingRef.current = true;
    try {
      const limit = showAll ? 10 : 2;
      const skip = (page - 1) * limit;

      // H5 网页类型的 spec_id
      const H5_SPEC_ID = '7ee4c72fe272959de662fff3378e7063';

      // 获取作品列表和总数（在 API 层面过滤规格）
      const [list, count] = await Promise.all([
        trpc.works.findMany.query({
          deleted: false,
          spec_id: H5_SPEC_ID,
          take: limit,
          skip,
        }),
        trpc.works.count.query({
          deleted: false,
          spec_id: H5_SPEC_ID,
        }),
      ]);

      setTotal(count || 0);
      if (list.length > 0) {
        const worksIds = list.map((item: any) => item.id);
        const [purchasedWorks, worksDataList] = await Promise.all([
          getPurchasedWorks(worksIds),
          getWorksData(worksIds),
          // getBoostData(worksIds),
        ]);

        const _list = list.map((item: any) => {
          const purchased = purchasedWorks.find(
            (work: any) => work.resourceId === item.id
          );
          const worksData = worksDataList.find(
            (work: any) => work.works_id === item.id
          );

          return {
            ...item,

            expiryDate: purchased?.expiryDate || '',
            isPurchased: !!purchased,
            bulletScreenTotal: worksData?.bulletScreenTotal || 0,
            huiZhiTotal: worksData?.huizhiTotal || 0,
            pintuanTotal: worksData?.pintuanTotal || 0,
            MkBaoMingV2: worksData?.MkBaoMingV2 || 0,
            // boostTotal: boostData?.[item.id] || 0,
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

  const getBoostData = async (worksIds: string[]) => {
    if (appid !== 'xueji') {
      return {};
    }
    const res = await request.post(
      `${worksServerV2()}/boost-activity/sub-activity/count-by-works`,
      {
        worksIds,
      }
    );
    return res as unknown as Record<string, number>;
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
    setFinished(true);
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
  };

  const checkPublish = async (works: WorksItem) => {
    const canShare = await canShareWithoutWatermark(works.id);
    if (canShare) {
      toShare(works.id);
    } else {
      toVipPage({
        works_id: works.id,
        ref_object_id: works.template_id,
        tab: appid === 'xueji' ? 'business' : 'personal',
        vipType: 'h5',
      });
    }
  };

  const toInvite = (item: WorksItem) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/targeted-invitation?works_id=${item.id}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/mobile/targeted-invitation?works_id=${item.id}&appid=${appid}`,
          'clickid'
        )
      );
    }
  };

  const renderStatus = (item: WorksItem) => {
    if (appid === 'huiyao') {
      return <></>;
    }

    if (!item.isPurchased) {
      return <></>;
    }

    if (item.isPurchased) {
      if (!item.expiryDate) {
        return <div className={styles.purchased}>{t('permanent')}</div>;
      }

      if (dayjs(item.expiryDate).isAfter(dayjs())) {
        return (
          <div className={styles.purchased}>
            {t('expires')}
            {dayjs(item.expiryDate).format('YYYY.MM.DD')}
          </div>
        );
      }
      return <div className={styles.tag}>{t('expired')}</div>;
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
                  src={cdnApi(item.cover, {
                    resizeWidth: 160,
                  })}
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
                <div className={styles.datas}>
                  {item.analytics?.map((data, index) => (
                    <div key={index} className={styles.data}>
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
                <p className={styles.ctime}>{renderStatus(item)}</p>
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
                  onClick={() => toEditor(item.id)}
                >
                  <Icon name='edit' size={16} />
                  {t('edit')}
                </Button>
              </BehaviorBox>
              {appid === 'xueji' && (
                <>
                  <BehaviorBox
                    className='flex-1'
                    behavior={{
                      object_type: 'works_pintuan',
                      object_id: item.id,
                      parent_id: 'mine_page',
                    }}
                  >
                    <Button
                      variant='secondary'
                      size='xs'
                      className={styles.btnItem}
                      onClick={() => toDataVisible(item, 'pintuan')}
                    >
                      {/* <Icon name="list-checks" size={16} /> */}
                      报名
                    </Button>
                  </BehaviorBox>
                  <BehaviorBox
                    className='flex-1'
                    behavior={{
                      object_type: 'works_zhuli',
                      object_id: item.id,
                      parent_id: 'mine_page',
                    }}
                  >
                    <Button
                      variant='secondary'
                      size='xs'
                      className={styles.btnItem}
                      onClick={() => toDataVisible(item, 'boost')}
                    >
                      {/* <Icon name="person" size={16} /> */}
                      集赞
                    </Button>
                  </BehaviorBox>
                  <BehaviorBox
                    className='flex-1'
                    behavior={{
                      object_type: 'works_groupbuy',
                      object_id: item.id,
                      parent_id: 'mine_page',
                    }}
                  >
                    <Button
                      variant='secondary'
                      size='xs'
                      className={styles.btnItem}
                      onClick={() => toDataVisible(item, 'groupbuy')}
                    >
                      {/* <Icon name="team" size={16} /> */}
                      拼团
                    </Button>
                  </BehaviorBox>
                </>
              )}
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
                  onClick={() => checkPublish(item)}
                >
                  <Icon name='share' size={16} />
                  {t('share')}
                </Button>
              </BehaviorBox>
              {appid === 'huiyao' && (
                <BehaviorBox
                  className='flex-1'
                  behavior={{
                    object_type: 'works_invite',
                    object_id: item.id,
                    parent_id: 'mine_page',
                  }}
                >
                  <Button
                    variant='secondary'
                    size='xs'
                    className={styles.btnItem}
                    onClick={() => toInvite(item)}
                  >
                    <Icon name='person' size={16} />
                    邀请
                  </Button>
                </BehaviorBox>
              )}

              {appid === 'huiyao' && (
                <BehaviorBox
                  className='flex-1'
                  behavior={{
                    object_type: 'works_baoming',
                    object_id: item.id,
                    parent_id: 'mine_page',
                  }}
                >
                  <Button
                    variant='secondary'
                    size='xs'
                    className={styles.btnItem}
                    onClick={() => toDataVisible(item, 'baoming')}
                  >
                    <Icon name='list-checks' size={16} />
                    报名
                  </Button>
                </BehaviorBox>
              )}

              {appid === 'jiantie' && (
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
