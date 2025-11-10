'use client';
import { getAppId, getUid } from '@/services';
import APPBridge from '@mk/app-bridge';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

import { useStore } from '@/store';
import { getUrlWithParam } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import CommonLogger from '@mk/loggerv7/logger';
import { EventEmitter } from '@mk/utils';
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
import { Separator } from '@workspace/ui/components/separator';
import cls from 'classnames';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const { toPosterShare, toVideoShare } = useShareNavigation();

  const searchParams = useSearchParams();
  const isDesigner = !!searchParams.get('designer_tool');
  const [settingOpen, setSettingOpen] = useState(false);
  const [settingWorks, setSettingWorks] = useState<WorksItem | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [update, setUpdate] = useState(0);
  const [activeType, setActiveType] = useState('all');
  const [specInfo, setSpecInfo] = useState<any>();
  const [total, setTotal] = useState(0);
  const t = useTranslations('Profile');
  const { canShareWithoutWatermark, canExportWithoutWatermark } =
    useCheckPublish();
  const { permissions } = useStore();

  const getSpecInfo = async () => {
    const list = await trpc.worksSpec.findMany.query({
      deleted: false,
      take: 100,
    });

    if (list?.length) {
      const result: any = {};
      list.forEach((item: any) => {
        result[item.id] = item;
      });
      setSpecInfo(result);
    }
  };

  const getWorksTotal = async () => {
    const uid = getUid();
    if (!uid) {
      return;
    }
    // uid 会自动从请求头中获取
    const count = await trpc.works.count.query({
      deleted: false,
    });
    setTotal(count || 0);
  };

  useEffect(() => {
    getSpecInfo();
    getWorksTotal();
    CommonLogger.track_pageview({
      page_type: 'mine_page',
      page_id: `mine_page`,
    });
  }, []);

  const refreshWorks = () => {
    setUpdate(update + 1);
  };

  useEffect(() => {
    EventEmitter.on('paySuccess', refreshWorks);
    return () => {
      EventEmitter.rm('paySuccess', refreshWorks);
    };
  }, []);

  useEffect(() => {
    if (props.active) {
      setUpdate(update + 1);
    }
  }, [props.active]);

  const updateWorksTitle = async () => {
    if (!settingWorks) {
      return;
    }

    await trpc.works.update.mutate({
      id: settingWorks.id,
      title: renameInput,
    });

    setUpdate(update + 1);
    setRenameInput('');
    toast.success(t('updateSuccess'));
  };

  const onDeleteWorks = async (works: WorksItem) => {
    try {
      await trpc.works.delete.mutate({ id: works.id });
      setUpdate(update + 1);
      toast.success(t('deleteSuccess'));
    } catch {
      toast.error('server error');
    }
  };

  const onCopyWorks = async (works: WorksItem) => {
    if (total >= +(permissions.works_num || 0)) {
      toast.error('创作数量已达上限');
      toVipPage();
      return;
    }
    const worksId = works.id;
    try {
      await trpc.works.duplicate.mutate({ id: worksId });

      setUpdate(update + 1);
      toast.success(t('updateSuccess'));
    } catch {
      toast.error('server error');
    }
  };

  const toEditor = (works_id: string) => {
    const uid = getUid();

    if (isDesigner) {
      window.open(
        `/editor-designer?works_id=${works_id}&designer_tool=2&uid=${getUid()}`
      );
      return;
    }

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/editor?works_id=${works_id}&uid=${uid}&is_full_screen=1&popEnable=0`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/editor?works_id=${works_id}&uid=${uid}&appid=${appid}`,
          'clickid'
        )
      );
    }
  };

  const checkPublish = async (works: WorksItem) => {
    const isWebsite = specInfo[works.spec_id].export_format.includes('html');
    const isVideo = specInfo[works.spec_id].export_format.includes('video');

    if (isWebsite) {
      const canShare = await canShareWithoutWatermark(works.id);
      if (!canShare) {
        toVipPage({
          works_id: works.id,
          ref_object_id: works.template_id,
          tab: appid === 'xueji' ? 'business' : 'personal',
          vipType: 'h5',
        });
        return;
      }

      toShare(works);
    } else {
      const canPublish = await canExportWithoutWatermark(works.id);
      if (!canPublish) {
        toVipPage({
          works_id: works.id,
          ref_object_id: works.template_id,
        });
        return;
      }

      if (isVideo) {
        toVideoShare(works.id);
      } else {
        toPosterShare(works.id);
      }
    }
  };

  const toShare = (item: WorksItem) => {
    console.log('toShare', item);
    const uid = getUid();
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/share?works_id=${item.id}&uid=${uid}&is_full_screen=1&back=true`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/mobile/share?works_id=${item.id}&uid=${uid}&appid=${appid}`,
          'clickid'
        )
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

  return (
    <div className={cls([styles.mine, styles[appid]])}>
      <div className='p-3 bg-[#fff]'>
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
            toEditor={toEditor}
            changeActiveType={() => setActiveType('h5')}
          />
        )}
      </div>
      <ResponsiveDialog isOpen={settingOpen} onOpenChange={setSettingOpen}>
        {settingWorks && (
          <div className={styles.settingPanel}>
            <div className={styles.head}>
              <div className={styles.title}>
                {settingWorks?.title}
                <Icon
                  name='edit'
                  size={20}
                  onClick={() => {
                    setRenameOpen(true);
                    setSettingOpen(false);
                  }}
                />
              </div>
              <div className={styles.desc}>
                {`${specInfo[settingWorks.spec_id]?.display_name} ${settingWorks?.id} ${settingWorks?.isPurchased ? `有效期 ${dayjs(settingWorks.expiryDate).format('YYYY.MM.DD HH:mm')}` : `最后编辑于 ${dayjs(settingWorks?.update_time).format('YYYY.MM.DD HH:mm')}`} `}
                <span></span>
              </div>
            </div>
            {specInfo[settingWorks.spec_id]?.export_format.includes('html') && (
              <div
                className={styles.settingItem}
                onClick={() => toPreview(settingWorks)}
              >
                <Icon name='preview' size={16} />
                <span className={styles.text}>预览</span>
              </div>
            )}
            <div
              className={styles.settingItem}
              onClick={() => settingWorks && toEditor(settingWorks.id)}
            >
              <Icon name='edit' size={16} />
              <span className={styles.text}>编辑</span>
            </div>
            <div className='px-3 py-2'>
              <Separator />
            </div>
            {(specInfo[settingWorks.spec_id]?.export_format.includes('video') ||
              specInfo[settingWorks.spec_id]?.export_format.includes(
                'image'
              )) && (
              <div
                className={styles.settingItem}
                onClick={() => checkPublish(settingWorks)}
              >
                <Icon name='edit' size={16} />
                <span className={styles.text}>保存到相册</span>
              </div>
            )}
            {specInfo[settingWorks.spec_id]?.export_format.includes('html') && (
              <div
                className={styles.settingItem}
                onClick={() => checkPublish(settingWorks)}
              >
                <Icon name='edit' size={16} />
                <span className={styles.text}>分享到</span>
              </div>
            )}
            <div className='px-3 py-2'>
              <Separator />
            </div>
            <div
              className={styles.settingItem}
              onClick={() => {
                onCopyWorks(settingWorks);
                setSettingOpen(false);
              }}
            >
              <Icon name='copy' size={16} />
              <span className={styles.text}>{t('copy')}</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div
                  className={cls([
                    styles.settingItem,
                    settingWorks?.isPurchased && styles.disabled,
                  ])}
                >
                  <Icon
                    name='delete-g8c551hn'
                    size={16}
                    className={styles.icon}
                    color='#EF4444'
                  />
                  <span
                    className={styles.text}
                    style={{
                      color: '#EF4444',
                    }}
                  >
                    {t('delete')}
                  </span>
                  {settingWorks?.isPurchased && (
                    <div className={styles.tip}>
                      <Icon name='info' size={14} color='#000' />
                      该作品已单独付费，不可删除
                    </div>
                  )}
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent className='w-[320px]'>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteWarning')}
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
                updateWorksTitle();
                setRenameOpen(false);
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
