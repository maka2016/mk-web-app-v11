'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getAppId } from '@/services';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { cdnApi, setWorksDetail } from '@mk/services';
import { isAndroid, isMakaAppClient, isPc } from '@mk/utils';
import {
  downloadMultiplePage,
  zipImageFromUrl,
} from '@mk/widgets/GridV3/DesignerToolForEditor/HeaderV2/services';
import { getCanvaInfo2 } from '@mk/widgets/GridV3/comp/provider/utils';
import { getAllBlock, onScreenShot } from '@mk/widgets/GridV3/shared';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import FileSaver from 'file-saver';
import { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { sendFeishuMessage } from '../../../../utils/feishu';
import styles from './index.module.scss';

interface Props {
  worksId: string;
}

const pageWidth = 182;
const pageHeight = 319;
const innerWidth = 375;
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
  const [blockCount, setBlockCount] = useState(1);

  const [resolvedWorksDetail, setResolvedWorksDetail] = useState<any>();
  const [isPC, setIsPC] = useState(false);
  const [isMiniProgram, setIsMiniProgram] = useState(false);
  const [iframeStyle, setIframeStyle] = useState<React.CSSProperties>({
    width: innerWidth,
    height: Math.floor(pageHeight / (pageWidth / innerWidth)),
    transform: `scale(${pageWidth / innerWidth})`,
  });
  const [borderWidth, setBorderWidth] = useState(4);
  const [showRemoveWatermark, setShowRemoveWatermark] = useState(false);
  const { canExportWithoutWatermark, canShareWithoutWatermark } =
    useCheckPublish();

  const appid = getAppId();

  const getWorksData = async () => {
    const res = (await trpc.works.getWorksData.query({ id: worksId })) as any;
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

  const handleDownloadImage = async (urls: string[], title: string) => {
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
    } else if (urls && urls.length) {
      // 浏览器下载
      if (urls.length > 1) {
        await zipImageFromUrl(urls.map(url => ({ url, filename: title })));
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

  const onScreenshotPoster = async () => {
    if (downloading) {
      return;
    }

    const res = await getWorksData();
    const currentWorksData = res.worksData;
    const currentWorksDetail = res.detail;
    setWorksDetail(currentWorksDetail);
    setResolvedWorksDetail(currentWorksDetail);

    const canvaInfo2 = getCanvaInfo2(currentWorksDetail, currentWorksData);
    const { websiteSupport } = canvaInfo2.shareInfo;
    const checkFunction = websiteSupport
      ? canShareWithoutWatermark
      : canExportWithoutWatermark;

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
    console.log('appid', appid);

    const allBlocks = !currentWorksDetail.specInfo.is_flat_page
      ? getAllBlock(currentWorksData)
      : null;
    if (!allBlocks) {
      // 兼容v1版本的下载
      const screenshotRes = await onScreenShot({
        id: worksId,
        width: size.width,
        height: size.height,
        appid,
      }).catch(() => {
        toast.error('图片生成失败');
        setDownloading(false);

        sendFeishuMessage(
          '图片下载',
          `网页图片生成失败`,
          `${JSON.stringify(screenshotRes)}-work:${worksId}`
        );
      });
      console.log('screenshotRes', screenshotRes);

      sendFeishuMessage(
        '图片下载',
        `网页图片生成成功`,
        `${JSON.stringify(screenshotRes)}-work:${worksId}`
      );

      await handleDownloadImage(screenshotRes, currentWorksDetail.title);
    } else {
      setBlockCount(allBlocks.length);
      console.log('allBlocks', allBlocks);
      console.log('canvaVisualHeight', canvaVisualHeight);
      const screenshotRes = await downloadMultiplePage(
        allBlocks,
        canvaVisualHeight
      ).catch(() => {
        toast.error('图片生成失败');
        setDownloading(false);
      });
      if (screenshotRes) {
        sendFeishuMessage(
          '图片下载',
          `网页图片生成成功`,
          `${JSON.stringify(screenshotRes)}-work:${worksId}`
        );
        await handleDownloadImage(
          screenshotRes.map(item => item.url),
          currentWorksDetail.title
        );
      }
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
    setIsPC(isPc());
    setIsMiniProgram(APPBridge.judgeIsInMiniP());
    isSupportSharePosterFunc().then(res => {
      setIsSupportSharePoster(res);
    });
    // setIframeStyle({
    //   width: window.innerWidth,
    //   height: Math.floor(pageHeight / (pageWidth / window.innerWidth)),
    //   transform: `scale(${pageWidth / window.innerWidth})`,
    // });
    setBorderWidth(4 / (pageWidth / innerWidth));

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

  const toHomePage = () => {
    if (appid === 'maka' && !APPBridge.isRN()) {
      APPBridge.navToPage({
        url: 'maka://main/mainActivity',
        type: 'NATIVE',
      });
    } else if (APPBridge.isRN()) {
      APPBridge.navAppBack();
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
            <div className={styles.tit}>图片导出中，共{blockCount}张</div>
            <div className={styles.desc}>请保持屏幕点亮,不要锁屏或切换程序</div>
          </div>
        </>
      ) : (
        !isPC && (
          <div className={styles.footer}>
            <BehaviorBox
              behavior={{
                object_type: 'share_wechat_btn',
                object_id: worksId,
              }}
              className='w-full'
              onClick={() => {
                if (isMiniProgram) {
                  APPBridge.minipNav(
                    'navigate',
                    `/pages/imagepreview/index?url=${encodeURIComponent(fullUrls[0])}&title=${resolvedWorksDetail.title}`
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
                />
                分享到微信
              </Button>
            </BehaviorBox>

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
        )
      )}
      <Toaster />
    </div>
  );
};

export default PosterExport;
