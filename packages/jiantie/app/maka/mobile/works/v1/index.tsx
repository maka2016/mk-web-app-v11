'use client';
import {
  checkBindPhone,
  copyWork,
  deleteWork,
  getAppId,
  getStoreCategories,
  getToken,
  getUid,
  searchWorks,
  updateWorks,
} from '@/services';
import { useStore } from '@/store';
import APPBridge from '@mk/app-bridge';
import { API, cdnApi } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import { observer } from 'mobx-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';

import { Switch } from '@workspace/ui/components/switch';

interface Category {
  id: number | string;
  name: string;
}

const Works = () => {
  const router = useRouter();
  const { permissions, userProfile, setBindPhoneShow, setVipShow } = useStore();
  const [list, setList] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState<Category[]>([]);
  const selectedWork = useRef<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [update, setUpdate] = useState(0);

  const [categoryId, setCategoryId] = useState<string | number>('');

  const loadWorks = async () => {
    setLoading(true);
    const params = {
      page,
      page_size: 20,
      store_category_id: categoryId,
    };
    const res = await searchWorks(params);
    if (res.data?.works) {
      setList(page === 0 ? res.data.works : [...list, ...res.data.works]);
      if (res.data.works.length < 20) {
        setFinished(true);
      }
      setLoading(false);
    } else {
      setLoading(false);
      setFinished(true);
    }
  };

  const getAllCategories = async () => {
    const res = await getStoreCategories();
    if (res?.data?.categories) {
      res.data.categories.unshift({
        name: '全部',
        id: '',
      });
      const list = res.data.categories.filter(
        (item: Category) => item.id !== 2149 && item.id !== 6642
      );
      setCategory(list);
    }
  };

  const refreshData = () => {
    setPage(0);
    setLoading(false);
    setFinished(false);
    setUpdate(Date.now());
  };

  const listenAppWebviewShow = () => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    });
  };

  useEffect(() => {
    getAllCategories();
    listenAppWebviewShow();
  }, []);

  useEffect(() => {
    loadWorks();
  }, [categoryId, update, page]);

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setLoading(true);
    setPage(page + 1);
  };

  const onChangeCategoryId = (id: number | string) => {
    setCategoryId(id);
    setPage(0);
    setFinished(false);
    setLoading(false);
    setList([]);
  };

  const onSelectedWork = (item: any) => {
    selectedWork.current = item;
    setShowPopup(true);
  };

  const handleClick = (type: string) => {
    const works = selectedWork.current;
    if (type === 'editor') {
      toEditor(works);
    } else if (type === 'copy') {
      onCopyWorks(works);
    } else if (type === 'delete') {
      onDeleteWorks(works);
    }
    setShowPopup(false);
  };

  const onCopyWorks = async (works: any) => {
    const worksId = works.works_id;
    const res = await copyWork(worksId);
    if (res.data) {
      toast.success('复制成功！');
      setPage(0);
      setLoading(false);
      setFinished(false);

      setUpdate(update + 1);
    } else {
      toast.success('复制失败！');
    }
  };

  const onDeleteWorks = async (works: any) => {
    const res = await deleteWork(works.uid, works.works_id);
    if (res.data) {
      toast.error('删除成功！');
      setPage(0);
      setLoading(false);
      setFinished(false);
      setUpdate(update + 1);
    } else {
      toast.error('删除失败！');
    }
  };

  const changeWorksDetail = async (worksId: string, data: any) => {
    const res = (await updateWorks(
      Object.assign(
        {
          works_id: worksId,
        },
        data
      )
    )) as any;
    if (res.success === 1) {
      toast.success('更新成功');
      setPage(0);
      setLoading(false);
      setFinished(false);
      setUpdate(update + 1);
    } else {
      toast.error(res.error);
    }
  };

  const toEditor = async (works: any) => {
    let url = `${API('根域名')}/editor-wap-v7/?token=${getToken()}&page_id=${works.works_id}&uid=${works.uid}&is_full_screen=1&popEnable=0`;

    if (APPBridge.isRN()) {
      url += '&rn_mode=true';
    }

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      router.push(url);
    }
  };

  const toPreview = (works: any) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/works-preview?uid=${works.uid}&works_id=${works.works_id}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        `/maka/mobile/works-preview?uid=${works.uid}&works_id=${works.works_id}&appid=${getAppId()}`
      );
    }
  };

  const toShare = async (works: any) => {
    const canShare =
      permissions?.tiantianhuodong_sharing ||
      permissions?.H5_wenzhangH5_work_sharing;
    if (!canShare) {
      setVipShow(true, {
        works_id: works.works_id,
        pageType: 'h5',
      });
      return;
    }

    if (!APPBridge.isRN()) {
      const shareUri = `maka://h5Share?workId=${works.works_id}&isVideo=0`;
      APPBridge.navToPage({
        url: shareUri,
        type: 'NATIVE',
      });
    } else {
      const hasBind = await checkBindPhone(works.uid, getAppId());

      if (hasBind) {
        if (APPBridge.judgeIsInApp()) {
          APPBridge.navToPage({
            url: `${location.origin}/maka/mobile/share?works_id=${works.works_id}&uid=${works.uid}&is_full_screen=1`,
            type: 'URL',
          });
        } else {
          router.push(
            `/maka/mobile/share?works_id=${works.works_id}&uid=${works.uid}&appid=${getAppId()}`
          );
        }
      } else {
        setBindPhoneShow(true);
      }
    }
  };

  const toDownload = (works: any) => {
    console.log('works', works);
    if (!permissions?.remove_watermarks) {
      setVipShow(true, {
        works_id: works.works_id,
      });
      return;
    }
    if (APPBridge.judgeIsInApp()) {
      if (APPBridge.isRN()) {
        APPBridge.navToPage({
          url: `${location.origin}/maka/mobile/download?works_id=${works.works_id}&uid=${works.uid}&is_full_screen=1`,
          type: 'URL',
        });
      } else {
        APPBridge.navToPage({
          url: `maka://posterShare?workId=${works.works_id}&width=${works.page_width}&height=${works.page_height}&previewUrl=${`${API(
            '根域名'
          )}/mk-viewer-7/poster/${works.uid}/${works.works_id}`}`,
          type: 'NATIVE',
        });
      }
    } else {
      router.push(
        `/maka/mobile/download?works_id=${works.works_id}&uid=${works.uid}&appid=${getAppId()}`
      );
    }
  };

  const toWorksData = (works: any) => {
    const url = `${API('根域名')}/mk-web-store-v7/mobile/dataVisible?works_id=${works.works_id}&uid=${works.uid}&token=${getToken()}&is_full_screen=1`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
    }
  };

  const formatImageUrl = (url: string) => {
    if (!url.includes('http')) {
      return `${API('资源位服务API')}/${url}`;
    }
    return url;
  };

  const toSearch = () => {
    const url = `/maka/mobile/worksSearch?is_full_screen=1`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${url}`,
        type: 'URL',
      });
    } else {
      location.href = url + '&appid=' + getAppId();
    }
  };

  const toOrder = (works: any) => {
    const url = `${API('根域名')}/mk-store-7/order?uid=${getUid()}&works_id=${works.works_id}&token=${getToken()}&is_full_screen=1`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
    }
  };

  const workItem = (works: any) => {
    return (
      <div key={works.works_id} className={styles.workItem}>
        <div className={styles.workImg} onClick={() => toPreview(works)}>
          <img
            src={cdnApi(works.thumb || works.first_img)}
            alt=''
            className={styles.img}
          />
          <div className={styles.tag}>{works.specName}</div>
        </div>
        <div className={styles.content}>
          <div className='flex flex-col'>
            <p className={styles.title}>{works.title}</p>
            {works.datas ? (
              <div className={styles.data}>
                {works.datas.map((item: any, index: number) => (
                  <div className={styles.dataItem} key={index}>
                    {item.text}
                    <span>{item.data}</span>
                    <Icon name='right' size={12} />
                  </div>
                ))}
              </div>
            ) : (
              <span className={styles.time}>
                创建于{dayjs(works.create_time).format('YYYY-MM-DD')}
              </span>
            )}
          </div>

          <div className={styles.btns}>
            <div className='flex gap-2'>
              <Button
                size='xs'
                variant='outline'
                className='rounded-full'
                onClick={() => toEditor(works)}
              >
                编辑
              </Button>
              {works.datas && (
                <Button
                  size='xs'
                  variant='outline'
                  className='rounded-full'
                  onClick={() => toWorksData(works)}
                >
                  数据
                </Button>
              )}
              {works.type === 'poster' ? (
                <Button
                  size='xs'
                  variant='outline'
                  className='rounded-full'
                  onClick={() => toDownload(works)}
                >
                  下载
                </Button>
              ) : (
                <Button
                  size='xs'
                  variant='outline'
                  className='rounded-full'
                  onClick={() => toShare(works)}
                >
                  分享
                </Button>
              )}
            </div>

            <div className={styles.more} onClick={() => onSelectedWork(works)}>
              <Icon name='ellipsis' />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.works}>
      <div className={styles.head}>
        <span className={styles.tit}>作品</span>
        <Icon name='search' size={20} onClick={() => toSearch()} />
      </div>
      <div className={styles.tabs}>
        {category.map(item => (
          <div
            key={item.id}
            className={cls([
              styles.tabItem,
              categoryId === item.id && styles.active,
            ])}
            onClick={() => onChangeCategoryId(item.id)}
          >
            {item.name}
          </div>
        ))}
      </div>

      <div className='overflow-y-auto flex-1 px-3 py-2'>
        {!list.length && finished ? (
          <div className={styles.worksEmpty}>
            <img
              src='https://res.maka.im/cdn/editor7/material_empty_tip.png'
              alt=''
            />
            <span>你还没有创建任何作品</span>
          </div>
        ) : (
          <InfiniteScroll
            initialLoad={false}
            pageStart={0}
            useWindow={false}
            className={styles.worksList}
            loadMore={loadMore}
            hasMore={!finished}
          >
            {list.map(item => {
              return workItem(item);
            })}
          </InfiniteScroll>
        )}
        {loading && (
          <div className='flex align-center justify-center p-2'>
            <Loading></Loading>
          </div>
        )}
      </div>
      <ResponsiveDialog
        isOpen={showPopup}
        onOpenChange={setShowPopup}
        className={styles.worksPopup}
      >
        <div className={styles.settingPanel}>
          <div className={styles.head}>
            <div className={styles.cover}>
              <img
                src={formatImageUrl(
                  selectedWork.current?.thumb ||
                    selectedWork.current?.first_img ||
                    ''
                )}
                alt=''
                className={styles.img}
              />
            </div>
            <div className='flex-1 overflow-hidden'>
              <div className={styles.title}>
                <span>{selectedWork.current?.title}</span>
                <Icon
                  name='edit'
                  size={18}
                  onClick={() => {
                    setRenameOpen(true);
                    setShowPopup(false);
                  }}
                />
              </div>
              <div className={styles.desc}>
                创建于{' '}
                {dayjs(selectedWork.current?.create_time).format(
                  'YYYY.MM.DD HH:mm'
                )}
              </div>
            </div>
          </div>
          <div
            className={styles.settingItem}
            onClick={() => handleClick('editor')}
          >
            <Icon name='edit' size={16} />
            <span className={styles.text}>编辑</span>
          </div>
          <div
            className={styles.settingItem}
            onClick={() => toShare(selectedWork.current)}
          >
            <Icon name='workshare' size={16} />
            <span className={styles.text}>
              {selectedWork.current?.type === 'poster' ? '下载' : '分享'}
            </span>
          </div>

          {selectedWork.current?.type === 'poster' && (
            <div
              className={styles.settingItem}
              onClick={() => toShare(selectedWork.current)}
            >
              <Icon name='ad' size={16} />
              <span className={styles.text}>去水印</span>
            </div>
          )}

          {selectedWork.current?.datas && (
            <>
              <div
                className={styles.settingItem}
                onClick={() => toWorksData(selectedWork.current)}
              >
                <Icon name='chart-line' size={16} />
                <span className={styles.text}>传播数据</span>
              </div>
              <div
                className={styles.settingItem}
                onClick={() => toWorksData(selectedWork.current)}
              >
                <Icon name='doc-success' size={16} />
                <span className={styles.text}>表单</span>
              </div>
              <div
                className={styles.settingItem}
                onClick={() => toOrder(selectedWork.current)}
              >
                <Icon name='form-fill' size={16} />
                <span className={styles.text}>订单</span>
              </div>
            </>
          )}

          {selectedWork.current?.type !== 'poster' && (
            <div className={cls([styles.settingItem, 'justify-between'])}>
              <div className='flex items-center gap-2'>
                <Icon name='online' size={16}></Icon>
                <span className={styles.text}>上线</span>
              </div>
              <Switch
                checked={selectedWork.current?.status !== '-1'}
                onCheckedChange={async checked => {
                  changeWorksDetail(
                    selectedWork.current?.works_id,
                    checked ? 1 : -1
                  );
                }}
              />
            </div>
          )}
          <div
            className={styles.settingItem}
            onClick={() => handleClick('copy')}
          >
            <Icon name='copy' size={16}></Icon>
            <span className={styles.text}>复制</span>
          </div>
          <div
            className={styles.settingItem}
            onClick={() => handleClick('delete')}
          >
            <Icon name='delete' size={16}></Icon>
            <span className={styles.text}>删除</span>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog isOpen={renameOpen} onOpenChange={setRenameOpen}>
        <div className={styles.renamePanel}>
          <div className={styles.title}>重命名</div>
          <div className={styles.input}>
            <input
              defaultValue={selectedWork.current?.title}
              placeholder='请输入作品名称'
              onChange={e => {
                setRenameInput(e.target.value);
              }}
            />
          </div>
          <div className={styles.btns}>
            <Button
              className='rounded-full flex-1'
              variant='outline'
              size='lg'
              onClick={() => {
                setRenameOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              className='rounded-full flex-1'
              size='lg'
              onClick={() => {
                // updateWorksTitle();
                changeWorksDetail(selectedWork.current?.works_id, {
                  title: renameInput,
                });
                setRenameOpen(false);
              }}
            >
              确定
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default observer(Works);
