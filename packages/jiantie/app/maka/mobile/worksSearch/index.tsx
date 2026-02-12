'use client';
import {
  API,
  cdnApi,
  checkBindPhone,
  copyWork,
  deleteWork,
  getAppId,
  getToken,
  getUid,
  searchWorks,
  updateWorks,
} from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { toVipPage } from '@/utils/jiantie';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Switch } from '@workspace/ui/components/switch';
import { cn } from '@workspace/ui/lib/utils';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';

interface IWorks {
  title: string;
  uid: string;
  works_id: string;
  specName: string;
  thumb: string;
  firstImg: string;
  status: string;
  datas: {
    data: string;
    text: string;
  }[];
  template_id: string;
  editor_version: number;
  create_time: string;
  type: string;
}

const PAGE_SIZE = 30;

const Home = () => {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [list, setList] = useState<IWorks[]>([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [value, setValue] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [update, setUpdate] = useState(0);

  const selectedWork = useRef<IWorks>(null);
  const { permissions, setBindPhoneShow } = useStore();

  const searchWorksList = async () => {
    setLoading(true);
    const uid = getUid();
    const res = (await searchWorks({
      uid,
      page,
      page_size: PAGE_SIZE,
      title: keyword,
    })) as any;
    if (res.data.works) {
      setList(page === 0 ? res.data.works : list.concat(res.data.works));
      setFinished(res.data.works.length < PAGE_SIZE);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keyword) {
      searchWorksList();
    }
  }, [page, keyword, update]);

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setLoading(true);
    setPage(page + 1);
  };

  const toEditor = async (works: IWorks) => {
    if (works.editor_version === 7) {
      // MAKA作品
      let url = `${API('根域名')}/editor-wap-v7/?token=${getToken()}&page_id=${works.works_id}&uid=${works.uid}&is_full_screen=1&popEnable=0`;
      console.log('url', url);
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
    } else {
      toast.error('抱歉，该作品只支持在电脑浏览器内编辑。');
    }
  };

  const toPreview = (works: IWorks) => {
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

  const toShare = async (works: IWorks) => {
    if (!works) return;
    const canShare =
      permissions?.tiantianhuodong_sharing ||
      permissions?.H5_wenzhangH5_work_sharing;
    if (!canShare) {
      toVipPage({
        works_id: works.works_id,
        ref_object_id: works.template_id,
        tab: 'personal',
        vipType: 'h5',
        editor_version: works.editor_version, // 兼容maka会员页
      });
      return;
    }
    if (APPBridge.judgeIsInApp() && !APPBridge.isRN()) {
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
    if (!permissions?.remove_watermarks) {
      toVipPage({
        works_id: works.works_id,
        ref_object_id: works.template_id,
        editor_version: works.editor_version, // 兼容maka会员页
      });
      return;
    }
    if (APPBridge.judgeIsInApp()) {
      if (APPBridge.isRN()) {
        APPBridge.navToPage({
          url: `${location.origin}/maka/mobile/download?works_id=${works.id}&uid=${works.uid}&is_full_screen=1`,
          type: 'URL',
        });
      } else {
        APPBridge.navToPage({
          url: `maka://posterShare?workId=${works.id}&width=${works.spec.width}&height=${works.spec.height}&previewUrl=${`${API(
            '根域名'
          )}/mk-viewer-7/poster/${works.uid}/${works.id}`}`,
          type: 'NATIVE',
        });
      }
    } else {
      router.push(
        `/maka/mobile/download?works_id=${works.id}&uid=${works.uid}&appid=${getAppId()}`
      );
    }
  };

  const toWorksData = (works: any) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: works.datas[0].url,
        type: 'NATIVE',
      });
    } else {
      router.push(works.datas[0].url);
    }
  };

  const onCancel = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      router.back();
    }
  };

  const handleEnterPress = (e: any) => {
    if (e.key === 'Enter') {
      setPage(0);
      setFinished(false);
      setKeyword(e.target.value);
      setList([]);
      if (e.target.value) {
        setLoading(true);
      }
    }
  };

  const onSelectedWork = (item: any) => {
    selectedWork.current = item;
    setShowPopup(true);
  };

  const onCopyWorks = async (works: any) => {
    const worksId = works.works_id;
    const res = await copyWork(worksId);
    if (res.data) {
      list.unshift(
        Object.assign({}, works, res.data, { form_num: 0, view_num: 0 })
      );
      setList([...list]);
      toast.success('复制成功！');
    } else {
      toast.error('复制失败！');
    }
  };

  const onDeleteWorks = async (works: any) => {
    const res = await deleteWork(works.uid, works.works_id);
    if (res.data) {
      const newList = list.filter(item => item.works_id !== works.works_id);
      setList(newList);
      toast.success('删除成功！');
    } else {
      toast.error('删除失败！');
    }
  };

  const handleClick = (type: string) => {
    const works = selectedWork.current;
    if (!works) return;
    if (type === 'editor') {
      toEditor(works);
    } else if (type === 'copy') {
      onCopyWorks(works);
    } else if (type === 'delete') {
      onDeleteWorks(works);
    }
    setShowPopup(false);
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

  const updateWorksTitle = async (works: IWorks) => {
    await changeWorksDetail(works.works_id, {
      title: renameInput,
    });
    setRenameOpen(false);
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
                {works.datas.map((data: any, index: number) => (
                  <div
                    className={styles.dataItem}
                    key={index}
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
                    {data.text}
                    <span>{data.data}</span>
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
      <div className={styles.search}>
        <div className={styles.input}>
          <Icon name='search' size={16} />
          <input
            value={value}
            placeholder='请输入作品名称'
            onKeyDown={handleEnterPress}
            onChange={e => setValue(e.target.value)}
          />
          {value && (
            <div className={styles.clear} onClick={() => setValue('')}>
              <Icon name='close' size={10} />
            </div>
          )}
        </div>
        <div className={styles.cancel} onClick={onCancel}>
          取消
        </div>
      </div>
      <div className={styles.list}>
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={loadMore}
          hasMore={!finished}
          useWindow={false}
          className='flex flex-col gap-2'
        >
          {list.map(item => {
            return workItem(item);
          })}
        </InfiniteScroll>
        {loading && (
          <div className={styles.loading}>
            <Loading />
          </div>
        )}
        {keyword && list.length > 0 && finished && (
          <div className={styles.finished}>已经到底了</div>
        )}
        {finished && list.length === 0 && (
          <div className={styles.empty}>
            <img
              src='https://res.maka.im/cdn/editor7/material_empty_tip.png'
              alt=''
            />
            <span className={styles.tit}>没有搜索结果</span>
            <span className={styles.desc}>换个搜索词试试吧</span>
          </div>
        )}
      </div>

      <ResponsiveDialog isOpen={showPopup} onOpenChange={setShowPopup}>
        <div className={styles.settingPanel}>
          <div className={styles.head}>
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
              创建于
              {dayjs(selectedWork.current?.create_time).format(
                'YYYY.MM.DD HH:mm'
              )}
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
            onClick={() =>
              selectedWork.current && toShare(selectedWork.current)
            }
          >
            <Icon name='workshare' size={16} />
            <span className={styles.text}>
              {selectedWork.current?.type === 'poster' ? '下载' : '分享'}
            </span>
          </div>

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
            <div className={cn([styles.settingItem, 'justify-between'])}>
              <div className='flex items-center gap-2'>
                <Icon name='online' size={16}></Icon>
                <span className={styles.text}>上线</span>
              </div>
              <Switch
                defaultChecked={selectedWork.current?.status !== '-1'}
                onCheckedChange={async checked => {
                  selectedWork.current &&
                    changeWorksDetail(selectedWork.current.works_id, {
                      status: checked ? 1 : -1,
                    });
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
              placeholder='请输入作品标题'
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
                selectedWork.current && updateWorksTitle(selectedWork.current);
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

export default Home;
