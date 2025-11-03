import APPBridge from '@mk/app-bridge';
import { getToken, getUid, getWorksDetailStatic } from '@mk/services';
import { isAndroid, queryToObj } from '@mk/utils';
import { undoManager } from '@mk/works-store/store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ResponsiveTooltip } from '@workspace/ui/components/responsive-tooltip';
import cls from 'classnames';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import { onScreenShot } from '../../shared';
import { useThemePackContext } from '../ThemePackManager/ThemeProvider';
import CoverManager from './CoverManager';
import styles from './index.module.scss';

export default function DesignerToolHeader() {
  const { selectedTemplateApp, selectedMaterialChannel } =
    useThemePackContext();
  const { editorSDK, gridProps, useGridV2 } = useGridContext();
  const worksStore = editorSDK?.fullSDK;
  const worksId = queryToObj().works_id;
  const isTemplate = queryToObj().is_template === 'true';
  const [showCoverManager, setShowCoverManager] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const appid = queryToObj().appid;

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const isOpen = useRef(false);

  const worksDetail = getWorksDetailStatic();

  const toPrevpage = () => {
    if (isOpen.current) {
      isOpen.current = false;
      return;
    }
    setShowQuitConfirm(true);
  };

  const handleJsBridgeBack = () => {
    toPrevpage();
    return false;
  };

  useEffect(() => {
    if (isAndroid()) {
      (window as any).onJsBridgeBack = handleJsBridgeBack;
    }

    sessionStorage.setItem('editor_uid', getUid());
    sessionStorage.setItem('editor_token', getToken());
  }, []);

  const saveWorks = async () => {
    setSaving(true);
    try {
      await worksStore?.api.saveWorks('manual');
      toast.success('保存成功');
      setSaving(false);
    } catch (error) {
      console.error(error);
      toast.error(`保存失败: ${error},请刷新页面`);
      setSaving(false);
    }
  };

  const closePage = async () => {
    await saveWorks();
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      window.history.back();
    }
  };

  const { isSaved, saveError } = worksStore || {};

  return (
    <div id='editor_header'>
      <div className={cls(styles.header, 'md:p-2')}>
        <div className='flex items-center gap-3'>
          <div
            className={styles.btn}
            onClick={() => {
              // router.back();
              window.history.back();
            }}
          >
            <ChevronLeft size={16} />
            <span>返回</span>
          </div>
          <div className={styles.split}></div>
          <div
            className={cls(styles.designer, 'cursor-pointer hover:underline')}
            onClick={() => {
              editorSDK?.changeWidgetState({
                showThemeChannelSelector: true,
              });
            }}
          >
            已选场景：{selectedTemplateApp?.name}
            {`>`}
            {selectedMaterialChannel?.display_name}
          </div>
          <div className='text-sm color-black font-semibold'>
            {worksDetail.title}
          </div>
          <ResponsiveTooltip content='保存' trigger='hover'>
            <div className={styles.iconBtn} onClick={() => saveWorks()}>
              <Icon
                name={
                  !isSaved
                    ? saveError
                      ? 'storagefail'
                      : 'saving'
                    : 'storage-success'
                }
                size={20}
              ></Icon>
            </div>
          </ResponsiveTooltip>

          <div className={styles.save}>
            {saveError ? (
              <span>保存失败</span>
            ) : (
              <span style={{ opacity: isSaved ? 0 : 1 }}>正在存储中...</span>
            )}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <ResponsiveTooltip trigger='hover' content='撤销'>
            <div
              className={cls([
                styles.iconBtn,
                !undoManager.isUndoable() && styles.disabled,
              ])}
              onClick={() => worksStore?.undo()}
            >
              <Icon name='undo' size={20}></Icon>
            </div>
          </ResponsiveTooltip>

          <ResponsiveTooltip trigger='hover' content='重做'>
            <div
              className={cls([
                styles.iconBtn,
                !undoManager.isRndoable() && styles.disabled,
              ])}
              onClick={() => worksStore?.redo()}
            >
              <Icon name='redo' size={20}></Icon>
            </div>
          </ResponsiveTooltip>
        </div>
        <div className='flex justify-end gap-2 items-center'>
          {useGridV2 ? (
            <span className='text-xs text-gray-500'>GridV2模式</span>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size='sm' variant='outline'>
                  升级GridV2
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className='w-[320px]'>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    一旦升级成功不可撤回，是否继续？
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={e => {
                      window.location.href = `${window.location.href}&gridv2=true`;
                    }}
                  >
                    升级
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              if (isTemplate) {
                window.open(`/mobile/template?id=${worksId}`);
              } else {
                window.open(`/viewer2/${worksId}`);
              }
            }}
          >
            预览
          </Button>
          <Button
            size='sm'
            disabled={downloading}
            variant='outline'
            onClick={async () => {
              setDownloading(true);
              const canvaInfo2 = getCanvaInfo2();
              const { width, height } = worksStore?.worksData?.canvasData || {};
              const { viewportWidth, viewportScale } = canvaInfo2;
              const screenshotWidth = viewportWidth;
              const screenshotHeight = (height || 1) * viewportScale;
              console.log('canvaInfo2', canvaInfo2);
              // const screenshotWidth = 720;
              toast.loading('图片生成中');
              const screenshotRes = await onScreenShot({
                id: worksId,
                width: screenshotWidth,
                height: screenshotHeight,
                appid,
              }).catch(() => {
                toast.error('图片生成失败');
                setDownloading(false);
                return {};
              });
              setDownloadUrl(screenshotRes[0]);
              setShowDownloadDialog(true);
              toast.dismiss();
              setDownloading(false);
            }}
          >
            {downloading ? '下载中' : '下载海报'}
          </Button>
          {!isTemplate && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                window.open(
                  `/editor?works_id=${worksId}&uid=${sessionStorage.getItem(
                    'editor_uid'
                  )}&token=${sessionStorage.getItem('editor_token')}`
                );
              }}
            >
              用户编辑器
            </Button>
          )}
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              window.open(
                'https://www.feishu.cn/wiki/FV1HwdRW9iMnwtke6eYc5gD7nVd'
              );
            }}
          >
            更新日志
          </Button>
          {isTemplate && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setShowCoverManager(true);
              }}
            >
              封面管理
            </Button>
          )}
        </div>
      </div>

      <ResponsiveDialog
        isDialog
        isOpen={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        contentProps={{
          className: 'w-[300px] rounded-[20px] overflow-visible',
        }}
      >
        <div className='p-4'>
          <p className='text-xl	font-semibold	text-black text-center'>提示</p>
          <p className='text-base	my-2 text-black/60 text-center'>
            退出后，未保存的修改将丢失
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
              取消
            </Button>
            <Button
              autoFocus={false}
              size='lg'
              className='flex-1'
              onClick={() => closePage()}
            >
              {saving ? '保存中' : '确认'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showCoverManager}
        onOpenChange={setShowCoverManager}
        contentProps={{
          className: 'w-[300px] rounded-[20px] overflow-visible',
        }}
      >
        <CoverManager />
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        contentProps={{
          className: 'rounded-[20px] overflow-visible',
        }}
      >
        <div className='w-[600px] max-h-[80vh] overflow-auto'>
          <img
            src={downloadUrl}
            alt='海报'
            onClick={() => {
              window.open(downloadUrl);
            }}
          />
        </div>
      </ResponsiveDialog>
    </div>
  );
}
