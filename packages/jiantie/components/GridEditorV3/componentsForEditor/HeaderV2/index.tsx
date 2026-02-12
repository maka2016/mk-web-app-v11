import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import { getToken, getUid } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { isAndroid, queryToObj, trpc } from '@/utils';
import { trpcReact } from '@/utils/trpc';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ResponsiveTooltip } from '@workspace/ui/components/responsive-tooltip';
import cls from 'classnames';
import {
  Download,
  FileText,
  Image,
  List
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { mkWebStoreLogger } from '../../../../services/logger';
import SaveErrorDialog from '../../../SaveErrorDialog';
import MusicManager from '../../components/Music/MusicManager';
import ShortcutHelp from '../../components/ShortcutHelp';
import { getCanvaInfo2 } from '../../provider/utils';
import { getImgInfo2 } from '../../utils';
import CoverManager from '../CoverManager';
import DownloadManager from './DownloadManager';
import { HistoryPanel } from './HistoryPanel';
import { SpecInfoView } from './SpecInfoView';
import WorksList from './WorksList';

/**
 * PC的编辑器顶部导航栏
 */
function DesignerToolHeader() {
  const worksStore = useWorksStore();
  const { setWidgetStateV2, worksDetail, fullStack } = worksStore;
  const store = useStore();
  const canvaInfo = getCanvaInfo2();
  const worksId = queryToObj().works_id;
  const isTemplate = /^T_/.test(worksId);
  const [showMusicManager, setShowMusicManager] = useState(false);
  const [showCoverManager, setShowCoverManager] = useState(false);
  const [showSpecInfoView, setShowSpecInfoView] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadManager, setShowDownloadManager] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorStack, setErrorStack] = useState<string>('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const isOpen = useRef(false);

  // 标题编辑相关状态
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // 作品列表相关状态
  const [showWorksList, setShowWorksList] = useState(false);

  // 创建异步任务用于生成封面
  const createAsyncTaskMutation = trpcReact.asyncTask.createTask.useMutation();
  const processTaskMutation = trpcReact.asyncTask.processTask.useMutation();

  // 生成单个模版封面生成任务名称
  const generateTemplateCoverTaskName = (templateId: string): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${y}-${m}-${d} ${h}:${min}`;
    return `模版封面生成_${templateId}_${timeStr}`;
  };

  const toPrevpage = () => {
    if (isOpen.current) {
      isOpen.current = false;
      return;
    }
    setShowQuitConfirm(true);
  };

  useEffect(() => {
    const handleJsBridgeBack = () => {
      toPrevpage();
      return false;
    };

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

      // 如果是模版模式，创建异步任务来更新封面
      if (isTemplate && worksStore?.worksDetail.id) {
        try {
          const uidStr = getUid();
          const createdByUid = uidStr ? Number(uidStr) : undefined;
          const templateId = worksStore.worksDetail.id;
          const taskName = generateTemplateCoverTaskName(templateId);

          const task = await createAsyncTaskMutation.mutateAsync({
            task_type: 'batch_generate_covers',
            task_name: taskName,
            input_data: {
              template_ids: [templateId],
            },
            created_by_uid: createdByUid && !isNaN(createdByUid) ? createdByUid : undefined,
          });

          // 立即执行任务
          processTaskMutation.mutate({ id: task.id });
          toast.success('封面自动生成中，可以稍后刷新页面查看');
        } catch (error: unknown) {
          toast.error('创建封面生成任务失败');
          console.error('创建封面生成任务失败:', error);
          // 任务创建失败不影响保存成功的提示
        }
      }

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

  const renderActionBtns = () => {
    if (fullStack) {
      // 设计师模式
      return (
        <>
          {canvaInfo.useAnimation && <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setWidgetStateV2({
                showAnimationTimeline: !showAnimationTimeline,
              })
            }}
          >
            动画设置
          </Button>}
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
                window.open(`/viewer2/${worksId}?preview_mode=true`);
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
                  `/mobile/editor?works_id=${worksId}&uid=${sessionStorage.getItem(
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
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image size={12} aria-hidden='true' />
                  封面管理
                </Button>
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
                  <FileText size={12} />
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
                  <Download size={12} />
                  {downloading ? '下载中' : '下载海报'}
                </Button>
                <ShortcutHelp />
              </div>
            </PopoverContent>
          </Popover>
        </>
      );
    }

    // 用户模式
    const isPoster = worksDetail.specInfo.export_format?.includes('image');
    const handleSave = async () => {
      try {
        toast.loading('保存中...');
        setSaving(true);
        await worksStore.api.saveWorks('manual');
        toast.dismiss();
        setSaving(false);
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
    };

    const handleExportPoster = async () => {
      try {
        await handleSave();

        if (isPoster) {
          mkWebStoreLogger.track_success({
            object_id: worksId,
            object_type: 'poster_export',
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
        }
      } catch (error) {
        console.error(error);
        toast.error(`导出失败: ${error},请刷新页面`);
      }
    };
    return (
      <>
        {!isPoster && (
          <Button
            disabled={saving}
            size='sm'
            onClick={() => setWidgetStateV2({ showPreviewModal: true })}
          >
            预览/分享
          </Button>
        )}
        {isPoster && (
          <Button disabled={saving} size='sm' onClick={handleExportPoster}>
            导出
          </Button>
        )}
      </>
    );
  };

  // 处理封面变更的共用方法
  const handleCoverChange = async (cover: string | undefined) => {
    if (!cover) {
      return;
    }
    const imageInfo = await getImgInfo2(cover);
    // 如果图片高度大于 540/9*20，则取 540/9*20，否则取图片高度
    const maxHeight = (540 / 9) * 20; // 1200
    const updateData = {
      cover: cover,
      coverV3: {
        url: cover,
        width: 540,
        height: Math.min(maxHeight, imageInfo.baseHeight),
      },
    };
    if (isTemplate) {
      if (worksStore?.worksDetail.id) {
        await trpc.template.update.mutate({
          ...updateData,
          id: worksStore?.worksDetail.id,
        });
      }
    } else {
      if (worksStore?.worksDetail.id) {
        await trpc.works.update.mutate({
          ...updateData,
          id: worksStore?.worksDetail.id,
        });
      }
    }
  };

  const { isSaved, saveError, widgetStateV2 } = worksStore || {};
  const showAnimationTimeline = widgetStateV2?.showAnimationTimeline ?? false;

  return (
    <div id='editor_header'>
      <div className='w-full flex items-center md:p-2 gap-4 border-b border-gray-200'>
        <div className='flex items-center gap-3'>
          <div
            className='text-sm cursor-pointer hover:underline flex items-center gap-1'
            onClick={() => setShowWorksList(true)}
          >
            <List size={16} />
            作品列表
          </div>
          <div
            className='h-6 rounded-full bg-black px-2 text-white text-xs font-semibold leading-6 cursor-pointer hover:underline'
            onClick={() => {
              setShowSpecInfoView(true);
            }}
          >
            {worksDetail?.specInfo.display_name}
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
                  title='修改标题'
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
        </div>
        <div className='flex items-center gap-2'>
          <ResponsiveTooltip trigger='hover' content='撤销'>
            <div
              className={cls(
                'flex items-center p-1.5 rounded cursor-pointer hover:bg-[#f5f5f5]',
                !worksStore?.isUndoable && 'text-[#a5a6a7] pointer-events-none'
              )}
              onClick={() => worksStore?.undo()}
            >
              <Icon name='undo' size={20}></Icon>
            </div>
          </ResponsiveTooltip>

          <ResponsiveTooltip trigger='hover' content='重做'>
            <div
              className={cls(
                'flex items-center p-1.5 rounded cursor-pointer hover:bg-[#f5f5f5]',
                !worksStore?.isRedoable && 'text-[#a5a6a7] pointer-events-none'
              )}
              onClick={() => worksStore?.redo()}
            >
              <Icon name='redo' size={20}></Icon>
            </div>
          </ResponsiveTooltip>

          <HistoryPanel
            worksStore={worksStore}
            onJumpTo={index => {
              worksStore?.jumpToHistory(index);
            }}
          />
          <ResponsiveTooltip content='保存' trigger='hover'>
            <div
              className='flex items-center p-1.5 rounded cursor-pointer hover:bg-[#f5f5f5]'
              onClick={() => saveWorks()}
            >
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

          <div className='flex items-center'>
            {saveError ? (
              <span className='text-sm font-normal leading-[22px] text-[#a5a6a7]'>
                保存失败
              </span>
            ) : (
              <span
                className='text-sm font-normal leading-[22px] text-[#a5a6a7]'
                style={{ opacity: isSaved ? 0 : 1 }}
              >
                {isTemplate ? '模版需要手动保存，保存后将自动生成封面' : '正在存储中...'}
              </span>
            )}
          </div>
        </div>
        <span className='flex-1'></span>
        <div className='flex justify-end gap-2 items-center'>
          {renderActionBtns()}
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
          worksDetail={worksDetail}
          useDynamicCover={
            worksDetail.id.startsWith('T_')
              ? Boolean(
                worksDetail.specInfo?.export_format?.includes('video') ||
                worksDetail.specInfo?.is_flip_page
              )
              : false
          }
          onCoverChange={async cover => {
            if (!cover) {
              return;
            }
            handleCoverChange(cover);
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
        <SpecInfoView
          worksDetail={worksDetail}
          onSpecChangeSuccess={(updated: any) => {
            worksStore?.api.updateWorksDetail({
              spec_id: updated.spec_id,
              specInfo: updated.specInfo,
            });
          }}
        />
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
          music={worksStore?.worksData.music}
          setMusic={music => {
            worksStore?.setMusic(music);
          }}
        />
      </ResponsiveDialog>

      <ResponsiveDialog
        isOpen={showWorksList}
        direction='left'
        onOpenChange={setShowWorksList}
        title='作品列表'
        contentProps={{
          className: 'w-[460px]',
        }}
      >
        <WorksList
          currentWorksId={worksId}
          onSelectWork={work => {
            setShowWorksList(false);
            const params = new URLSearchParams(window.location.search);
            params.set('works_id', work.id);
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.location.replace(newUrl);
          }}
        />
      </ResponsiveDialog>

      <SaveErrorDialog
        open={showErrorMessage}
        onOpenChange={setShowErrorMessage}
        onRetry={() => { }}
        errorMessage={errorMessage}
        errorStack={errorStack}
      />
    </div>
  );
}
export default observer(DesignerToolHeader);
