import APPBridge from '@mk/app-bridge';
import { getToken, getUid, getWorksDetailStatic } from '@mk/services';
import { isAndroid, queryToObj } from '@mk/utils';
import { undoManager } from '@mk/works-store/store';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ResponsiveTooltip } from '@workspace/ui/components/responsive-tooltip';
import cls from 'classnames';
import { Download, FileText, Image } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { updateWorksDetail2 } from '../../../../services/works2';
import { useGridContext } from '../../comp/provider';
import { getCanvaInfo2 } from '../../comp/provider/utils';
import MusicManager from '../../shared/LibContent/Music/MusicManager';
import { ConfigPanel } from '../MarketplaceConfig';
import ThemeImport2 from '../ThemeLayoutLibraryV3/ThemeImport2';
import ThemeV3LayoutLibrary from '../ThemeLayoutLibraryV3/ThemeV3LayoutLibrary';
import CoverManager from './CoverManager';
import DownloadManager from './DownloadManager';
import { HistoryPanel } from './HistoryPanel';
import styles from './index.module.scss';
import { updateTemplateCoverUrl } from './services';
import { SpecInfoView } from './SpecInfoView';

export default function DesignerToolHeader() {
  const { editorSDK, gridProps, useGridV2, getActiveRootRow } =
    useGridContext();
  const { worksCate } = gridProps;
  const worksStore = editorSDK?.fullSDK;
  const canvaInfo = getCanvaInfo2();
  const worksId = queryToObj().works_id;
  const isTemplate = queryToObj().is_template === 'true';
  const [showMusicManager, setShowMusicManager] = useState(false);
  const [showCoverManager, setShowCoverManager] = useState(false);
  const [showSpecInfoView, setShowSpecInfoView] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadManager, setShowDownloadManager] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [showMarketplaceConfig, setShowMarketplaceConfig] = useState(false);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const isOpen = useRef(false);

  // 标题编辑相关状态
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

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

  const handleSaveTitle = () => {
    if (!editingTitle.trim()) {
      toast.error('标题不能为空');
      return;
    }
    worksStore?.api
      .updateWorksDetail({
        title: editingTitle,
      })
      ?.then(() => {
        toast.success('修改标题成功');
        setShowTitleEditor(false);
      })
      .catch(() => {
        toast.error('修改标题失败');
        setShowTitleEditor(false);
      });
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
  const isTemplateMode = gridProps.worksCate !== 'theme';

  return (
    <div id='editor_header'>
      <div className={cls(styles.header, 'md:p-2')}>
        <div className='flex items-center gap-3'>
          <div
            className={cls(styles.designer, 'cursor-pointer hover:underline')}
            onClick={() => {
              setShowSpecInfoView(true);
            }}
          >
            {worksDetail?.specInfo.display_name}
          </div>
          <div
            className={cls(
              styles.designer,
              'cursor-pointer hover:underline',
              isTemplateMode ? styles.operator : styles.theme
            )}
          >
            {isTemplateMode ? '模版制作模式' : '主题制作模式'}
          </div>
          <Popover open={showTitleEditor} onOpenChange={setShowTitleEditor}>
            <PopoverTrigger asChild>
              <div
                className='text-sm color-black font-semibold cursor-pointer hover:underline'
                onClick={() => {
                  setEditingTitle(worksDetail.title);
                  setShowTitleEditor(true);
                }}
              >
                {worksDetail.title}
              </div>
            </PopoverTrigger>
            <PopoverContent className='w-80' align='start'>
              <div className='space-y-3'>
                <div className='font-medium text-sm'>修改标题</div>
                <input
                  type='text'
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      setShowTitleEditor(false);
                    }
                  }}
                  autoFocus
                />
                <div className='flex gap-2 justify-end'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setShowTitleEditor(false)}
                  >
                    取消
                  </Button>
                  <Button size='sm' onClick={handleSaveTitle}>
                    保存
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {isTemplateMode ? <ThemeImport2 /> : <ThemeV3LayoutLibrary />}
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

          <HistoryPanel
            onJumpTo={index => {
              worksStore?.jumpToHistory(index);
            }}
          />
        </div>
        <div className='flex justify-end gap-2 items-center'>
          {canvaInfo.useMusic && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setShowMusicManager(true);
              }}
            >
              音乐
            </Button>
          )}
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              if (isTemplate) {
                window.open(`/mobile/template?id=${worksId}`);
              } else {
                window.open(
                  `/viewer2/${worksId}?preview_mode=true&${!canvaInfo.isWebsite ? `screenshot_block=${getActiveRootRow()?.id}` : ''}`
                );
              }
            }}
          >
            预览
          </Button>
          {!isTemplate && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                window.open(
                  `/editor?works_id=${worksId}&uid=${sessionStorage.getItem(
                    'editor_uid'
                  )}&token=${sessionStorage.getItem('editor_token')}&user_editor_version=v2`
                );
              }}
            >
              用户编辑器
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button size='sm' variant='outline'>
                更多
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-48 p-1' align='end'>
              <div className='flex flex-col gap-1'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='justify-start w-full h-8 px-2'
                  onClick={() => {
                    setShowCoverManager(true);
                  }}
                >
                  <Image className='w-4 h-4 mr-2' />
                  封面管理
                </Button>
                {/* <Button
                  variant='ghost'
                  size='sm'
                  className='justify-start w-full h-8 px-2'
                  onClick={() => {
                    setShowMarketplaceConfig(true);
                  }}
                >
                  <Store className='w-4 h-4 mr-2' />
                  商城展示设置
                </Button> */}
                <Button
                  variant='ghost'
                  size='sm'
                  className='justify-start w-full h-8 px-2'
                  onClick={() => {
                    window.open(
                      'https://www.feishu.cn/wiki/FV1HwdRW9iMnwtke6eYc5gD7nVd'
                    );
                  }}
                >
                  <FileText className='w-4 h-4 mr-2' />
                  更新日志
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={downloading}
                  className='justify-start w-full h-8 px-2'
                  onClick={() => {
                    setShowDownloadManager(true);
                  }}
                >
                  <Download className='w-4 h-4 mr-2' />
                  {downloading ? '下载中' : '下载海报'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
        title='封面管理'
        contentProps={{
          className: 'w-[400px] rounded-[20px] overflow-visible',
        }}
      >
        <CoverManager
          onCoverChange={async cover => {
            if (!cover) {
              return;
            }
            const isTemplate = queryToObj().is_template === 'true';
            if (isTemplate) {
              if (worksStore?.worksDetail.id) {
                await updateTemplateCoverUrl(worksStore?.worksDetail.id, cover);
              }
            } else {
              if (worksStore?.worksDetail.id) {
                await updateWorksDetail2(worksStore?.worksDetail.id, {
                  cover: cover,
                });
              }
            }
            setShowCoverManager(false);
          }}
        />
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

      <ResponsiveDialog
        isDialog
        isOpen={showSpecInfoView}
        onOpenChange={setShowSpecInfoView}
        contentProps={{
          className: 'max-w-[900px]',
        }}
      >
        <SpecInfoView />
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showDownloadManager}
        onOpenChange={setShowDownloadManager}
        contentProps={{
          className: 'max-w-[900px]',
        }}
      >
        <DownloadManager />
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showMusicManager}
        onOpenChange={setShowMusicManager}
        contentProps={{
          className: 'h-[605px]',
          style: {
            boxShadow: '0px 2px 14px 0px #55555533',
          },
        }}
      >
        <MusicManager
          onClose={() => setShowMusicManager(false)}
          music={worksStore?.worksData.canvasData.music}
          setMusic={music => {
            worksStore?.setMusic(music);
          }}
        />
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showMarketplaceConfig}
        onOpenChange={setShowMarketplaceConfig}
        contentProps={{
          className: 'max-w-[800px]',
        }}
      >
        <div className='p-6'>
          <h2 className='text-lg font-semibold mb-4'>商城展示设置</h2>
          <ConfigPanel onClose={() => setShowMarketplaceConfig(false)} />
        </div>
      </ResponsiveDialog>
    </div>
  );
}
