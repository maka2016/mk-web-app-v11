'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { zipImageFromUrl } from '@/components/GridEditorV3/componentsForEditor/HeaderV2/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { checkSupportSharePoster, sharePoster } from '@/utils/poster-share';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import FileSaver from 'file-saver';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DownloadQueue, PosterPreview } from './components/PosterPreview';
interface Props {
  worksId: string;
}

const PosterExport = (props: Props) => {
  const { worksId } = props;
  const store = useStore();
  const router = useRouter();
  const [fullUrls, setFullUrls] = useState<string[]>([]);
  const [isSupportSharePoster, setIsSupportSharePoster] = useState(false);
  const [fileUri, setFileUri] = useState('');
  const searchParams = useSearchParams();
  const autoShare = searchParams.get('autoShare') === 'true';

  const [resolvedWorksDetail, setResolvedWorksDetail] =
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
    await handleDownloadImage(downloadQueue, resolvedWorksDetail?.title || '');
    if (autoShare) {
      console.log('autoShare', autoShare);
      await onShare('wechat');
    }
  };

  const onShare = async (to: 'wechat' | 'wechatTimeline') => {
    let currentWorksDetail = resolvedWorksDetail;

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

  const onClosePage = () => {
    if (APPBridge.judgeIsInApp()) {
      // 关闭页面
      APPBridge.appCall({
        type: 'MKPageClose',
      });
    } else {
      //如果没有的回去则跳转
      if (history.length <= 1) {
        window.location.href = '/';
        return;
      }
      history.back();
      return;
    }
  };

  const toHomePage = () => {
    store.toHome();
    return;
  };

  return (
    <div className='relative overflow-hidden h-full bg-white'>
      {fullUrls?.[0] ? (
        <MobileHeader
          title='图片已保存到相册'
          rightContent={
            <Button size='sm' variant='ghost'>
              完成
            </Button>
          }
          onRightClick={toHomePage}
        />
      ) : (
        <div className='px-4 sticky top-0 h-11 flex items-center justify-between bg-white border-b border-[#f0f0f0] z-[9]'>
          <Icon
            name='close'
            size={24}
            color='#151515'
            onClick={() => onClosePage()}
          />
        </div>
      )}
      <PosterPreview
        worksDetail={resolvedWorksDetail}
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
                  `/pages/imagepreview/index?url=${encodeURIComponent(fullUrls[0])}&title=${resolvedWorksDetail?.title || ''}`
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
        </div>
      )}
    </div>
  );
};

export default PosterExport;
