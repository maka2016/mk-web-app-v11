'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getAppId, getIsOverSeas, request, wechatSignature } from '@/services';
import APPBridge from '@mk/app-bridge';
import { API, cdnApi, WorksDetailEntity } from '@mk/services';
import { isPc, isWechat, queryToObj } from '@mk/utils';
import cls from 'classnames';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';
// import { Button } from "@workspace/ui/components/button";
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
// import { ResponsiveTooltip } from "@workspace/ui/components/responsive-tooltip";
import { ResponsiveDialog } from '@/components/Drawer';
import LibPicture from '@/components/LibPicture';
import MiniPShare from '@/components/MiniPShare';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { useStore } from '@/store';
import { getUrlWithParam, toOssMiniPCoverUrl } from '@/utils';
import { mkWebStoreLogger } from '@/utils/logger';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Icon } from '@workspace/ui/components/Icon';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import ImageCropper from './ImageCropper';
import { buildExportButtons, buildShareButtons } from './shareButtons';
// import { Separator } from "@workspace/ui/components/separator";
import { onScreenShot } from '@mk/widgets/GridV3/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { Loading } from '@workspace/ui/components/loading';
// import { IWorksData } from "@mk/works-store/types";
import { getAllLayers } from '@/app/editor/SimpleEditor/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { canUseRnChoosePic, showRnChoosePic } from '@/utils/rnChoosePic';
import { useShareNavigation } from '@/utils/share';
import {
  CanvaInfo2,
  getCanvaInfo2,
} from '@mk/widgets/GridV3/comp/provider/utils';
import { IWorksData } from '@mk/works-store/types';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import { QRCodeCanvas } from 'qrcode.react';

const list = [
  '诚挚邀请您参加我们的婚礼，见证我们的爱情之路，共享美好时刻！',
  '叮！我们的婚礼邀请正在派送中，请记得查收哦～',
  '我们结婚啦！请接收我们的邀请，等待你的回复哦～',
];

const title: any = {
  jiantie: '简帖',
  xueji: '学迹',
  huiyao: '会邀',
};

