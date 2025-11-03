'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getAppId } from '@/services';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
import { isAndroid, isMakaAppClient } from '@mk/utils';
import { getCanvaInfo2 } from '@mk/widgets/GridV3/comp/provider/utils';
import { onScreenShot } from '@mk/widgets/GridV3/shared';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';
interface Props {
  worksId: string;
}

const pageWidth = 182;
const pageHeight = 319;
const topColor = '#0000FF';
const bottomColor = '#FF00B7';
const PosterExport = (props: Props) => {
  const { worksId } = props;
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fullUrls, setFullUrls] = useState<string[]>([]);
  const timer = useRef<any>(null);
  const [isSupportSharePoster, setIsSupportSharePoster] = useState(false);
  const [fileUri, setFileUri] = useState('');

  const [resolvedWorksDetail, setResolvedWorksDetail] = useState<any>();
  const [isMiniProgram, setIsMiniProgram] = useState(false);
  const [iframeStyle, setIframeStyle] = useState<React.CSSProperties>({
    width: 375,
    height: Math.floor(pageHeight / (pageWidth / 375)),
    transform: `scale(${pageWidth / 375})`,
  });
  const [borderWidth, setBorderWidth] = useState(4);
  const [showRemoveWatermark, setShowRemoveWatermark] = useState(false);
  const { removeWatermark, h5Share } = useCheckPublish();

  const appid = getAppId();

  const getWorksData = async () => {
    const res = await getWorkData2(worksId);
    const worksData = res?.work_data;
    const detail = res?.detail;

    return {
      worksData,
      detail,
    };
  };

  const onProgress = () => {
    timer.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1;
        // 到达100%时停止定时器
        if (newProgress >= 100) {
          clearInterval(timer.current);
          timer.current = null;
          return 100;
        }
        return newProgress;
      });
    }, 60);
  };

  const onScreenshotPoster = async () => {
    if (downloading) {
      return;
    }

    const res = await getWorksData();
    const currentWorksData = res.worksData;
    const currentWorksDetail = res.detail;
    setResolvedWorksDetail(currentWorksDetail);

    const canvaInfo2 = getCanvaInfo2(
      currentWorksDetail as any,
      currentWorksData as any
    );
    const { websiteSupport } = canvaInfo2.shareInfo;
    const checkFunction = websiteSupport ? h5Share : removeWatermark;

    checkFunction(worksId).then(res => {
      setShowRemoveWatermark(!res);
    });

    if (!canvaInfo2) {
      toast.error('画布信息获取失败');
      return;
    }
    setDownloading(true);
    const { viewportWidth, canvaVisualHeight = 1, viewportScale } = canvaInfo2;
    const screenshotWidth = viewportWidth;
    const screenshotHeight = viewportScale * canvaVisualHeight;
    console.log('screenshotHeight', screenshotHeight);
    console.log('screenshotWidth', screenshotWidth);

    let size = {
      width: screenshotWidth,
      height: screenshotHeight,
    };
    const appid = getAppId();
    const screenshotRes = await onScreenShot({
      id: worksId,
      width: size.width,
      height: size.height,
      appid,
    }).catch(() => {
      toast.error('图片生成失败');
      setDownloading(false);
    });

    await updateWorksDetail2(worksId, {
      cover: screenshotRes[0],
    } as any);

    setFullUrls(screenshotRes);
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall(
        {
          type: 'MKSaveImage',
          appid: 'jiantie',
          params: {
            urls: screenshotRes,
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
        `/pages/imagepreview/index?url=${encodeURIComponent(screenshotRes[0])}&title=${currentWorksDetail.title}`
      );
    } else {
      window.open(screenshotRes[0]);
    }
    setDownloading(false);
    setProgress(100);
    clearInterval(timer.current);
    timer.current = null;
  };

  const onShare = (to: 'wechat' | 'wechatTimeline') => {
    let currentWorksDetail = resolvedWorksDetail;

    if (isSupportSharePoster) {
      APPBridge.appCall({
        type: 'MKShare',
        appid: 'jiantie',
        params: {
          title: currentWorksDetail?.title,
          type: 'images',
          shareType: to,
          urls: fullUrls,
          fileuri: fileUri,
        },
      });
    } else {
      const appid = getAppId();
      APPBridge.appCall({
        type: 'MKShare',
        appid: 'jiantie',
        params: {
          title: currentWorksDetail?.title || '',
          content: currentWorksDetail?.desc || '',
          thumb: `${cdnApi(currentWorksDetail?.cover, {
            resizeWidth: 120,
            format: 'webp',
          })}`,
          type: 'link',
          shareType: to, //微信好友：wechat， 微信朋友圈：wechatTimeline，复制链接：copyLink，二维码分享：qrCode，更多(系统分享)：system
          url: `${location.origin}/viewer2/${worksId}?appid=${appid}`, // 只传一个链接
        },
      });
    }
  };

  useEffect(() => {
    if (worksId) {
      onScreenshotPoster();
      onProgress();
    }
  }, [worksId]);

  const isSupportSharePosterFunc = async () => {
    if (APPBridge.isRN()) {
      let APPLETSV2Enable = await APPBridge.featureDetect(['MKShare']);
      return APPLETSV2Enable?.MKShare;
    } else if (isAndroid()) {
      let APPLETSV2Enable = await APPBridge.featureDetect([
        'WechatSharePoster',
      ]);
      return APPLETSV2Enable.WechatSharePoster;
    } else {
      return true;
    }
  };

  useEffect(() => {
    setIsMiniProgram(APPBridge.judgeIsInMiniP());
    isSupportSharePosterFunc().then(res => {
      setIsSupportSharePoster(res);
    });
    setIframeStyle({
      width: window.innerWidth,
      height: Math.floor(pageHeight / (pageWidth / window.innerWidth)),
      transform: `scale(${pageWidth / window.innerWidth})`,
    });
    setBorderWidth(4 / (pageWidth / window.innerWidth));

    return () => {
      clearInterval(timer.current);
      timer.current = null;
    };
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
      {fullUrls?.[0] ? (
        <MobileHeader
          title='图片已保存到相册'
          rightContent={
            <Button size='sm' variant='ghost'>
              完成
            </Button>
          }
          onRightClick={onClosePage}
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
        {!fullUrls.length && (
          <>
            <div className={styles.iframeContainer}>
              <div className={styles.border} style={iframeStyle}>
                <iframe
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  src={`/viewer2/${worksId}?appid=${appid}`}
                />

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
              </div>
            </div>

            <div className={styles.progress}>{progress.toFixed(2)}%</div>
          </>
        )}

        {fullUrls[0] && <img src={fullUrls[0]} alt='' />}
      </div>

      {!fullUrls.length ? (
        <>
          <div className={styles.tip}>
            <div className={styles.tit}>图片导出中...</div>
            <div className={styles.desc}>请保持屏幕点亮,不要锁屏或切换程序</div>
          </div>
        </>
      ) : (
        <div className={styles.footer}>
          {isMiniProgram ? (
            <Button
              size='lg'
              className='flex items-center gap-1 w-full'
              onClick={() => {
                APPBridge.minipNav(
                  'navigate',
                  `/pages/imagepreview/index?url=${encodeURIComponent(fullUrls[0])}&title=${resolvedWorksDetail.title}`
                );
              }}
            >
              <img
                className='size-5'
                src='https://img2.maka.im/cdn/webstore10/jiantie/WeChat-fill.png'
              />
              分享到微信
            </Button>
          ) : (
            <BehaviorBox
              behavior={{
                object_type: 'share_wechat_btn',
                object_id: worksId,
              }}
              className='w-full'
              onClick={() => onShare('wechat')}
            >
              <Button size='lg' className='flex items-center gap-1 w-full'>
                <img
                  className='size-5'
                  src='https://img2.maka.im/cdn/webstore10/jiantie/WeChat-fill.png'
                />
                分享到微信
              </Button>
            </BehaviorBox>
          )}

          <div className={styles.shareTypes}>
            {isMakaAppClient() && (
              <BehaviorBox
                behavior={{
                  object_type: 'share_wechat_timeline_btn',
                  object_id: worksId,
                }}
                className={styles.shareTypeItem}
                onClick={() => onShare('wechatTimeline')}
              >
                <img
                  src='https://img2.maka.im/cdn/webstore10/jiantie/friends-circle-fill.png'
                  alt=''
                />
                <span>朋友圈</span>
              </BehaviorBox>
            )}

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
                    src={cdnApi('/cdn/webstore10/jiantie/icon_export.png')}
                    alt=''
                  />
                </div>
                <span className={styles.shareText}>去水印</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PosterExport;
