'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getShareInfo } from '@/components/GridEditorV3/provider/utils';
import { onScreenShot } from '@/components/GridEditorV3/utils';
import { cdnApi, getAppId, getUid, getWorkData2, request, updateWorksDetail2 } from '@/services';
import APPBridge from '@/store/app-bridge';
import { imageUrlToBase64, isPc, toOssMiniPCoverUrl } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import FileSaver from 'file-saver';
import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';
interface Props {
  worksId: string;
}

const pageWidth = 182;
const pageHeight = 319;
const innerWidth = 720;

const topColor = '#0000FF';
const bottomColor = '#FF00B7';

const VideoExport = (props: Props) => {
  const { worksId } = props;
  const appid = getAppId();
  const [loading, setLoading] = useState(true);
  const [worksDetail, setWorksDetail] = useState<any>();
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [showShareTip, setShowShareTip] = useState(false);
  const [shareDouyinVideo, setShareDouyinVideo] = useState(false);
  const [shareWechatVideo, setShareWechatVideo] = useState(false);
  const [isMiniProgram, setIsMiniProgram] = useState(false);
  const [isPC, setIsPC] = useState(false);
  const [borderWidth, setBorderWidth] = useState(4 / (pageWidth / innerWidth));
  const [showRemoveWatermark, setShowRemoveWatermark] = useState(false);
  const { canExportWithoutWatermark, canShareWithoutWatermark } =
    useCheckPublish();

  const taskId = useRef<number>(null);
  const animationRef = useRef<any>(null);
  const startTimeRef = useRef<any>(null);
  const lastUpdateRef = useRef<any>(null);
  const speedFactorRef = useRef<any>(1); // 初始速度因子
  const completedRef = useRef<boolean>(false);
  const pollIntervalRef = useRef<any>(null);

  const TOTAL_DURATION = 60000; // 120秒 = 2分钟
  const PROGRESS_CAP_BEFORE_DONE = 99.5; // 未完成前的上限

  const [iframeStyle, setIframeStyle] = useState<React.CSSProperties>({
    width: innerWidth,
    height: Math.floor(pageHeight / (pageWidth / innerWidth)),
    transform: `scale(${pageWidth / innerWidth})`,
  });

  const prefixUrl = (url: string) => {
    if (url.indexOf('http') === -1 || url.indexOf('https') === -1) {
      return 'https://res.maka.im' + url;
    }
    return url;
  };

  const getWorksData = async () => {
    const res = (await getWorkData2(worksId)) as any;
    const worksData = res?.work_data;
    const detail = res?.detail;

    return {
      worksData,
      detail,
    };
  };

  const updateCover = async () => {
    const screenshotRes = await onScreenShot({
      id: worksId,
      width: 375,
      height: 375,
      appid,
    });
    updateWorksDetail2(worksId, {
      cover: screenshotRes[0],
    } as any);
  };

  const onSave = async (url: string, title: string) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall(
        {
          type: 'MkVideoDownload',
          appid: 'jiantie',
          jsCbFnName: 'appBridgeOnVideoDownloadCb',
          params: {
            url: prefixUrl(url),
            name: `${worksDetail?.title}.mp4`,
          },
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
        `/pages/videopreview/index?url=${encodeURIComponent(prefixUrl(url))}&title=${title || '预览'}`
      );
      history.back();
    } else {
      console.log('download', url, title);
      const response = await fetch(prefixUrl(url));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      FileSaver.saveAs(blob, `${worksDetail?.title}.mp4`);
    }
  };

  // 模拟API状态检查
  const checkStatus = async () => {
    if (!taskId.current) return false;
    const url = `https://www.maka.im/mk-gif-generator/screenshot-v3/get-task-by-id/${taskId.current}`;
    const res = await request.get(url);
    if (res.data.status === 2) {
      await onSave(res.data.oss_path, worksDetail?.title);
      setVideoUrl(res.data.oss_path);
    }
    return res.data.status === 2;
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPollingUntilDone = () => {
    if (pollIntervalRef.current || !taskId.current) return;
    pollIntervalRef.current = setInterval(async () => {
      const done = await checkStatus();
      if (done) {
        completedRef.current = true;
        setProgress(100);
        stopPolling();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      } else {
        speedFactorRef.current = 0.25; // 降速到25%
      }
    }, 3000);
  };

  const updateProgress = (timestamp: number) => {
    if (completedRef.current) {
      setProgress(100);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    if (!startTimeRef.current) startTimeRef.current = timestamp;
    if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;

    const deltaTime = timestamp - lastUpdateRef.current;
    lastUpdateRef.current = timestamp;

    // 线性前进，直到未完成上限
    const baseIncrement =
      (100 / TOTAL_DURATION) * speedFactorRef.current * deltaTime;
    setProgress(prev => {
      if (completedRef.current) return 100;
      const next = prev + baseIncrement;
      return next >= PROGRESS_CAP_BEFORE_DONE ? PROGRESS_CAP_BEFORE_DONE : next;
    });

    animationRef.current = requestAnimationFrame(updateProgress);
  };

  const initAPPJudge = async () => {
    let feature = await APPBridge.featureDetect([
      'ShareDouyinVideo',
      'MkShareWechatVideo',
    ]);
    setShareDouyinVideo(feature.ShareDouyinVideo);
    setShareWechatVideo(feature.MkShareWechatVideo);
  };

  useEffect(() => {
    setIsPC(isPc());
    setIsMiniProgram(APPBridge.judgeIsInMiniP());
    initAPPJudge();
    animationRef.current = requestAnimationFrame(updateProgress);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopPolling();
    };
  }, []);

  const onExportVideo = async () => {
    setLoading(true);
    const res = await getWorksData();
    const worksData = res.worksData;
    const worksDetail = res.detail;
    setWorksDetail(worksDetail);

    const { websiteSupport } = getShareInfo(worksDetail);
    const checkFunction = websiteSupport
      ? canShareWithoutWatermark
      : canExportWithoutWatermark;

    checkFunction(worksId).then(res => {
      setShowRemoveWatermark(!res);
    });

    const urlParams = {
      appid,
      uid: getUid(),
      works_id: worksId,
      title: worksDetail?.title || '',
      music_url: worksData?.music?.url || '',
      viewer_url: `https://jiantieapp.com/viewer2/${worksId}?appid=${appid}&exportVideo=1`,
      thumb: worksDetail.cover,
      version: worksDetail.version,
    };
    const url = `https://www.maka.im/mk-gif-generator/screenshot-v3/export-video-async?${new URLSearchParams(urlParams).toString()}`;
    const task = await request.get(url);
    taskId.current = task.data.id;

    startPollingUntilDone();
    setLoading(false);
  };

  useEffect(() => {
    if (worksId) {
      onExportVideo();
      updateCover();
    }
  }, [worksId]);

  const shareWechatTimeline = () => {
    APPBridge.appCall({
      type: 'MkShareWechatVideo',
      appid: 'jiantie',
      params: {
        scene: '1', //0为分享到好友，1为分享到朋友圈
        thumb: '', //视频首图缩略图
        content: worksDetail?.desc || '',
        url: prefixUrl(videoUrl),
        fileuri: fileUri,
        title: worksDetail?.title || '',
      },
    });
  };

  const shareWechat = async () => {
    if (shareWechatVideo && appid === 'maka') {
      APPBridge.appCall({
        type: 'MkShareWechatVideo',
        params: {
          scene: '0', //0为分享到好友，1为分享到朋友圈
          thumb: '', //视频首图缩略图
          content: worksDetail?.desc || '',
          url: prefixUrl(videoUrl),
          fileuri: fileUri,
          title: worksDetail?.title || '',
        },
      });

      return;
    }

    if (APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav(
        'navigate',
        `/pages/videopreview/index?url=${encodeURIComponent(prefixUrl(videoUrl))}&title=${worksDetail.title || '预览'}`
      );
      return;
    }

    if ((await APPBridge.featureDetect(['MKShareMiniP']))?.MKShareMiniP) {
      console.log('MKShareMiniP', worksDetail);
      APPBridge.appCall({
        type: 'MKShareMiniP',
        params: {
          webpageUrl: prefixUrl(videoUrl),
          path: `/pages/videopreview/index?url=${encodeURIComponent(prefixUrl(videoUrl))}&title=${'简帖视频'}&hideBtn=true`,
          title: '',
          description: worksDetail.desc,
          thumb: worksDetail.cover,
          scene: '0',
          userName: appid === 'xueji' ? 'gh_63de5d64f1cd' : 'gh_8255ff6e659c',
        },
      });
      return;
    }

    const base64 = await imageUrlToBase64(
      toOssMiniPCoverUrl(worksDetail.cover)
    );
    const shareLink = `https://www.jiantieapp.com/viewer2/${worksId}?appid=${appid}`;

    let APPLETSV2Enable = await APPBridge.featureDetect(['APPLETSV2']);
    if (APPLETSV2Enable.APPLETSV2) {
      APPBridge.appCall({
        type: 'MKRouter',
        appid: 'jiantie',
        params: {
          type: 'APPLETSV2',
          path: `/pages/videopreview/index?url=${encodeURIComponent(prefixUrl(videoUrl))}&title=${worksDetail.title || '预览'}&hideBtn=true`,
          userName: appid === 'xueji' ? 'gh_63de5d64f1cd' : 'gh_8255ff6e659c',
          title: worksDetail.title,
          description: worksDetail.desc,
          imageUrl: toOssMiniPCoverUrl(worksDetail.cover),
          hdImageData: base64,
          webpageUrl: shareLink,
          withShareTicket: 'true',
          miniprogramType: '0',
          scene: '0',
        },
      });
    } else {
      APPBridge.appCall({
        type: 'MKShare',
        appid: 'jiantie',
        params: {
          title: worksDetail?.title || '',
          content: worksDetail?.desc || '',
          thumb: `${cdnApi(worksDetail?.cover, {
            resizeWidth: 120,
            format: 'webp',
          })}`,
          type: 'link',
          shareType: 'wechat', //微信好友：wechat， 微信朋友圈：wechatTimeline，复制链接：copyLink，二维码分享：qrCode，更多(系统分享)：system
          url: `${location.origin}/viewer2/${worksId}?appid=${appid}`, // 只传一个链接
        },
      });
    }
  };

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
    if (appid === 'maka' && !APPBridge.isRN()) {
      APPBridge.navToPage({
        url: 'maka://main/mainActivity',
        type: 'NATIVE',
      });
    } else if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: 'maka://home/activity/activityPage?default_tab=1',
        type: 'NATIVE',
      });
    } else {
      history.back();
    }
  };

  const clamp = (n: number, min = 0, max = 100) =>
    Math.max(min, Math.min(max, n));
  const p = clamp(progress) / 100;

  // 计算四边填充长度
  const w = +(iframeStyle.width || 0) + borderWidth;
  const h = +(iframeStyle.height || 0) + borderWidth;
  const P = 2 * (w + h) + borderWidth * 4;
  const L = P * p; // 需要被“点亮”的总长度
  const fillTop = Math.max(0, Math.min(L, w));
  const fillRight = Math.max(0, Math.min(Math.max(L - w, 0), h));
  const fillBottom = Math.max(0, Math.min(Math.max(L - w - h, 0), w));
  const fillLeft = Math.max(0, Math.min(Math.max(L - w - h - w, 0), h));

  return (
    <div className={styles.container}>
      {videoUrl ? (
        <MobileHeader
          title={videoUrl ? '视频保存到相册' : ''}
          rightContent={
            <Button size='sm' variant='ghost'>
              完成
            </Button>
          }
          onRightClick={toHomePage}
        />
      ) : (
        <div className={styles.header}>
          <Icon
            name='close'
            size={24}
            color='#151515'
            onClick={() => onClosePage()}
          />
        </div>
      )}
      <div className={styles.content}>
        <div className={styles.iframeContainer}>
          <div className={styles.border} style={iframeStyle}>
            <iframe
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              src={`/viewer2/${worksId}?appid=${appid}&exportVideo=1`}
            />

            {!videoUrl && (
              <>
                {/* 上边（从左→右） */}
                <div
                  className={styles.top}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: -borderWidth,
                    height: borderWidth,
                    width: fillTop,
                    pointerEvents: 'none',
                    background: topColor, // 顶部纯蓝
                  }}
                />
                {/* 右边（从上→下） */}
                <div
                  className={styles.right}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -borderWidth,
                    width: borderWidth,
                    height: fillRight,
                    pointerEvents: 'none',
                    // 竖向渐变：上蓝下粉
                    background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})`,
                  }}
                />
                {/* 下边（从右→左 填充，所以放在左侧，通过宽度表现；想从左到右可改逻辑） */}
                <div
                  className={styles.bottom}
                  style={{
                    position: 'absolute',
                    left: -borderWidth + (w - fillBottom),
                    bottom: -borderWidth,
                    height: borderWidth,
                    width: fillBottom,
                    pointerEvents: 'none',
                    background: bottomColor, // 底部纯粉
                  }}
                />
                {/* 左边（从下→上） */}
                <div
                  className={styles.left}
                  style={{
                    position: 'absolute',
                    left: -borderWidth,
                    bottom: 0,
                    width: borderWidth,
                    height: fillLeft,
                    pointerEvents: 'none',
                    background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})`,
                  }}
                />
              </>
            )}
          </div>
        </div>
        {!videoUrl && (
          <div className={styles.progress}>{progress.toFixed(2)}%</div>
        )}
      </div>
      {!videoUrl && (
        <div className={styles.tip}>
          <div className={styles.tit}>视频导出中...</div>
          <div className={styles.desc}>请保持屏幕点亮,不要锁屏或切换程序</div>
        </div>
      )}
      {videoUrl && !isPC && (
        <div className={styles.footer}>
          <BehaviorBox
            behavior={{
              object_type: 'share_wechat_btn',
              object_id: worksId,
            }}
            className='w-full hidden'
            onClick={() => shareWechat()}
          >
            <Button size='lg' className='flex items-center gap-1 w-full'>
              {isMiniProgram ? (
                '保存到相册'
              ) : (
                <>
                  <img
                    className='size-5'
                    src='https://img2.maka.im/cdn/webstore10/jiantie/WeChat-fill.png'
                  />
                  分享到微信
                </>
              )}
            </Button>
          </BehaviorBox>
          <div className={styles.shareTypes}>
            {/* {isMakaAppClient() && shareWechatVideo && false && (
              <BehaviorBox
                behavior={{
                  object_type: 'share_wechat_timeline_btn',
                  object_id: worksId,
                }}
                className={styles.shareTypeItem}
                onClick={() => shareWechatTimeline()}
              >
                <img
                  src='https://img2.maka.im/cdn/webstore10/jiantie/friends-circle-fill.png'
                  alt=''
                />
                <span>朋友圈</span>
              </BehaviorBox>
            )} */}
            {/*{
              isMakaAppClient() && <BehaviorBox
                behavior={{
                  object_type: "share_wechat_timeline_btn",
                  object_id: worksId,
                }}
                className={styles.shareTypeItem}
                onClick={() => shareWechat()}
              >
                <img
                  src="https://res.maka.im/cdn/webstore10/jiantie/%E5%BE%AE%E4%BF%A1%E5%B0%8F%E7%A8%8B%E5%BA%8F.png"
                  alt=""
                />
                <span>小程序</span>
              </BehaviorBox>
            } */}

            <div
              className={styles.shareTypeItem}
              onClick={() => {
                console.log('download', videoUrl, worksDetail?.title);
                onSave(videoUrl, worksDetail?.title);
                toast.success('下载中...', {
                  duration: 100000,
                });
              }}
            >
              <div className={styles.shareIcon}>
                <Download size={30} />
              </div>
              <span className={styles.shareText}>下载到本地</span>
            </div>

            {shareDouyinVideo ||
              (!isMiniProgram && (
                <div
                  className={styles.shareTypeItem}
                  onClick={() => {
                    if (isMiniProgram) {
                      setShowShareTip(true);
                      return;
                    }

                    APPBridge.appCall({
                      params: {
                        url: prefixUrl(videoUrl),
                        fileuri: fileUri,
                        name: `${worksDetail.title}.mp4`,
                      },
                      appid: 'jiantie',
                      type: 'MkShareDouyinVideo',
                    });
                  }}
                >
                  <div className={styles.shareIcon}>
                    <img
                      src={cdnApi(
                        '/cdn/webstore10/jiantie/icon_douyin_v3.png?v=1'
                      )}
                      alt=''
                    />
                  </div>
                  <span className={styles.shareText}>抖音</span>
                </div>
              ))}

            {showRemoveWatermark && (
              <div
                className={styles.shareTypeItem}
                onClick={() => {
                  toVipPage({
                    works_id: worksId,
                    disable_trial: true,
                  });
                }}
              >
                <div className={styles.shareIcon}>
                  <img
                    src={cdnApi('/cdn/webstore10/jiantie/icon_export.png?v=1')}
                    alt=''
                  />
                </div>
                <span className={styles.shareText}>去水印</span>
              </div>
            )}
          </div>
        </div>
      )}

      <ResponsiveDialog
        isDialog
        isOpen={showShareTip}
        onOpenChange={setShowShareTip}
        contentProps={{
          className: 'w-[320px]',
        }}
      >
        <div className={styles.dialog}>
          <div className={styles.title}>视频已保存到相册</div>
          <div className='flex items-center justify-center text-base gap-2 my-2'>
            <img
              className='size-4'
              src={cdnApi('/cdn/webstore10/jiantie/icon_douyin.png')}
              alt=''
            />
            请打开抖音进行分享
          </div>
          <img src={cdnApi('/cdn/webstore10/jiantie/douyin_share.png')} />
        </div>
        <div className='p-3'>
          <Button
            size='lg'
            className='w-full'
            onClick={() => setShowShareTip(false)}
          >
            知道了
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default VideoExport;
