import { getAppId } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { sendFeishuMessage, SerializedWorksEntity, trpc } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import FileSaver from 'file-saver';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { zipImageFromUrl } from '../../componentsForEditor/HeaderV2/services';
import { getCanvaInfo2 } from '../../provider/utils';
import { onScreenShot } from '../../utils';
import { DownloadProgressDialog } from './DownloadProgressDialog';
import { InviteeManager } from './InviteeManager';

interface Invitee {
  id: string;
  name: string;
  phone?: string | null;
}

interface DownloadQueue {
  url: string;
  filename: string;
}

const downloadMultiplePage2 = async (
  worksId: string,
  blockId: string,
  viewportWidth: number,
  query?: Record<string, string>
) => {
  const screenshotRes = await onScreenShot({
    id: worksId,
    width: viewportWidth || 1080,
    height: viewportWidth || 1080,
    appid: getAppId(),
    screenshot_block: blockId,
    surfix: query?.guest_name || '',
    ...(query && { query }), // 只有当query存在时才传递query参数
  }).catch(() => {
    return null;
  });
  // 返回结果，而不是直接push到数组
  if (screenshotRes && screenshotRes[0]) {
    const formattedFilename = query?.guest_name
      ? `${encodeURIComponent(query.guest_name)}.png`
      : '页面.png';
    return {
      url: screenshotRes[0],
      filename: formattedFilename,
    };
  }

  return null;
};

/**
 * 设计师和用户共用的组件管理器
 */
