'use client';
import { ResponsiveDialog } from '@/components/Drawer';
import { getCanvaInfo2 } from '@/components/GridV3/comp/provider/utils';
import { calcViewerHeight } from '@/components/GridV3/comp/utils';
import MusicManager from '@/components/GridV3/shared/LibContent/Music/MusicManager';
import SaveErrorDialog from '@/components/SaveErrorDialog';
import { getAppId, getPromptApiHost, getUid, request } from '@/services';
import { useStore } from '@/store';
import { getUrlWithParam } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { useShareNavigation } from '@/utils/share';
import APPBridge from '@mk/app-bridge';
import { cdnApi, getToken } from '@mk/services';
import { isAndroid, isMakaAppAndroid } from '@mk/utils';
import { undoManager } from '@mk/works-store/store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import DialogManager from '@workspace/ui/lib/dialog-manager';
import cls from 'classnames';
import { Volume2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import CanvasAutoLayout from '../SimpleEditor/CanvasAutoLayout';
import { useWorksStore } from '../useStore';
import styles from './index.module.scss';
import Watermark from './Watermark';

const guideContent: Record<string, string> = {
  jiantie: cdnApi('/cdn/webstore10/editor/guide_content_v2.png'),
  xueji: cdnApi('/cdn/webstore10/xueji/guide_content.png'),
  huiyao: cdnApi('/cdn/webstore10/huiyao/guide_content.png'),
};
interface Props {
  worksId: string;
  onCreate: (nextWorksId: string) => void;
}

const MobileEditor2 = (props: Props) => {
  const t = useTranslations('Editor');
  const { worksId } = props;
  const { userProfile } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appid = getAppId();
  const { toPosterShare } = useShareNavigation();
  const { canExportWithoutWatermark } = useCheckPublish();
  const [showMusicLib, setShowMusicLib] = useState(false);
  const object_id = searchParams.get('object_id');
  const worksStore = useWorksStore();
  const [creating, setCreating] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [phone, setPhone] = useState(userProfile?.auths?.phone?.loginid);
  const isWebsite =
    worksStore.worksDetail.specInfo.export_format?.includes('html');
  const isPoster =
    worksStore.worksDetail.specInfo.export_format?.includes('image');
  const isVideo =
    worksStore.worksDetail.specInfo.export_format?.includes('video');

  const [showUserGuide, setShowUserGuide] = useState(() => {
    const hasSeenTip = localStorage.getItem('has_seen_user_guide');
    return !hasSeenTip;
  });

  const onClose = () => {
    // const storage = localStorage.getItem("has_seen_feedback_dialog");
    // if (!storage && appid === "xueji") {
    //   localStorage.setItem("has_seen_feedback_dialog", "1");
    //   setShowFeedbackDialog(true);
    // } else {
    setShowQuitConfirm(true);
    // }
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
      setShowErrorMessage(true);
      toast.error(t('failed'));
      setCreating(false);
    }
  };

  const onSubmitWorkOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    toast.loading('提交中...');

    const fields = {
      处理状态: '待处理',
      用户ID: getUid(),
      工单日期: Date.now(),
      工单类型: '功能缺陷',
      标题: `接受电话回访： ${phone}`,
      功能模块: '编辑器',
      应用: getAppId(),
      终端: isMakaAppAndroid() ? 'Android' : 'ios',
      截图地址: '',
    };
    await request.post(`${getPromptApiHost()}/work-order/v2/create`, {
      fields,
    });
    toast.dismiss();
    toast.success('提交成功！');

    closePage();
    setSubmitting(false);
  };

  const worksOrder = () => {
    const queryObj = {
      // ---- 必要参数 ----
      form_id: '85',
      module: '编辑器',
      form_type: '功能缺陷',
      uid: getUid(),
      appid: getAppId(),
      // ----
      token: getToken(),
      is_full_screen: '1',
      env: 'prod',
      device: isMakaAppAndroid() ? 'Android' : 'ios',
      service: '1',
    };
    const queryStr = new URLSearchParams(queryObj).toString();
    const url = `${location.origin}/works-order?${queryStr}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
    }
  };

  if (!worksStore) {
    return <div className=''>loading...</div>;
  }
  const { useMusic } = getCanvaInfo2();

  return (
    <>
      <div className={styles.container} id='editor_container'>
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
            {/* <div
              className={cls([styles.templateBtn, styles[appid]])}
              onClick={() => worksOrder()}
            >
              <Icon name='file-editing' size={16} color='var(--theme-color)' />
              <span>{t('反馈')}</span>
            </div> */}
          </div>

          <div
            className='flex items-center'
            // key={worksStore.worksData._version}
          >
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
                  <Icon
                    name='download'
                    size={16}
                    color='var(--btn-text-color)'
                  />
                  <span>导出</span>
                </div>
              )}
            </Button>
          </BehaviorBox>
        </div>
        <div className='flex-1 relative h-full w-full overflow-hidden'>
          <div
            className='overflow-y-auto overflow-x-hidden relative z-10 flex flex-col h-full pt-12 pb-24'
            id='designer_scroll_container'
          >
            <div
              className='flex flex-col flex-1 justify-center items-center relative'
              id='designer_canvas_container'
            >
              <div
                className='h-full w-full flex'
                id='designer_canvas_container_inner'
              >
                <CanvasAutoLayout readonly={false} />
              </div>
            </div>
          </div>
          {isPoster && <Watermark worksId={worksId} />}
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
              <img src={guideContent[appid]} />
              <div className={styles.desc}>{t('tip1')}</div>
              <div className={styles.desc}>{t('tip2')}</div>
              <img
                className='mt-1'
                src={
                  appid !== 'jiantie'
                    ? cdnApi(
                        '/cdn/webstore10/editor/guide_content_bottom_v3.png'
                      )
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
      </div>

      <SaveErrorDialog
        open={showErrorMessage}
        onOpenChange={setShowErrorMessage}
        onRetry={() => {}}
      ></SaveErrorDialog>
      <AlertDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
      >
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>
              接受电话回访，有机会获赠 7~30 天会员，马上参与？
            </AlertDialogTitle>
            {/* <AlertDialogDescription className="text-black/0.88 text-base">
            </AlertDialogDescription> */}
            <Input
              placeholder='请输入联系电话'
              type='tel'
              autoFocus
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='rounded-xl'
              onClick={() => {
                closePage();
              }}
            >
              下次再说
            </AlertDialogCancel>
            <AlertDialogAction
              className='rounded-xl bg-primary text-primary-btn hover:bg-primary/90'
              onClick={() => onSubmitWorkOrder()}
            >
              接受
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

export default observer(MobileEditor2);
