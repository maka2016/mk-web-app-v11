'use client';
import { useWorksStore } from '@/app/editor/useStore';
import { ResponsiveDialog } from '@/components/Drawer';
import { getCanvaInfo2 } from '@/components/GridV3/comp/provider/utils';
import { calcViewerHeight } from '@/components/GridV3/comp/utils';
import MusicManager from '@/components/GridV3/shared/LibContent/Music/MusicManager';
import SaveErrorDialog from '@/components/SaveErrorDialog';
import { getAppId, getUid } from '@/services';
import { getUrlWithParam } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { useShareNavigation } from '@/utils/share';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { isAndroid } from '@mk/utils';
import { undoManager } from '@mk/works-store/store';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import DialogManager from '@workspace/ui/lib/dialog-manager';
import cls from 'classnames';
import { Volume2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

const guideContent: Record<string, string> = {
  jiantie: cdnApi('/cdn/webstore10/editor/guide_content_v2.png'),
  xueji: cdnApi('/cdn/webstore10/xueji/guide_content.png'),
  huiyao: cdnApi('/cdn/webstore10/huiyao/guide_content.png'),
};

interface Props {}

const HeaderForUser = () => {
  const t = useTranslations('Editor');
  const router = useRouter();
  const searchParams = useSearchParams();
  const appid = getAppId();
  const { toPosterShare } = useShareNavigation();
  const { canExportWithoutWatermark } = useCheckPublish();
  const [showMusicLib, setShowMusicLib] = useState(false);
  const object_id = searchParams.get('object_id');
  const worksStore = useWorksStore();
  const isRsvp = worksStore.worksDetail.is_rsvp;
  const worksId = worksStore.worksDetail.id;
  const [creating, setCreating] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const isPoster =
    worksStore.worksDetail.specInfo.export_format?.includes('image');

  const [showUserGuide, setShowUserGuide] = useState(() => {
    const hasSeenTip = localStorage.getItem('has_seen_user_guide');
    return !hasSeenTip;
  });

  const onClose = () => {
    setShowQuitConfirm(true);
  };

  const toPrevpage = () => {
    const openIds = DialogManager.getOpenDialogIds();
    if (openIds.length > 0) {
      openIds.forEach(id => DialogManager.closeDialog(id));
      return;
    }

    onClose();
  };

  const handleJsBridgeBack = () => {
    toPrevpage();
    return false;
  };

  useEffect(() => {
    if (isAndroid()) {
      (window as any).onJsBridgeBack = handleJsBridgeBack;
    }
  }, []);

  const closePage = async () => {
    setSaving(true);
    toast.loading(t('saveToDrafts'));
    await worksStore.api.saveWorks('auto');
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      router.back();
    }
    setTimeout(() => {
      setSaving(false);
      toast.dismiss();
    }, 1000);
  };

  // 海报导出
  const checkPublish = async () => {
    let canPublish = await canExportWithoutWatermark(worksId);

    setCreating(false);

    if (!canPublish) {
      toVipPage({
        works_id: worksId,
        ref_object_id: worksStore.worksDetail.template_id,
      });
      return;
    }

    toPosterShare(worksId);
  };

  const toPreview = () => {
    router.push(
      getUrlWithParam(
        `/mobile/preview?works_id=${worksId}&uid=${getUid()}&appid=${appid}`,
        'clickid'
      )
    );
  };

  const handleSave = async () => {
    try {
      toast.loading(t('saving'));
      setCreating(true);
      /**
       * 设置正确的页面高度并保存，确保下载的高度正常
       */
      const pageHeight = calcViewerHeight();
      worksStore.setPageCanvaHeight(0, pageHeight);
      await worksStore.api.saveWorks('manual');
      toast.dismiss();

      if (!isPoster) {
        // 预览页
        toPreview();
      } else {
        checkPublish();
      }
    } catch (error) {
      toast.dismiss();
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(errorMsg);
      setShowErrorMessage(true);
      toast.error(errorMsg);
      setCreating(false);
    }
  };

  if (!worksStore) {
    return <div className=''>loading...</div>;
  }
  const { useMusic } = getCanvaInfo2();

  return (
    <>
      <div className={styles.header} id='editor_header'>
        <div className={'flex items-center'}>
          <BehaviorBox
            className={styles.left}
            onClick={() => {
              onClose();
            }}
            behavior={
              {
                object_type: 'back_from_ai_editor_page_btn',
                object_id: object_id || '',
                ref_page_id: worksId || '',
                parent_id: 'ai_works',
              } as any
            }
          >
            <Icon name='left' size={24} />
            <span className='text-sm'>{t('back')}</span>
          </BehaviorBox>
        </div>

        <div className='flex items-center'>
          <div
            className={cls([
              'p-2 flex items-center justify-center active:bg-primary/10',
              !undoManager.isUndoable() && 'disabled opacity-25',
            ])}
            onClick={() => worksStore?.undo()}
          >
            <Icon name='undo' size={24} color='#151515'></Icon>
          </div>
          <div
            className={cls([
              'p-2 flex items-center justify-center active:bg-primary/10',
              !undoManager.isRndoable() && 'disabled opacity-25',
            ])}
            onClick={() => worksStore?.redo()}
          >
            <Icon name='redo' size={24} color='#151515'></Icon>
          </div>
        </div>
        {useMusic && (
          <div
            className={cls([styles.templateBtn, styles[appid]])}
            onClick={() => setShowMusicLib(true)}
          >
            <Volume2 size={16} color='var(--theme-color)' />
            <span>音乐</span>
          </div>
        )}
        <BehaviorBox
          behavior={
            {
              object_type: 'editor_publish_btn',
              object_id: object_id || '',
              ref_page_id: worksId || '',
              parent_id: 'editor_page',
            } as any
          }
          className={''}
          onClick={handleSave}
        >
          <Button disabled={creating} size='sm'>
            {!isPoster ? (
              '下一步'
            ) : (
              <div className='flex items-center gap-1'>
                <Icon name='download' size={16} color='var(--btn-text-color)' />
                <span>导出</span>
              </div>
            )}
          </Button>
        </BehaviorBox>
      </div>

      {showUserGuide && (
        <div
          className={styles.userGuide}
          onClick={() => {
            setShowUserGuide(false);
            localStorage.setItem('has_seen_user_guide', 'true');
          }}
        >
          <div className={styles.guideContent}>
            <div className={styles.title}>
              <Icon name='star1' size={14} />
              <span>{t('adaptiveTemplate')}</span>
              <Icon name='star1' size={14} />
            </div>
            <img src={guideContent[appid]} alt='' />
            <div className={styles.desc}>{t('tip1')}</div>
            <div className={styles.desc}>{t('tip2')}</div>
            <img
              className='mt-1'
              src={
                appid !== 'jiantie'
                  ? cdnApi('/cdn/webstore10/editor/guide_content_bottom_v3.png')
                  : cdnApi('/cdn/webstore10/editor/guide_content_bottom.png')
              }
              alt=''
            />
            <div className={styles.desc}>
              {appid === 'jiantie'
                ? '底部按钮可添加页面、设置回执信息、音乐'
                : '底部按钮可添加页面、设置报名信息、音乐'}
            </div>
          </div>

          <Button
            size='lg'
            className={styles.btn}
            onClick={() => {
              setShowUserGuide(false);
              localStorage.setItem('has_seen_user_guide', 'true');
            }}
          >
            {t('startCreating')}
          </Button>
        </div>
      )}

      <SaveErrorDialog
        open={showErrorMessage}
        onOpenChange={setShowErrorMessage}
        onRetry={() => {}}
        errorMessage={errorMessage}
      ></SaveErrorDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        contentProps={{
          className: 'w-[300px] rounded-[20px] overflow-visible',
        }}
      >
        <div className='p-4'>
          <p className='text-xl	font-semibold	text-black text-center'>
            {t('tip')}
          </p>
          <p className='text-base	my-2 text-black/60 text-center'>
            {t('exitWarning')}
          </p>
          <div className='flex gap-2 mt-4'>
            <Button
              autoFocus={false}
              size='lg'
              variant='outline'
              className='flex-1'
              onClick={() => {
                setShowQuitConfirm(false);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              autoFocus={false}
              size='lg'
              className='flex-1'
              onClick={() => closePage()}
            >
              {saving ? t('saving') : t('confirm')}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showMusicLib}
        // showOverlay={false}
        // showHandler={true}
        contentProps={{
          className: 'h-[605px]',
          style: {
            boxShadow: '0px 2px 14px 0px #55555533',
          },
        }}
        onOpenChange={val => {
          setShowMusicLib(val);
        }}
      >
        <>
          <MusicManager
            onClose={() => setShowMusicLib(false)}
            music={worksStore.worksData.canvasData.music}
            setMusic={music => {
              worksStore.setMusic(music);
            }}
          />
        </>
      </ResponsiveDialog>
    </>
  );
};

export default observer(HeaderForUser);