export default function DownloadHelperForInvitees({
  inEditor = false,
  showModal,
  setShowModal,
  worksDetail: _worksDetail,
  onUpdate,
}: {
  inEditor?: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  worksDetail: SerializedWorksEntity;
  onUpdate?: () => void;
}) {
  const store = useStore();
  const [downloading, setDownloading] = useState(false);
  const [fileUri, setFileUri] = useState('');
  const [selectedInvitees, setSelectedInvitees] = useState<Invitee[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [expectedCount, setExpectedCount] = useState(0);
  const GENERAL_TEMPLATE_ID = 'GENERAL_TEMPLATE';

  const worksId = _worksDetail?.id || '';

  if (/^T_/.test(worksId)) {
    return null
  }

  const [worksDetail, setResolvedWorksDetail] =
    useState<SerializedWorksEntity>();

  // 在组件挂载时获取作品数据
  useEffect(() => {
    trpc.works.findById.query({ id: worksId }).then(res => {
      setResolvedWorksDetail(res as unknown as SerializedWorksEntity);
    });
  }, [worksId]);

  const onScreenshotPoster = async (query?: Record<string, string>) => {
    const canvasInfo = getCanvaInfo2(worksDetail);
    const { viewportWidth } = canvasInfo;

    const downloadQueue = await downloadMultiplePage2(
      worksId,
      '',
      viewportWidth,
      query // 通用模版时传递 undefined，不传任何query参数
    ).catch(error => {
      toast.error('图片生成失败');
      sendFeishuMessage(
        '图片下载',
        `网页图片生成失败`,
        `${error}-work:${worksId}`
      );
      return null;
    });

    return downloadQueue;
  };

  const saveImageToDevice = async (
    downloadQueue: DownloadQueue[],
    title: string
  ) => {
    if (downloadQueue.length === 0) {
      toast.error('没有可下载的图片');
      return;
    }

    // 过滤掉无效的URL，确保只传递有效的URL给App
    const urls = downloadQueue
      .map(item => item.url)
      .filter((url): url is string => Boolean(url && url.trim()));

    await trpc.works.update
      .mutate({
        id: worksId,
        cover: urls?.[0],
      })
      .catch(err => {
        console.log('updateWorksDetail2Err', err);
        toast.error('更新封面失败');
      });

    if (APPBridge.judgeIsInApp()) {
      if (urls.length === 0) {
        toast.error('没有可下载的图片');
        return;
      }

      // APPBridge.appCall(
      //   {
      //     type: 'MKSaveImage',
      //     appid: 'jiantie',
      //     params: {
      //       urls: urls,
      //     },
      //     jsCbFnName: 'appBridgeOnSaveImagedCb',
      //   },
      //   e => {
      //     if (e) {
      //       setFileUri(e.fileuri);
      //     }
      //   },
      //   3000000
      // );

      if (getAppId() === 'maka') {
        urls.forEach(url => {
          APPBridge.appCall({
            type: 'MKSaveImage',
            appid: 'jiantie',
            params: {
              urls: [url],
            },
            jsCbFnName: 'appBridgeOnSaveImagedCb',
          });
        });
      } else {
        APPBridge.appCall(
          {
            type: 'MKSaveImage',
            appid: 'jiantie',
            params: {
              urls: urls,
            },
            jsCbFnName: 'appBridgeOnSaveImagedCb',
          },
          e => {
            if (e) {
              setFileUri(e.fileuri);
            }
          },
          3000000
        );
      }
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav(
        'navigate',
        `/pages/imagepreview/index?url=${encodeURIComponent(urls?.[0] || '')}&title=${title}`
      );
    } else if (urls && urls.length) {
      // 浏览器下载
      if (urls.length > 1) {
        // 使用 downloadQueue 中的正确文件名，避免文件名冲突
        await zipImageFromUrl(downloadQueue);
      } else {
        const response = await fetch(urls?.[0]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        FileSaver.saveAs(blob, `${title}.png`);
      }
    } else {
      toast.error('下载失败，请检查网络3');
    }
  };

  const handleBatchDownload = async (_selectedInvitees = selectedInvitees) => {
    // 先检查分享权限
    const hasPermission = await store.checkSharePermission(worksId, {
      trackData: {
        works_id: worksId,
        ref_object_id: worksDetail?.template_id || '',
        tab: 'personal',
        works_type: 'poster',
        vipType: 'share',
      },
    });

    // 权限检查失败，不跳转（VIP 弹窗已由 checkSharePermission 处理）
    if (!hasPermission) {
      return;
    }

    // 如果未选择嘉宾，则自动拉取全部嘉宾列表（含通用模版）
    let inviteesToDownload = _selectedInvitees;
    if (!inviteesToDownload.length) {
      try {
        const allInvitees =
          (await trpc.rsvp.listInvitees.query({
            works_id: worksId,
          })) || [];
        inviteesToDownload = [
          { id: GENERAL_TEMPLATE_ID, name: '通用模版' },
          ...allInvitees,
        ];
        setSelectedInvitees(inviteesToDownload);
      } catch (error: any) {
        toast.error(error?.message || '加载嘉宾列表失败');
        return;
      }
    }

    if (!inviteesToDownload.length) {
      toast.error('暂无嘉宾可下载');
      return;
    }

    setDownloading(true);
    setCompletedCount(0);
    setExpectedCount(0);

    try {
      // 先估算总图片数量
      const estimatedTotal = inviteesToDownload.length;
      setExpectedCount(estimatedTotal);

      // 串行下载：逐个处理，等待上一张完成后再开始下一张
      const queues: DownloadQueue[] = [];

      for (let i = 0; i < inviteesToDownload.length; i++) {
        const invitee = inviteesToDownload[i];
        const isGeneralTemplate = invitee.id === GENERAL_TEMPLATE_ID;
        const queue = await onScreenshotPoster(
          isGeneralTemplate
            ? undefined
            : {
              guest_name: invitee.name,
            }
        );

        if (queue) {
          queues.push(queue);
        }

        // 更新已完成数量
        setCompletedCount(i + 1);
      }

      const actualTotal = queues.length;
      setExpectedCount(actualTotal);

      const downloadTitle =
        inviteesToDownload.length === 1
          ? inviteesToDownload[0].name
          : '批量下载';

      await saveImageToDevice(queues, downloadTitle);

      const selectedCount = inviteesToDownload.length;
      const generalTemplateCount = inviteesToDownload.filter(
        inv => inv.id === GENERAL_TEMPLATE_ID
      ).length;
      const guestCount = selectedCount - generalTemplateCount;

      let successMessage = '';
      if (generalTemplateCount > 0 && guestCount > 0) {
        successMessage = `已下载 ${generalTemplateCount} 个通用模版和 ${guestCount} 位嘉宾`;
      } else if (generalTemplateCount > 0) {
        successMessage = `已下载 ${generalTemplateCount} 个通用模版`;
      } else {
        successMessage = `已下载 ${guestCount} 位嘉宾`;
      }
      toast.success(successMessage);
    } catch (error: any) {
      console.error('batch download failed', error);
      toast.error(error?.message || '下载失败，请稍后重试2');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div
        id='showInviteeManagerTrigger'
        onClick={() => {
          setShowModal(true);
        }}
      ></div>
      <ResponsiveDialog
        // direction='right'
        // showCloseIcon={false}
        isOpen={showModal}
        // title='下载邀请函'
        // showCloseIcon={false}
        onOpenChange={open => {
          setShowModal(open);
        }}
        // handleOnly
        title='个性化嘉宾名单'
        dismissible={false}
        contentProps={{
          className: 'max-h-[80vh]',
        }}
      >
        <div className='flex flex-col max-h-full h-full overflow-hidden'>
          <InviteeManager
            worksId={worksId || ''}
            onSelectionChange={setSelectedInvitees}
            enableBatchMode={isBatchMode}
            onPreview={
              !inEditor
                ? undefined
                : item => {
                  // 将自身url添加变量值
                  const url = new URL(window.location.href);
                  url.searchParams.set('guest_name', item?.name || '');
                  window.history.pushState({}, '', url.toString());
                  setShowModal(false);
                  onUpdate?.();
                }
            }
            onDownload={async invitee => {
              // 先检查分享权限
              const hasPermission = await store.checkSharePermission(worksId, {
                trackData: {
                  works_id: worksId,
                  ref_object_id: worksDetail?.template_id || '',
                  works_type: 'poster',
                  tab: 'personal',
                  vipType: 'share',
                },
              });

              // 权限检查失败，不跳转（VIP 弹窗已由 checkSharePermission 处理）
              if (!hasPermission) {
                return;
              }
              if (invitee) {
                setSelectedInvitees([invitee]);
                handleBatchDownload([invitee]);
              } else {
                setDownloading(true);
                setCompletedCount(0);
                setExpectedCount(1);
                onScreenshotPoster(undefined)
                  .then(downloadQueue => {
                    setDownloading(false);
                    saveImageToDevice(
                      downloadQueue ? [downloadQueue] : [],
                      '下载邀请函'
                    );
                  })
                  .catch(error => {
                    console.log('error', error);
                    toast.error(error?.message || '下载失败，请稍后重试1');
                  })
                  .finally(() => {
                    setDownloading(false);
                  });
              }
            }}
          />
          <div className='footer sticky bottom-0 bg-white p-4 border-t border-gray-100'>
            <div className='flex items-center gap-3'>
              <Button
                variant={'outline'}
                className='flex-1'
                onClick={() => {
                  setIsBatchMode(prev => !prev);
                  if (isBatchMode) {
                    // 退出多选模式时清空选择
                    setSelectedInvitees([]);
                  }
                }}
              >
                {isBatchMode ? '取消多选' : '多选'}
              </Button>
              <Button
                onClick={() => handleBatchDownload()}
                disabled={downloading}
                className='flex-1'
              >
                {downloading
                  ? '下载中...'
                  : selectedInvitees.length
                    ? `批量下载（${selectedInvitees.length}项）`
                    : '批量下载'}
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveDialog>
      <DownloadProgressDialog
        isOpen={downloading}
        onOpenChange={setDownloading}
        expectedCount={expectedCount}
        completedCount={completedCount}
      />
    </>
  );
}
