'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import SaveErrorDialog from '@/components/SaveErrorDialog';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isAndroid } from '@/utils';
import {
  CloseAllModals,
  GetOpenModalIds,
} from '@workspace/ui/components/ShowDrawerV2';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronLeft, Redo2, Undo2, Volume2 } from 'lucide-react';
import { default as DesignerToolHeaderV2 } from '.';
import { mkWebStoreLogger } from '../../../../services/logger';
import MusicManager from '../../components/Music/MusicManager';

export type HeaderType = 'default' | 'none' | 'mobile' | 'desktop';

export interface HeaderForUserProps {
  headerType?: HeaderType;
}

const HeaderForUser = ({ headerType = 'default' }: HeaderForUserProps) => {
  const t = useTranslations('Editor');
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useStore();
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const object_id = searchParams.get('object_id');
  const worksDetail = worksStore.worksDetail;
  const worksId = worksDetail.id;
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorStack, setErrorStack] = useState<string>('');
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const isPoster = worksDetail.specInfo.export_format?.includes('image');
  const [showMusicLib, setShowMusicLib] = useState(false);

  const onClose = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const toPrevpage = useCallback(() => {
    const openIds = GetOpenModalIds();
    if (openIds.length > 0) {
      CloseAllModals();
      return;
    }

    onClose();
  }, [onClose]);

  const handleJsBridgeBack = useCallback(() => {
    toPrevpage();
    return false;
  }, [toPrevpage]);

  useEffect(() => {
    if (isAndroid()) {
      // 启用返回按钮
      if (APPBridge.judgeIsInApp()) {
        APPBridge.appCall(
          {
            type: 'MKDisableBackButton' as any,
            jsCbFnName: 'MKDisableBackButton',
            params: {
              disable: false,
            },
          },
          data => {
            console.log('MKDisableBackButton 成功', data);
          },
          2000
        );
      }
      (window as any).onJsBridgeBack = handleJsBridgeBack;
    }
  }, [handleJsBridgeBack]);

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

  const handleSave = async () => {
    try {
      toast.loading(t('saving'));
      setSaving(true);
      /**
       * 设置正确的页面高度并保存，确保下载的高度正常
       */
      await worksStore.api.saveWorks('manual');
      toast.dismiss();

      if (isPoster) {
        mkWebStoreLogger.track_success({
          object_type: 'poster_export',
          object_id: worksId,
        });
        const { share_type } = worksDetail || {};
        if (share_type === 'invite') {
          // 邀请函下载
          setWidgetStateV2({
            showDownloadInviteeManager: true,
          });
        } else {
          const canShare = await store.checkSharePermission(worksDetail.id, {
            trackData: {
              works_id: worksId,
              ref_object_id: worksDetail.template_id || '',
              works_type: 'poster',
              tab: 'personal',
              vipType: 'share',
            },
          });
          if (!canShare) {
            setSaving(false);
            return;
          }
          setWidgetStateV2({
            showDownloadPoster: true,
          });
          // 普通海报下载
          // store.toPosterShare(worksDetail.id);
        }
      } else {
        setWidgetStateV2({
          showPreviewModal: true,
        });
      }
    } catch (error) {
      toast.dismiss();
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStackTrace =
        error instanceof Error && error.stack ? error.stack : '';
      setErrorMessage(errorMsg);
      setErrorStack(errorStackTrace);
      setShowErrorMessage(true);
      toast.error(errorMsg);
      setSaving(false);
    }
    setSaving(false);
  };

  if (headerType === 'none') {
    return null;
  }

  if (!worksStore) {
    return <div className=''>{t('loading')}</div>;
  }

  const renderDesktopHeader = () => {
    return <DesignerToolHeaderV2 />;
  };

  const { export_format } = worksDetail.specInfo;
  const useMusic =
    false && ['html', 'video'].some(format => export_format?.includes(format));

  const renderMobileHeader = () => {
    return (
      <>
        <div
          className='flex-shrink-0 h-11 bg-white flex items-center justify-between px-4 sticky top-0 z-1 shadow-[inset_0_-1px_rgba(0,0,0,0.15)]'
          id='editor_header'
        >
          <div className={'flex items-center'}>
            <BehaviorBox
              className='mr-5 flex items-center text-sm font-normal leading-[22px] text-black'
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
              <ChevronLeft size={24} />
              <span className='text-sm'>{t('back')}</span>
            </BehaviorBox>
          </div>

          <div className='flex items-center'>
            <div
              className={cn([
                'p-2 flex items-center justify-center active:bg-primary/10',
                !worksStore?.isUndoable && 'disabled opacity-25',
              ])}
              onClick={() => worksStore?.undo()}
            >
              <Undo2 size={24} color='#151515' />
            </div>
            <div
              className={cn([
                'p-2 flex items-center justify-center active:bg-primary/10',
                !worksStore?.isRedoable && 'disabled opacity-25',
              ])}
              onClick={() => worksStore?.redo()}
            >
              <Redo2 size={24} color='#151515' />
            </div>
          </div>
          {useMusic && (
            <div
              className={cn(
                'flex items-center justify-center px-2 h-[30px] rounded-md gap-1',
                'bg-[var(--theme-background-color)]'
              )}
              onClick={() => setShowMusicLib(true)}
            >
              <Volume2 size={16} color={'var(--theme-color)'} />
              <span className='font-PingFangSC font-normal text-sm leading-5 text-center text-[#09090b]'>
                {t('music')}
              </span>
            </div>
          )}
          <BehaviorBox
            behavior={{
              object_type: 'editor_publish_btn',
              object_id: object_id || '',
              ref_page_id: worksId || '',
              parent_id: 'editor_page',
            }}
            onClick={handleSave}
          >
            <Button disabled={saving} size='sm'>
              {!isPoster ? t('next') : t('export')}
            </Button>
          </BehaviorBox>
        </div>

        <SaveErrorDialog
          open={showErrorMessage}
          onOpenChange={setShowErrorMessage}
          onRetry={() => { }}
          errorMessage={errorMessage}
          errorStack={errorStack}
        ></SaveErrorDialog>

        <ResponsiveDialog
          isDialog
          isOpen={showQuitConfirm}
          onOpenChange={setShowQuitConfirm}
          disableBackNavigation
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
              music={worksStore.worksData.music}
              setMusic={music => {
                worksStore.setMusic(music);
              }}
            />
          </>
        </ResponsiveDialog>
      </>
    );
  };

  if (headerType === 'default') {
    if (!store.environment.isMobile) {
      return renderDesktopHeader();
    } else {
      return renderMobileHeader();
    }
  } else if (headerType === 'mobile') {
    return renderMobileHeader();
  } else if (headerType === 'desktop') {
    return renderDesktopHeader();
  }
  return null;
};

export default observer(HeaderForUser);
