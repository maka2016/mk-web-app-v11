'use client';
import {
  checkBindPhone,
  copyWork,
  deleteWork,
  getAppId,
  getToken,
  getUid,
  request,
  updateWorks,
  worksServerV2,
} from '@/services';
import APPBridge from '@mk/app-bridge';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

import {
  deleteWork2,
  duplicateWork2,
  updateWorksDetail2,
} from '@/services/works2';
import { useStore } from '@/store';
import { getUrlWithParam, setCookieExpire } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { useShareNavigation } from '@/utils/share';
import CommonLogger from '@mk/loggerv7/logger';
import { API } from '@mk/services';
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
import { Switch } from '@workspace/ui/components/switch';
import cls from 'classnames';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import H5WorksList from './H5WorksList';
import ImageWorksList from './ImageWorksList';
import { WorksItem } from './types';

interface Props {
  appid?: string;
  active: boolean;
  onChangeTab: (index: number) => void;
}

const tabs = [
  {
    label: '全部作品',
    type: 'all',
  },
  {
    label: '图片&视频',
    type: 'image',
  },
  {
    label: 'H5网页',
    type: 'h5',
  },
];

// const limit = 20;
const Works = (props: Props) => {
  const appid = props.appid || getAppId();
  const router = useRouter();
  const { h5Share, removeWatermark } = useCheckPublish();
  const { toShare, toVideoShare, toPosterShare } = useShareNavigation();
  const { setBindPhoneShow } = useStore();
  const [settingOpen, setSettingOpen] = useState(false);
  const [settingWorks, setSettingWorks] = useState<WorksItem | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [update, setUpdate] = useState(0);
  const [activeType, setActiveType] = useState('all');
  const [specInfo, setSpecInfo] = useState<any>();
  const t = useTranslations('Profile');

  const getSpecInfo = async () => {
    const res: any = await request.get(
      `${worksServerV2()}/works-spec/v1/list?page=1&pageSize=100`
    );
    if (res?.list?.length) {
      setSpecInfo(res.list);

      const result: any = {};
      res.list.forEach((item: any) => {
        result[item.id] = item;
      });
      setSpecInfo(result);
    }
  };

  const refreshData = () => {
    if (getToken()) {
      setUpdate(Date.now());
    } else {
      checkToken();
    }
  };

  const listenAppWebviewShow = () => {
    document.addEventListener('visibilitychange', () => {
      console.log('visibilitychange', document.visibilityState);
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    });
  };

  useEffect(() => {
    getSpecInfo();
    setTimeout(() => {
      checkToken();
    }, 1000);
    CommonLogger.track_pageview({
      page_type: 'works_page',
      page_id: `works_page`,
    });
    listenAppWebviewShow();

    if (typeof window !== 'undefined') {
      (window as any)['freshPageData'] = () => {
        refreshData();
      };
    }
  }, []);

  const checkToken = (retry = 0) => {
    const MAX_RETRY = 5;

    console.log('uid', getUid());
    // 如果已经有 token 就直接结束
    if (getToken()) {
      console.log('has token');
      return;
    }

    if (!APPBridge.judgeIsInApp()) return;

    console.log('checkToken attempt', retry + 1);

    APPBridge.appCall(
      {
        type: 'MKUserInfo',
        jsCbFnName: 'appBridgeOnUserInfoCb',
      },
      p => {
        console.log('作品页面 appBridgeOnUserInfoCb', p, 'attempt', retry + 1);

        if (p?.uid) {
          // 成功获取到 token
          setCookieExpire(`${appid}_token`, p?.token, 3 * 60 * 60 * 1000);
          setCookieExpire(`${appid}_uid`, p.uid, 3 * 60 * 60 * 1000);
          setUpdate(Date.now());
          return; // 停止重试
        }

        // 没有拿到 token，并且没超过最大次数，就 1s 后重试
        if (retry + 1 < MAX_RETRY) {
          setTimeout(() => {
            if (!getToken()) checkToken(retry + 1);
          }, 1000);
        } else {
          console.log('checkToken: reached max attempts, stop retrying');
        }
      }
    );
  };

  useEffect(() => {
    if (props.active) {
      setUpdate(update + 1);
    }
  }, [props.active]);

  const updateWorksTitle = async (works: WorksItem) => {
    if (works.editor_version === 10) {
      await updateWorksDetail2(works.id, {
        title: renameInput,
      });

      setUpdate(update + 1);
      setRenameInput('');
      toast.success(t('updateSuccess'));
    } else {
      await changeWorksDetail(works.id, {
        title: renameInput,
      });
    }
    setRenameOpen(false);
  };

  const onDeleteWorks = async (works: WorksItem) => {
    try {
      if (works.editor_version === 10) {
        await deleteWork2(works.id);
      } else {
        await deleteWork(+works.uid, works.id);
      }

      setUpdate(update + 1);
      toast.success('删除成功！');
    } catch (error) {
      toast.error('删除失败！');
    }
  };

  const onCopyWorks = async (works: WorksItem) => {
    try {
      if (works.editor_version === 10) {
        await duplicateWork2(works.id);
      } else {
        await copyWork(works.id);
      }

      setUpdate(update + 1);
      toast.success('复制成功！');
    } catch (error) {
      toast.error('复制失败！');
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

      setUpdate(update + 1);
    } else {
      toast.error(res.error);
    }
  };

  const updateWorksStatus = async (works: WorksItem) => {
    if (works.editor_version === 10) {
      await updateWorksDetail2(works.id, {
        offline: !works.offline,
      });

      setUpdate(update + 1);

      toast.success(t('updateSuccess'));
    } else {
      changeWorksDetail(works.id, {
        status: works.offline ? 1 : -1,
      });
    }
  };

  const toEditor = (work: WorksItem) => {
    const uid = getUid();
    const works_id = work.id;

    if (work.editor_version === 10) {
      // 简帖作品
      if (APPBridge.judgeIsInApp()) {
        APPBridge.navToPage({
          url: `${location.origin}/editor?works_id=${works_id}&uid=${uid}&is_full_screen=1&popEnable=0&simple_mode=true`,
          type: 'URL',
        });
      } else {
        router.push(
          getUrlWithParam(
            `/editor?works_id=${works_id}&uid=${uid}&appid=${appid}&simple_mode=true`,
            'clickid'
          )
        );
      }
    } else if (work.editor_version === 7) {
      // MAKA作品
      let url = `${API('根域名')}/editor-wap-v7/?token=${getToken()}&page_id=${works_id}&uid=${uid}&is_full_screen=1&popEnable=0`;
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

  const checkPublish = async (works: WorksItem) => {
    const isVideo = specInfo[works.spec.id]?.export_format?.includes('video');

    const canPublish = await removeWatermark(works.id);
    if (!canPublish) {
      toVipPage({
        works_id: works.id,
        ref_object_id: works.template_id,
        editor_version: works.editor_version, // 兼容maka会员页
      });
      return;
    }
    if (isVideo) {
      toVideoShare(works.id);
    } else {
      toDownload(works);
    }
  };

  const checkShare = async (works: WorksItem) => {
    const canShare = await h5Share(works.id);
    if (canShare) {
      if (works.editor_version === 10) {
        // 简帖作品
        const hasBind = await checkBindPhone(works.uid, getAppId());
        if (hasBind) {
          toShare(works.id);
        } else {
          setBindPhoneShow(true);
        }
      } else {
        // MAKA作品
        if (APPBridge.judgeIsInApp() && !APPBridge.isRN()) {
          const shareUri = `maka://h5Share?workId=${works.id}&isVideo=0`;
          APPBridge.navToPage({
            url: shareUri,
            type: 'NATIVE',
          });
        } else {
          const hasBind = await checkBindPhone(works.uid, getAppId());
          if (hasBind) {
            if (APPBridge.judgeIsInApp()) {
              APPBridge.navToPage({
                url: `${location.origin}/maka/mobile/share?works_id=${works.id}&uid=${works.uid}&is_full_screen=1`,
                type: 'URL',
              });
            } else {
              router.push(
                `/maka/mobile/share?works_id=${works.id}&uid=${works.uid}&appid=${getAppId()}`
              );
            }
          } else {
            setBindPhoneShow(true);
          }
        }
      }
    } else {
      toVipPage({
        works_id: works.id,
        ref_object_id: works.template_id,
        tab: 'personal',
        vipType: 'h5',
        editor_version: works.editor_version, // 兼容maka会员页
      });
    }
  };

  const toDownload = (works: WorksItem) => {
    if (works.editor_version === 10) {
      toPosterShare(works.id);
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

  const toOrder = (works: WorksItem) => {
    const url = `${API('根域名')}/mk-store-7/order?uid=${getUid()}&works_id=${works.id}&token=${getToken()}&is_full_screen=1`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
    }
  };

  const toWorksSearch = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/worksSearch?uid=${getUid()}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        `/maka/mobile/worksSearch?uid=${getUid()}&appid=${getAppId()}`
      );
    }
  };

  const checkIsH5 = (works: WorksItem) => {
    return (
      works.analytics || works.spec.id === '7ee4c72fe272959de662fff3378e7063'
    );
  };

  return (
    <div className={cls([styles.mine, styles[appid]])}>
      {/* <div className={styles.title}>
        <div className={styles.left}>
          <div className={styles.tit}>我的作品</div>
        </div>
      </div> */}
      <div className='relative p-3 bg-[#fff]'>
        <div className={styles.tabs}>
          {tabs.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                setActiveType(item.type);
              }}
              className={cls([
                styles.tabItem,
                activeType === item.type && styles.active,
              ])}
            >
              {item.label}
            </div>
          ))}
        </div>
        <Icon
          name='search'
          className='absolute top-[13px] right-3'
          onClick={() => toWorksSearch()}
        />
      </div>
      <div className={styles.worksList}>
        {activeType !== 'h5' && (
          <ImageWorksList
            update={update}
            showAll={activeType !== 'all'}
            specInfo={specInfo}
            onSelectItem={(item: WorksItem) => {
              setSettingWorks(item);
              setSettingOpen(true);
            }}
            toEditor={toEditor}
            changeActiveType={() => setActiveType('image')}
          />
        )}
        {activeType !== 'image' && (
          <H5WorksList
            update={update}
            showAll={activeType !== 'all'}
            onSelectItem={(item: WorksItem) => {
              setSettingWorks(item);
              setSettingOpen(true);
            }}
            checkShare={checkShare}
            toEditor={toEditor}
            changeActiveType={() => setActiveType('h5')}
          />
        )}
      </div>

      <ResponsiveDialog
        isOpen={settingOpen}
        onOpenChange={setSettingOpen}
        className={styles.worksPopup}
      >
        {settingWorks && (
          <div className={styles.settingPanel}>
            <div className={styles.head}>
              <div className={styles.title}>
                <span>{settingWorks?.title}</span>
                <Icon
                  name='edit'
                  size={18}
                  onClick={() => {
                    setRenameOpen(true);
                    setSettingOpen(false);
                  }}
                />
              </div>
              <div className={styles.desc}>
                创建于
                {dayjs(settingWorks?.create_time).format('YYYY.MM.DD HH:mm')}
              </div>
            </div>
            <div
              className={styles.settingItem}
              onClick={() => toEditor(settingWorks)}
            >
              <Icon name='edit' size={16} />
              <span className={styles.text}>编辑</span>
            </div>
            {checkIsH5(settingWorks) ? (
              <div
                className={styles.settingItem}
                onClick={() => checkShare(settingWorks)}
              >
                <Icon name='workshare' size={16} />
                <span className={styles.text}>分享</span>
              </div>
            ) : (
              <div
                className={styles.settingItem}
                onClick={() => checkPublish(settingWorks)}
              >
                <Icon name='workshare' size={16} />
                <span className={styles.text}>下载</span>
              </div>
            )}

            {settingWorks?.analytics && (
              <>
                <div
                  className={styles.settingItem}
                  onClick={() => {
                    if (APPBridge.judgeIsInApp()) {
                      APPBridge.navToPage({
                        url: settingWorks.analytics[0].url,
                        type: 'NATIVE',
                      });
                    } else {
                      router.push(settingWorks.analytics[0].url);
                    }
                  }}
                >
                  <Icon name='chart-line' size={16} />
                  <span className={styles.text}>传播数据</span>
                </div>
                <div
                  className={styles.settingItem}
                  onClick={() => {
                    if (APPBridge.judgeIsInApp()) {
                      APPBridge.navToPage({
                        url: settingWorks.analytics[0].url,
                        type: 'NATIVE',
                      });
                    } else {
                      router.push(settingWorks.analytics[0].url);
                    }
                  }}
                >
                  <Icon name='doc-success' size={16} />
                  <span className={styles.text}>表单</span>
                </div>
                <div
                  className={styles.settingItem}
                  onClick={() => toOrder(settingWorks)}
                >
                  <Icon name='form-fill' size={16} />
                  <span className={styles.text}>订单</span>
                </div>
              </>
            )}

            {settingWorks.spec.id && checkIsH5(settingWorks) && (
              <div className={cls([styles.settingItem, 'justify-between'])}>
                <div className='flex items-center gap-2'>
                  <Icon name='online' size={16}></Icon>
                  <span className={styles.text}>上线</span>
                </div>
                <Switch
                  defaultChecked={!settingWorks?.offline}
                  onCheckedChange={async checked => {
                    updateWorksStatus(settingWorks);
                  }}
                />
              </div>
            )}

            <div
              className={styles.settingItem}
              onClick={() => onCopyWorks(settingWorks)}
            >
              <Icon name='copy' size={16}></Icon>
              <span className={styles.text}>复制</span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className={styles.settingItem}>
                  <Icon name='delete' size={16}></Icon>
                  <span className={styles.text}>删除</span>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent className='w-[320px]'>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定删除作品吗</AlertDialogTitle>
                  <AlertDialogDescription>
                    删除作品会结束所有进行中的推广，且作品不能访问，您确定要继续删除作品吗
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className='rounded-full'>
                    {t('cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className='rounded-full'
                    onClick={() => {
                      onDeleteWorks(settingWorks);
                      setSettingOpen(false);
                    }}
                  >
                    {t('delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </ResponsiveDialog>

      <ResponsiveDialog isOpen={renameOpen} onOpenChange={setRenameOpen}>
        <div className={styles.renamePanel}>
          <div className={styles.title}>{t('rename')}</div>
          <div className={styles.input}>
            <input
              defaultValue={settingWorks?.title}
              placeholder={t('renamePlaceholder')}
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
              {t('cancel')}
            </Button>
            <Button
              className='rounded-full flex-1'
              size='lg'
              onClick={() => {
                settingWorks && updateWorksTitle(settingWorks);
              }}
            >
              {t('confirm')}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default observer(Works);
