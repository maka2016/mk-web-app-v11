'use client';
import { BehaviorBox } from '@/components/BehaviorTracker';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import LibPicture from '@/components/LibPicture';
import {
  API,
  cdnApi,
  getAppId,
  getWorksData,
  updateWorksDetal,
} from '@/services';
import { mkWebStoreLogger } from '@/services/logger';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { SerializedWorksEntity, objToQuery, queryToObj } from '@/utils';
import { toVipPage } from '@/utils/jiantie';
import { canUseRnChoosePic, showRnChoosePic } from '@/utils/rnChoosePic';
import { useShareNavigation } from '@/utils/share';
import { Icon } from '@workspace/ui/components/Icon';
import { Input } from '@workspace/ui/components/input';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import { cn } from '@workspace/ui/lib/utils';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ImageCropper from './ImageCropper';
import styles from './index.module.scss';
import { buildShareButtons } from './shareButtons';

const Share = () => {
  const appid = getAppId();
  const t = useTranslations('Share');
  const tGrid = useTranslations('GridEditor');
  const [shareIcon, setShareIcon] = useState('');
  const shareIconRef = useRef(shareIcon);
  const [shareTitle, setShareTitle] = useState(t('unnameWork'));
  const [shareContent, setShareContent] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [workInfo, setWorkInfo] = useState<SerializedWorksEntity>({} as any);
  const [worksData, setWorksData] = useState<IWorksData>();
  const [screenshotingCover, setScreenshotingCover] = useState(false);

  const [isApp, setIsApp] = useState(false);
  const [showPictureSelector, setShowPictureSelector] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [showVideoDowload, setShowVideoDowload] = useState(false);
  const [executingKey, setExecutingKey] = useState<string | null>(null);
  const [showGlobalWorking, setShowGlobalWorking] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const router = useRouter();
  const { toPosterShare } = useShareNavigation();
  const { permissions } = useStore();
  const nav = useStore();

  const getWorkDetailInfo = async () => {
    const params = queryToObj();
    const { works_id, uid } = params;
    const res = (await getWorksData(works_id, uid)) as any;
    const worksData = res?.work_data;
    const detail = res?.detail;

    if (!detail) {
      toast.error(t('notExist'));
      return;
    }

    toast.dismiss();
    setWorkInfo(detail);
    setWorksData(worksData);
    setShareTitle(detail.title);
    setShareContent(detail.content);
    setShareIcon(detail.thumb || detail.first_img || 'https://img2.maka.im/assets/usual/icon_statistics/maka_icon.jpg');
  };

  useEffect(() => {
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
    let APPLETSV2Enable = await APPBridge.featureDetect(['VideoDownload']);

    setShowVideoDowload(
      !APPBridge.judgeIsInApp() || APPLETSV2Enable.VideoDownload
    );
  };

  useEffect(() => {
    const params = queryToObj();
    const { works_id, uid, ...other } = params;
    getWorkDetailInfo();

    setShareLink(
      `${API('根域名')}/mk-viewer-7/website/${uid}/${works_id}?${objToQuery(other)}`
    );
  }, []);

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

  const copyLink = async () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('复制成功');
  };

  const posterShare = async () => {
    const { works_id } = queryToObj();
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

  const toPage = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: 'https://nwap.maka.im/nwap/auditCriteria',
        type: 'URL',
      });
    } else {
      location.href = 'https://nwap.maka.im/nwap/auditCriteria';
    }
    // https://nwap.maka.im/nwap/auditCriteria
  };

  const toActivity = () => {
    nav.toHome();
    // if (APPBridge.isRN()) {
    //   router.push(
    //     getUrlWithParam(
    //       `/maka/mobile/home?default_tab=1&appid=${appid}`,
    //       'clickid'
    //     )
    //   );
    // } else if (APPBridge.judgeIsInApp()) {
    //   APPBridge.navToPage({
    //     url: 'maka://home/activity/activityPage?default_tab=1',
    //     type: 'NATIVE',
    //   });
    // } else {
    //   router.push(
    //     getUrlWithParam(`/mobile/home?default_tab=1&appid=${appid}`, 'clickid')
    //   );
    // }
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

  const toVip = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/vip?is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(`${location.origin}/maka/mobile/vip?appid=${appid}`);
    }
  };

  const canShare =
    permissions?.tiantianhuodong_sharing ||
    permissions?.H5_wenzhangH5_work_sharing;

  return (
    <div className={cn([styles.share, appid && styles[appid]])}>
      <MobileHeader
        title={t('share')}
        rightText={'作品记录'}
        onRightClick={toActivity}
      />

      <div className={styles.main}>
        <div className={styles.shareTypesWrap}>
          <div
            className={cn([styles.title, 'justify-between', 'items-center'])}
          >
            <span>{t('settings')}</span>
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
                const { works_id, uid } = params;
                updateWorksDetal(uid, works_id, {
                  title: shareTitle,
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
              title='cover'
              placeholder='cover'
            />

            <div className={styles.textarea}>
              <Textarea
                value={shareContent}
                onChange={e => {
                  setShareContent(e.target.value);
                }}
                onBlur={() => {
                  const params = queryToObj();
                  const { works_id, uid } = params;
                  updateWorksDetal(uid, works_id, {
                    desc: shareContent,
                  });
                }}
                placeholder={t('descPlaceholder')}
              />
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
                  }, tGrid);
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

        <div className={styles.shareTypesWrap} style={{ marginTop: 12 }}>
          <div
            className={styles.title}
            style={{
              marginBottom: 2,
            }}
          >
            <Icon name='web-page-fill' color='#09090B' size={16} />
            <span>分享网页链接</span>
          </div>
          {!canShare && (
            <div className={styles.desc}>
              当前H5作品含有广告，建议升级会员
              <div className={styles.vip} onClick={() => toVip()}>
                去广告
                <Icon name='arrow-right' size={12} />
              </div>
            </div>
          )}
          <div
            className={styles.shareTypes}
            style={{
              marginTop: 12,
            }}
          >
            {(() => {
              const buttons = buildShareButtons({
                isApp,
                showVideoDowload,
                appid,
                workId: workInfo.id,
                shareTitle,
                shareContent,
                shareLink,
                shareIcon,
                popupShareTips: type => popupShareTips(type),
              });
              const handleButtonClick = async (btn: any) => {
                if (!btn?.enable) return;
                if (executingKey) return;
                setExecutingKey(btn.key);
                // if (btn.async) setShowGlobalWorking(true);
                try {
                  await btn.onClick();
                } finally {
                  setExecutingKey(null);
                  // if (btn.async) setShowGlobalWorking(false);
                }
              };
              return (
                <>
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
        </div>
        <div className={styles.shareTip}>
          分享即代表您同意
          <span onClick={() => toPage()}>《MAKA内容审核标准及违规处理》</span>
        </div>
      </div>

      <ResponsiveDialog
        isDialog
        isOpen={showGlobalWorking}
        onOpenChange={() => { }}
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
            const { works_id, uid } = params;
            updateWorksDetal(uid, works_id, {
              thumb: url,
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
    </div>
  );
};

export default observer(Share);