const Share = () => {
  const appid = getAppId();
  const isOversea = getIsOverSeas();
  const t = useTranslations('Share');
  const [shareIcon, setShareIcon] = useState('');
  const shareIconRef = useRef(shareIcon);
  const [shareTitle, setShareTitle] = useState(t('unnameWork'));
  const [shareContent, setShareContent] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [workInfo, setWorkInfo] = useState<WorksDetailEntity>({} as any);
  const [worksData, setWorksData] = useState<IWorksData>();
  const [wxReady, setWxReady] = useState(false);
  const [screenshotingCover, setScreenshotingCover] = useState(false);
  const [canvaInfo2, setCanvaInfo2] = useState<CanvaInfo2>();
  const { websiteSupport, videoSupport, posterSupport } =
    canvaInfo2?.shareInfo || {};

  const [showCopyTip, setShowCopyTip] = useState(false);

  const [showMiniPTip, setShowMiniPTip] = useState(false);

  const [isApp, setIsApp] = useState(false);
  const [isMiniP, setIsMiniP] = useState(false);
  const [isPC, setIsPC] = useState(false);

  const [appCanShareMiniP, setAppCanShareMiniP] = useState(false);

  const [showRmAd, setShowRmAd] = useState(false);

  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showPictureSelector, setShowPictureSelector] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [referenceShow, setReferenceShow] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const [showExportVideoDialog, setShowExportVideoDialog] = useState(false);
  const [showVideoDowload, setShowVideoDowload] = useState(false);
  const { setVipShow } = useStore();
  const [executingKey, setExecutingKey] = useState<string | null>(null);
  const [showGlobalWorking, setShowGlobalWorking] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [workMeta, setWorkMeta] = useState<{
    title: string;
    desc: string;
  } | null>(null);
  const [showWorkMetaDialog, setShowWorkMetaDialog] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const router = useRouter();
  const { toPosterShare, toVideoShare } = useShareNavigation();
  const { canExportWithoutWatermark, canShareWithoutWatermark } =
    useCheckPublish();

  const checkFirstVisit = (works_id: string) => {
    const visitedWorks = localStorage.getItem('visited_works');
    const visitedWorksArray = visitedWorks ? JSON.parse(visitedWorks) : [];

    if (!visitedWorksArray.includes(works_id)) {
      // This is the first visit
      visitedWorksArray.push(works_id);
      localStorage.setItem('visited_works', JSON.stringify(visitedWorksArray));
      setIsFirstVisit(true);
    }
  };

  // handlers moved to buildShareButtons

  const generateCover = async (works_id: string) => {
    const screenshotRes = await onScreenShot({
      id: works_id,
      width: 375,
      height: 375,
      appid,
    });
    setShareIcon(screenshotRes[0]);
    updateWorksDetail2(works_id, {
      cover: screenshotRes[0],
    } as any);
  };

  const generateWorkMeta = async (worksData: IWorksData) => {
    const layers = getAllLayers(worksData);
    let workText = '';

    layers.forEach(layer => {
      if (layer.elementRef === 'Text') {
        workText += layer.attrs.text;
      }
    });

    if (workText) {
      const res: any = await request.post(
        `${API('apiv10')}/ai-generate/work-meta`,
        {
          workText: workText?.slice(0, 500),
        }
      );

      if (res) {
        return {
          title: res.title,
          desc: res.desc,
        };
      }
    }

    return null;
  };

  const updateWorkMeta = async (works_id: string, worksData: IWorksData) => {
    const res = await generateWorkMeta(worksData);

    if (res) {
      setShareTitle(res.title);
      setShareContent(res.desc);

      updateWorksDetail2(works_id, {
        title: res.title,
        desc: res.desc,
        is_title_desc_modified: true,
      });
    }
  };

  const regenerateWorkMeta = async () => {
    if (!worksData) {
      toast.error('生成错误');
      return;
    }

    if (aiGenerating) {
      return;
    }
    setAiGenerating(true);

    const meta = await generateWorkMeta(worksData);
    setAiGenerating(false);

    if (meta) {
      setWorkMeta(meta);
      setShowWorkMetaDialog(true);
    }
  };

  const getWorkDetailInfo = async () => {
    const params = queryToObj();
    const { works_id } = params;
    const res = (await getWorkData2(works_id)) as any;
    const worksData = res?.work_data;
    const detail = res?.detail;
    if (!detail) {
      toast.error(t('notExist'));
      return;
    }

    toast.dismiss();
    setWorkInfo(detail);
    setWorksData(worksData);
    // setWorksData(worksData);
    setShareTitle(detail.title);
    setShareContent(detail.desc);
    const tasks: Promise<any>[] = [];
    if (!detail.cover || /gif/gi.test(detail.cover)) {
      tasks.push(generateCover(works_id));
    } else {
      setShareIcon(detail.cover);
    }
    if (res.work_data) {
      if (!detail.is_title_desc_modified) {
        tasks.push(updateWorkMeta(works_id, res.work_data));
      }
      setMusicUrl(res.work_data.canvasData.music.url);
    }

    const canvaInfo2 = getCanvaInfo2(detail, worksData);
    setCanvaInfo2(canvaInfo2);
    if (tasks.length) {
      setScreenshotingCover(true);
      await Promise.all(tasks);
      setScreenshotingCover(false);
    }
  };

  const updateShareData = () => {
    const wx = (window as any).wx;
    wx.updateAppMessageShareData({
      title: shareTitle,
      desc: shareContent,
      link: shareLink,
      imgUrl: `${cdnApi(shareIcon, {
        resizeWidth: 120,
        format: 'webp',
      })}`,
      success: function () {
        // 设置成功
      },
    });

    wx.updateTimelineShareData({
      title: shareTitle, // 分享标题
      link: shareLink, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
      imgUrl: `${cdnApi(shareIcon, {
        resizeWidth: 120,
        format: 'webp',
      })}`, // 分享图标
      success: function () {
        // 设置成功
      },
    });

    APPBridge.setShareInfo2MiniP({
      title: shareTitle,
      imageUrl: toOssMiniPCoverUrl(shareIcon),
      path: `/pages/viewer/index?url=${encodeURIComponent(shareLink)}&works_id=${workInfo.id}`,
    });
  };

  useEffect(() => {
    if (wxReady) {
      updateShareData();
    }
  }, [wxReady, shareTitle, shareContent, shareIcon]);

  useEffect(() => {
    setIsPC(appid === 'maka' && isPc());
    initAPPJudge();
    mkWebStoreLogger.track_pageview({
      page_type: 'share_page',
      page_id: queryToObj().works_id,
    });
  }, []);

  useEffect(() => {
    shareIconRef.current = shareIcon;
  }, [shareIcon]);

  const initAPPJudge = async () => {
    await APPBridge.init();
    setIsApp(APPBridge.judgeIsInApp());
    setIsMiniP(APPBridge.judgeIsInMiniP());
    let APPLETSV2Enable = await APPBridge.featureDetect([
      'APPLETSV2',
      'VideoDownload',
    ]);

    setAppCanShareMiniP(APPLETSV2Enable.APPLETSV2);

    setShowVideoDowload(
      !APPBridge.judgeIsInApp() || APPLETSV2Enable.VideoDownload
    );
  };

  const initWxConfig = async () => {
    if (!isWechat()) {
      return;
    }
    if (!workInfo) {
      return;
    }

    const waitForWx = () => {
      return new Promise<void>(resolve => {
        if ((window as any).wx) {
          resolve();
          return;
        }

        const checkWx = setInterval(() => {
          if ((window as any).wx) {
            clearInterval(checkWx);
            resolve();
          }
        }, 100);
      });
    };

    await waitForWx();
    const wx = (window as any).wx;
    const res = (await wechatSignature(
      'jiantie',
      encodeURIComponent(location.href.split('#')[0])
    )) as any;

    wx.config({
      debug: queryToObj().debug === 'true',
      appId: res.appId,
      timestamp: `${res.timestamp}`,
      nonceStr: `${res.nonceStr}`,
      signature: `${res.signature}`,
      jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
    });
    wx.ready(function () {
      wx.updateAppMessageShareData({
        title: shareTitle,
        desc: shareContent,
        link: shareLink,
        imgUrl: `${cdnApi(shareIcon, {
          resizeWidth: 120,
          format: 'webp',
        })}`,
        success: function () {
          // 设置成功
        },
      });

      wx.updateTimelineShareData({
        title: shareTitle, // 分享标题
        link: shareLink, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
        imgUrl: `${cdnApi(shareIcon, {
          resizeWidth: 120,
          format: 'webp',
        })}`, // 分享图标
        success: function () {
          // 设置成功
        },
      });
    });

    setWxReady(true);
  };

  useEffect(() => {
    const params = queryToObj();
    const { works_id, uid, ...other } = params;
    checkFirstVisit(works_id);
    getWorkDetailInfo();

    setShareLink(`${location.origin}/viewer2/${works_id}?appid=${appid}`);
  }, []);

  useEffect(() => {
    if (workInfo?.id) {
      initWxConfig();
      updateThumb();
    }
  }, [workInfo]);

  const showVipMpdal = () => {
    const params = queryToObj();
    const { works_id } = params;
    toVipPage({
      works_id: works_id,
      ref_object_id: workInfo?.template_id,
      tab: appid === 'xueji' ? 'business' : 'personal',
      vipType: 'h5',
      disable_trial: true,
    });
  };

  const checkShare = async (workId: string) => {
    const checkFunction = websiteSupport
      ? canShareWithoutWatermark
      : canExportWithoutWatermark;
    return await checkFunction(workId);
  };

  const copyLink = async () => {
    const { works_id } = queryToObj();
    // const canShare = await checkShare(works_id)
    // if (!canShare) {
    //   showVipMpdal()
    //   return
    // }
    navigator.clipboard.writeText(shareLink);
    setShowCopyTip(true);
  };

  const posterShare = async () => {
    const { works_id } = queryToObj();
    const canShare = await checkShare(works_id);
    if (!canShare) {
      showVipMpdal();
      return;
    }

    toPosterShare(works_id);
  };

  // 分享作品
  const popupShareTips = async (type = 'wechat') => {
    // 海报下载
    if (type === 'sreenshot') {
      posterShare();
      return;
    }

    if (type === 'copyLink') {
      copyLink();
      return;
    }

    if (type === 'vip') {
      showVipMpdal();
    }
  };

  const popupMiniPTips = (type: string) => {
    // toast.info("请在小程序内分享");
    setShowMiniPTip(true);
    console.log('type', type);
  };

  const updateThumb = async () => {
    if (!isFirstVisit) {
      return;
    }

    try {
      const visitedWorks = localStorage.getItem('replace_image_works');
      let visitedWorksObj = visitedWorks ? JSON.parse(visitedWorks) : {};
      const ossPath = visitedWorksObj[workInfo.id];
      if (ossPath) {
        console.log(shareIconRef.current);
        if (shareIconRef.current !== workInfo.cover) {
          return;
        }

        const url = cdnApi(ossPath);
        setShareIcon(url);
        updateWorksDetail2(workInfo.id, {
          cover: url,
        } as any);
      }
    } catch (error) {}
  };

  const toPage = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: 'https://nwap.maka.im/nwap/auditCriteria',
        type: 'URL',
      });
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav(
        'navigate',
        `/pages/home/index?url=${encodeURIComponent('https://nwap.maka.im/nwap/auditCriteria')}`
      );
    } else {
      location.href = 'https://nwap.maka.im/nwap/auditCriteria';
    }
    // https://nwap.maka.im/nwap/auditCriteria
  };

  const toActivity = () => {
    if (APPBridge.isRN()) {
      router.push(
        getUrlWithParam(`/mobile/home?default_tab=1&appid=${appid}`, 'clickid')
      );
    } else if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: 'maka://home/activity/activityPage?default_tab=1',
        type: 'NATIVE',
      });
    } else {
      router.push(
        getUrlWithParam(`/mobile/home?default_tab=1&appid=${appid}`, 'clickid')
      );
    }
  };

  const onChangeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxSize = 50;
    let files = e.target.files;
    if (files?.length) {
      const file = files[0];
      if ((file as File).size * 0.001 > maxSize * 1024) {
        toast.error(`文件不能超过${maxSize}mb`);
        return;
      }

      setCropImageUrl(URL.createObjectURL(file));
      setShowCrop(true);
    }
  };

  const onExportVideo = async () => {
    const canPublish = await checkShare(workInfo.id);
    if (!canPublish) {
      showVipMpdal();
      return;
    }

    toVideoShare(workInfo.id);
    return;
  };

  return (
    <div className={cls([styles.share, appid && styles[appid]])}>
      <MobileHeader
        title={t('share')}
        rightText={!isPC ? t('record') : ''}
        onRightClick={!isPC ? toActivity : undefined}
      />

      <div className={styles.main}>
        <div className={styles.shareTypesWrap}>
          <div
            className={cls([styles.title, 'justify-between', 'items-center'])}
          >
            <span>{t('settings')}</span>
            <span
              className={styles.ai_generate}
              onClick={() => {
                regenerateWorkMeta();
              }}
            >
              {aiGenerating ? '生成中...' : '重新生成'}
            </span>
          </div>

          <div className={styles.inputWrap}>
            <div className={styles.wordLimit}>{shareTitle.length}/10</div>
            <Input
              value={shareTitle}
              max={10}
              className={styles.input}
              onChange={e => {
                setShareTitle(e.target.value);
              }}
              onBlur={() => {
                const params = queryToObj();
                const { works_id } = params;
                updateWorksDetail2(works_id, {
                  title: shareTitle,
                  is_title_desc_modified: true,
                });
              }}
              placeholder={t('titlePlaceholder')}
            />
          </div>

          <div className={styles.shareContent}>
            <input
              className={styles.uploadInput}
              ref={inputRef}
              onChange={onChangeUpload}
              type='file'
              accept='image/*'
              multiple={false}
            />

            <div className={styles.textarea}>
              <Textarea
                value={shareContent}
                onChange={e => {
                  setShareContent(e.target.value);
                }}
                onBlur={() => {
                  const params = queryToObj();
                  const { works_id } = params;
                  updateWorksDetail2(works_id, {
                    desc: shareContent,
                    is_title_desc_modified: true,
                  });
                }}
                placeholder={t('descPlaceholder')}
              />
              {/* <div className={styles.textareaTip}>
                {appid === "jiantie" && (
                  <span onClick={() => setReferenceShow(true)}>参考文案</span>
                )}
                <div className={styles.wordLimit}>{shareContent.length}/60</div>
              </div> */}
            </div>

            <div
              className={styles.shareImg}
              onClick={async () => {
                if (await canUseRnChoosePic()) {
                  showRnChoosePic((url?: string) => {
                    if (url) {
                      setCropImageUrl(url);
                      setShowCrop(true);
                    }
                  });
                } else if (APPBridge.judgeIsInApp()) {
                  setShowPictureSelector(true);
                } else {
                  inputRef.current?.click();
                }
              }}
            >
              <img src={cdnApi(shareIcon)} alt='cover' />

              <div className={styles.btn}>{t('changeCover')}</div>
            </div>
          </div>
        </div>

        {!isPC && (
          <div className={styles.shareTypesWrap} style={{ marginTop: 12 }}>
            <div className={styles.title}>
              <Icon name='web-page-fill' color='#09090B' size={16} />
              <span>分享网页链接</span>
            </div>
            <div className={styles.shareTypes}>
              {(() => {
                const buttons = buildShareButtons({
                  isApp,
                  isOversea,
                  isMiniP,
                  appCanShareMiniP,
                  websiteSupport,
                  posterSupport,
                  videoSupport,
                  showVideoDowload,
                  appid,
                  workId: workInfo.id,
                  canvaInfo2,
                  shareTitle,
                  shareContent,
                  shareLink,
                  shareIcon,
                  popupShareTips: type => popupShareTips(type),
                  popupMiniPTips: type => popupMiniPTips(type),
                  onExportVideo: () => onExportVideo(),
                  checkShare: (worksId: string) => checkShare(worksId),
                });
                const handleButtonClick = async (btn: any) => {
                  if (!btn?.enable) return;
                  if (executingKey) return;
                  setExecutingKey(btn.key);
                  if (btn.async) setShowGlobalWorking(true);
                  try {
                    await btn.onClick();
                  } finally {
                    setExecutingKey(null);
                    if (btn.async) setShowGlobalWorking(false);
                  }
                };
                return (
                  <>
                    {workInfo.id && isMiniP && (
                      <MiniPShare
                        key={`${shareTitle}${shareIcon}${shareLink}`}
                        title={shareTitle}
                        imageUrl={toOssMiniPCoverUrl(shareIcon)}
                        path={`/pages/viewer/index?url=${encodeURIComponent(shareLink)}&works_id=${workInfo.id}`}
                      />
                    )}
                    {buttons
                      .filter(b => b.enable)
                      .map(b => {
                        const isBusy = executingKey === b.key;
                        const Base = (
                          <>
                            {b.icon ? (
                              <img src={b.icon} alt={b.key} />
                            ) : (
                              <div className={styles.systemShare}>
                                <Icon name='more-ga3j8jod' size={25} />
                              </div>
                            )}
                            <span>{b.label}</span>
                          </>
                        );
                        return (
                          <BehaviorBox
                            key={b.key}
                            behavior={{
                              object_type: b.object_type,
                              object_id: b.object_id,
                            }}
                            className={styles.shareItem}
                            onClick={() => handleButtonClick(b)}
                          >
                            {Base}
                          </BehaviorBox>
                        );
                      })}
                  </>
                );
              })()}
            </div>
            <div className='py-3'>
              <Separator />
            </div>
            <div className={styles.title}>
              <Icon name='video-file' color='#09090B' size={16} />
              <span>导出其他格式</span>
            </div>
            <div className={styles.shareTypes}>
              {(() => {
                const buttons = buildExportButtons({
                  isApp,
                  isOversea,
                  isMiniP,
                  appCanShareMiniP,
                  websiteSupport,
                  posterSupport,
                  videoSupport,
                  showVideoDowload: true,
                  appid,
                  workId: workInfo.id,
                  canvaInfo2,
                  shareTitle,
                  shareContent,
                  shareLink,
                  shareIcon,
                  popupShareTips: type => popupShareTips(type),
                  popupMiniPTips: type => popupMiniPTips(type),
                  onExportVideo: () => onExportVideo(),
                  checkShare: (worksId: string) => checkShare(worksId),
                });
                const handleButtonClick = async (btn: any) => {
                  if (!btn?.enable) return;
                  if (executingKey) return;
                  setExecutingKey(btn.key);
                  if (btn.async) setShowGlobalWorking(true);
                  try {
                    await btn.onClick();
                  } finally {
                    setExecutingKey(null);
                    if (btn.async) setShowGlobalWorking(false);
                  }
                };
                return (
                  <>
                    {workInfo.id && isMiniP && (
                      <MiniPShare
                        key={`${shareTitle}${shareIcon}${shareLink}`}
                        title={shareTitle}
                        imageUrl={toOssMiniPCoverUrl(shareIcon)}
                        path={`/pages/viewer/index?url=${encodeURIComponent(shareLink)}&works_id=${workInfo.id}`}
                      />
                    )}
                    {buttons
                      .filter(b => b.enable)
                      .map(b => {
                        const Base = (
                          <>
                            {b.icon ? (
                              <img src={b.icon} alt={b.key} />
                            ) : (
                              <div className={styles.systemShare}>
                                <Icon name='more-ga3j8jod' size={25} />
                              </div>
                            )}
                            <span>{b.label}</span>
                          </>
                        );
                        return (
                          <BehaviorBox
                            key={b.key}
                            behavior={{
                              object_type: b.object_type,
                              object_id: b.object_id,
                            }}
                            className={styles.shareItem}
                            onClick={() => handleButtonClick(b)}
                          >
                            {Base}
                          </BehaviorBox>
                        );
                      })}
                  </>
                );
              })()}
            </div>

            {showRmAd && (
              <BehaviorBox
                className={styles.rmADBar}
                behavior={{
                  object_type: 'share_rm_ad_btn',
                  object_id: workInfo.id,
                }}
                onClick={() => {
                  showVipMpdal();
                }}
              >
                <Icon name='ad' color='#786235' size={24} />
                <div className={styles.rmADBarTitle}>无广告分享</div>
                <Icon name='arrow-right-s-line' color='#786235' size={24} />
              </BehaviorBox>
            )}
          </div>
        )}

        {isPC && (
          <div className={styles.shareTypesWrap} style={{ marginTop: 12 }}>
            <div className={styles.title}>
              <Icon name='web-page-fill' color='#09090B' size={16} />
              <span>分享网页链接</span>
            </div>
            <div>
              <QRCodeCanvas value={shareLink} size={128} />
            </div>
          </div>
        )}

        {!isOversea && (
          <div
            className={styles.shareTip}
            onDoubleClick={() => {
              setShowRmAd(true);
            }}
          >
            分享即代表您同意
            <span onClick={() => toPage()}>
              《{title[appid]}内容审核标准及违规处理》
            </span>
          </div>
        )}
      </div>

      <ResponsiveDialog
        isDialog
        isOpen={showGlobalWorking}
        onOpenChange={() => {}}
        contentProps={{
          className: 'max-w-[320px] ',
        }}
      >
        <div className='p-4 flex flex-col items-center gap-2 mx-2 max-w-[320px]'>
          <Loading />
          <div className=''>请稍等，正在处理...</div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showMiniPTip}
        onOpenChange={setShowMiniPTip}
        contentProps={{
          className: 'w-full bg-transparent  top-[5%] translate-y-[0%]',
        }}
      >
        {/* <div className={styles.minicopyTip}>
          <img src={cdnApi("/assets/jiantie/share.png")} />
        </div> */}
        <div
          className={styles.shareOverlay}
          onClick={() => setShowMiniPTip(false)}
        >
          <img
            src={cdnApi('/cdn/webstore10/jiantie/share_arrow.png')}
            alt=''
            className={styles.arrow}
          />
          <div className={styles.tip}>
            点击右上角&quot;
            <div className={styles.icon}>
              <Icon name='more-ga3j8jod' />
            </div>
            &quot;进行分享哦
          </div>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        isDialog
        isOpen={showCopyTip}
        onOpenChange={setShowCopyTip}
        contentProps={{
          className: 'max-w-[320px] ',
        }}
      >
        <div className={styles.copyTip}>
          <Icon
            name='close'
            size={20}
            className={styles.close}
            color='rgba(0,0,0,0.45)'
            onClick={() => setShowCopyTip(false)}
          />
          <div className={styles.title}>链接复制成功！快去分享给朋友吧</div>
          <div className={styles.desc}>可粘贴链接分享至微信好友</div>
          <img src={cdnApi('/cdn/webstore10/jiantie/share_tip.png')} />
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showCrop}
        onOpenChange={setShowCrop}
        handleOnly={true}
      >
        <ImageCropper
          worksId={workInfo.id}
          imageUrl={cropImageUrl} // 使用 blob:url 也可以
          onClose={() => setShowCrop(false)}
          onChange={url => {
            setShareIcon(url);
            const params = queryToObj();
            const { works_id } = params;
            updateWorksDetail2(works_id, {
              cover: url,
            });
            setShowCrop(false);
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showPictureSelector}
        onOpenChange={setShowPictureSelector}
        title='更换封面'
        contentProps={{
          className: 'pt-2',
        }}
      >
        <LibPicture
          preUpload={false}
          worksId={workInfo.id}
          onSelectItem={(url: string) => {
            setCropImageUrl(url);
            setShowCrop(true);
            setShowPictureSelector(false);
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={screenshotingCover}
        isDialog
        contentProps={{
          className: 'max-w-[320px]',
        }}
      >
        <div className='p-4 flex flex-col items-center gap-2 mx-2 max-w-[320px]'>
          <Loading />
          <div className=''>
            请稍等，{workInfo.is_title_desc_modified ? '封面' : '标题'}
            自动生成中...
          </div>
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog isOpen={referenceShow} onOpenChange={setReferenceShow}>
        <div className={styles.reference}>
          <div className={styles.title}>参考文案</div>
          <Icon
            name='close'
            size={20}
            className={styles.close}
            onClick={() => setReferenceShow(false)}
          />

          <div className={styles.list}>
            {list.map((item, index) => (
              <div
                key={index}
                className={styles.listItem}
                onClick={() => {
                  setShareContent(item);
                  setReferenceShow(false);
                  const params = queryToObj();
                  const { works_id } = params;
                  updateWorksDetail2(works_id, {
                    desc: item,
                    is_title_desc_modified: true,
                  });
                }}
              >
                <span>{item}</span>
                <Icon name='add-one' size={18} />
              </div>
            ))}
          </div>
        </div>
      </ResponsiveDialog>
      <AlertDialog
        open={showExportVideoDialog}
        onOpenChange={setShowExportVideoDialog}
      >
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>已加入导出列表 </AlertDialogTitle>
            <AlertDialogDescription className='text-black/0.88 text-base'>
              导出需要时间，请稍等...
              <br />
              可在【作品】-【导出记录】查看进度
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='rounded-xl flex-1 flex-shrink-0 p-0'>
              好的
            </AlertDialogCancel>
            <AlertDialogAction
              className='rounded-xl flex-1 bg-primary text-primary-btn hover:bg-primary/90 flex-shrink-0 p-0'
              onClick={() => {
                if (APPBridge.judgeIsInApp()) {
                  APPBridge.navToPage({
                    url: `${location.origin}/mobile/video-export?is_full_screen=1`,
                    type: 'URL',
                  });
                } else {
                  router.push(
                    getUrlWithParam(
                      `/mobile/video-export?appid=${appid}`,
                      'clickid'
                    )
                  );
                }
              }}
            >
              前往导出列表
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showWorkMetaDialog}
        onOpenChange={setShowWorkMetaDialog}
      >
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>生成内容</AlertDialogTitle>
            <AlertDialogDescription className='text-black text-left'>
              <Label>标题: </Label>
              {workMeta?.title}
            </AlertDialogDescription>
            <AlertDialogDescription className='text-black text-left '>
              <Label>描述: </Label>
              {workMeta?.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='rounded-xl flex-1 flex-shrink-0 p-0'>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className='rounded-xl flex-1 bg-primary text-primary-btn hover:bg-primary/90 flex-shrink-0 p-0'
              onClick={() => {
                if (!workMeta) {
                  return;
                }
                setShareTitle(workMeta.title);
                setShareContent(workMeta.desc);

                updateWorksDetail2(workInfo.id, {
                  title: workMeta.title,
                  desc: workMeta.desc,
                  is_title_desc_modified: true,
                });
              }}
            >
              替换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default observer(Share);
