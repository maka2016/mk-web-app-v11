import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import {
  checkSupportSharePoster,
  isPc,
  SerializedWorksEntity,
  sharePoster,
  trpc,
} from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import FileSaver from 'file-saver';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BehaviorBox } from '../../../BehaviorTracker';
import { PosterPreview } from '../../../PosterPreview';
import { zipImageFromUrl } from '../../componentsForEditor/HeaderV2/services';

interface Props {
  worksDetail: SerializedWorksEntity;
}

const PosterExport = (props: Props) => {
  const { worksDetail: _worksDetail } = props;
  if (!_worksDetail.id) {
    return null;
  }
  const worksId = _worksDetail.id;
  const store = useStore();
  const router = useRouter();
  const [fullUrls, setFullUrls] = useState<string[]>([]);
  const [isSupportSharePoster, setIsSupportSharePoster] = useState(false);
  const [fileUri, setFileUri] = useState('');
  const searchParams = useSearchParams();
  const autoShare = searchParams.get('autoShare') === 'true';
  const isDownloadingRef = useRef(false); // 防止重复下载

  const [worksDetail, setResolvedWorksDetail] =
    useState<SerializedWorksEntity>();

  // 在组件挂载时获取作品数据
  useEffect(() => {
    trpc.works.findById.query({ id: worksId }).then(res => {
      setResolvedWorksDetail(res as unknown as SerializedWorksEntity);
    });
  }, [worksId]);

  const handleDownloadImage = async (
    downloadQueue: DownloadQueue[],
    title: string
  ) => {
    const urls = downloadQueue.map(item => item.url);
    await trpc.works.update
      .mutate({
        id: worksId,
        cover: urls?.[0],
      })
      .catch(err => {
        console.log('updateWorksDetail2Err', err);
        toast.error('更新封面失败');
      });

    setFullUrls(urls);

    if (APPBridge.judgeIsInApp()) {
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
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav(
        'navigate',
        `/pages/imagepreview/index?url=${encodeURIComponent(urls?.[0] || '')}&title=${title}`
      );
      router.back();
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
      toast.error('下载失败，请检查网络');
    }
  };

  // 处理下载完成的回调
  const handleDownloadComplete = async (downloadQueue: DownloadQueue[]) => {
    // 防止重复调用
    if (isDownloadingRef.current) {
      console.log('下载已在进行中，跳过重复调用');
      return;
    }

    // 如果已经有下载的URL，说明已经下载过了
    if (fullUrls.length > 0) {
      console.log('已经下载过，跳过重复下载');
      return;
    }

    isDownloadingRef.current = true;
    try {
      await handleDownloadImage(downloadQueue, worksDetail?.title || '');
      if (autoShare) {
        console.log('autoShare', autoShare);
        await onShare('wechat');
      }
    } finally {
      isDownloadingRef.current = false;
    }
  };

  const onShare = async (to: 'wechat' | 'wechatTimeline') => {
    let currentWorksDetail = worksDetail;

    // 使用通用分享函数
    await sharePoster({
      worksId: worksId,
      title: currentWorksDetail?.title || '',
      desc: currentWorksDetail?.desc || '',
      cover: currentWorksDetail?.cover,
      shareType: to,
      urls: fullUrls,
      fileUri: fileUri,
      isSupportSharePoster: isSupportSharePoster,
    });
  };

  useEffect(() => {
    // 使用通用的检测函数
    checkSupportSharePoster().then(res => {
      setIsSupportSharePoster(res);
    });
  }, []);

  if (!worksDetail) {
    return null;
  }

  return (
    <div className='relative overflow-hidden h-full bg-white'>
      <PosterPreview
        worksDetail={worksDetail}
        autoDownload={true}
        onDownloadComplete={handleDownloadComplete}
        containerClassName='p-4'
      />

      {!fullUrls.length ? (
        <>
          <div className='p-4 bg-white text-center'>
            <div
              className='font-semibold text-2xl leading-8 text-center text-black mb-3'
              style={{ fontFamily: 'PingFang SC' }}
            >
              图片导出中
            </div>
            <div
              className='font-normal text-sm leading-5 text-center text-black'
              style={{ fontFamily: 'PingFang SC' }}
            >
              请保持屏幕点亮,不要锁屏或切换程序
            </div>
          </div>
        </>
      ) : (
        <div className='flex items-center flex-col gap-3 w-full bg-white px-6 py-4'>
          {isPc() ? (
            <Button
              size='lg'
              className='flex items-center gap-1 w-full'
              onClick={async () => {
                // 重新下载：使用现有的 fullUrls 创建下载队列
                const downloadQueue: DownloadQueue[] = fullUrls.map(
                  (url, index) => ({
                    url,
                    filename:
                      fullUrls.length > 1
                        ? `页面${index + 1}.png`
                        : `${worksDetail?.title || '海报'}.png`,
                  })
                );
                await handleDownloadImage(
                  downloadQueue,
                  worksDetail?.title || ''
                );
              }}
            >
              再次下载
            </Button>
          ) : (
            <>
              <BehaviorBox
                behavior={{
                  object_type: 'share_wechat_btn',
                  object_id: worksId,
                }}
                className='w-full'
                onClick={() => {
                  if (store.environment.isInMiniP) {
                    APPBridge.minipNav(
                      'navigate',
                      `/pages/imagepreview/index?url=${encodeURIComponent(fullUrls[0])}&title=${worksDetail?.title || ''}`
                    );
                  } else {
                    onShare('wechat');
                  }
                }}
              >
                <Button size='lg' className='flex items-center gap-1 w-full'>
                  <img
                    className='size-5'
                    src='https://img2.maka.im/cdn/webstore10/jiantie/WeChat-fill.png'
                    alt='分享到微信'
                  />
                  分享到微信
                </Button>
              </BehaviorBox>

              <div className='flex items-center justify-center gap-3'>
                <BehaviorBox
                  behavior={{
                    object_type: 'share_wechat_timeline_btn',
                    object_id: worksId,
                  }}
                  className='min-w-[48px] p-1 flex items-center justify-center flex-col gap-1'
                  onClick={() => onShare('wechatTimeline')}
                >
                  <img
                    className='w-8 h-8'
                    src='https://img2.maka.im/cdn/webstore10/jiantie/friends-circle-fill.png'
                    alt=''
                  />
                  <span
                    className='font-semibold text-xs leading-[18px] text-center text-black'
                    style={{ fontFamily: 'PingFang SC' }}
                  >
                    朋友圈
                  </span>
                </BehaviorBox>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface DownloadQueue {
  url: string;
  filename: string;
}

/**
 * 普通海报下载组件
 */
export default function DownloadHelperForPoster({
  showModal,
  setShowModal,
  worksDetail,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  worksDetail: SerializedWorksEntity;
}) {
  return (
    <ResponsiveDialog
      isOpen={showModal}
      onOpenChange={open => {
        setShowModal(open);
      }}
      title='下载海报'
      dismissible={true}
    >
      <PosterExport worksDetail={worksDetail} />
    </ResponsiveDialog>
  );
}
