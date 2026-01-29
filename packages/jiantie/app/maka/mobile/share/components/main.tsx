'use client';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import OssUploader from '@/components/OssUpload';
import {
  API,
  cdnApi,
  getAppId,
  getUid,
  getWorksData,
  request,
  riskCheck,
  updateWorksDetal,
} from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { objToQuery, queryToObj } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { cn } from '@workspace/ui/lib/utils';
import { observer } from 'mobx-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

const Share = () => {
  const appid = getAppId();
  const { isVip } = useStore();
  const [shareIcon, setShareIcon] = useState('');
  const [shareTitle, setShareTitle] = useState('未命名作品');
  const [shareContent, setShareContent] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [workInfo, setWorkInfo] = useState<Record<string, any>>({});
  const [worksData, setWorksData] = useState<IWorksData>();
  const [previewVisible, setPreviewVisible] = useState(false);

  // 判断标题是否变化
  const [titleChanged, setTitleChanged] = useState(false);

  const shareType = useRef('wechat');
  const [disabledEdit, setDisabledEdit] = useState(false);

  const getWorkDetailInfo = async () => {
    const params = queryToObj();
    const { works_id, uid } = params;
    const data = (await getWorksData(works_id, uid)) as any;
    if (!data) {
      toast.error('作品不存在');
      return;
    }
    const { detail, work_data } = data;
    toast.dismiss();
    setWorksData(work_data as IWorksData);
    setWorkInfo(detail);
    setShareTitle(detail.title);
    setShareContent(detail.content);
    if (detail.thumb || detail.first_img) {
      setShareIcon(detail.thumb || detail.first_img || 'https://img2.maka.im/assets/usual/icon_statistics/maka_icon.jpg');
    }
  };

  useEffect(() => {
    const params = queryToObj();
    const { works_id, uid, ...other } = params;

    getWorkDetailInfo();
    setShareLink(
      `${API('根域名')}/mk-viewer-7/website/${uid}/${works_id}?${objToQuery(other)}`
    );
  }, []);

  // 分享作品
  const popupShareTips = async (type = 'wechat') => {
    if (!shareTitle) {
      toast.error('请填写作品主题');

      return;
    }
    if (!shareContent) {
      toast.error('请填写作品描述');
      return;
    }
    shareType.current = type;
    // 风控
    if (titleChanged) {
      await updateWorks();
    } else {
      await checkRisk();
    }
  };

  const checkRisk = async () => {
    const res = await riskCheck({
      works_id: workInfo.works_id,
    });
    if (res?.data?.audit_status === '1') {
      APPBridge.appCall({
        type: 'MKShare',
        params: {
          title: shareTitle,
          content: shareContent,
          thumb: cdnApi(shareIcon),
          type: 'link',
          shareType: shareType.current, //微信好友：wechat， 微信朋友圈：wechatTimeline，复制链接：copyLink，二维码分享：qrCode，更多(系统分享)：system
          url: shareLink, // 只传一个链接
        },
      });
    }
  };

  const updateWorks = async () => {
    toast.loading('保存中');
    setTitleChanged(false);
    const params = {
      title: shareTitle,
      content: shareContent,
    };
    const uid = getUid();
    await updateWorksDetal(uid, workInfo.works_id, params);
    toast.dismiss();
  };

  const renderSharePreview = () => {
    return (
      <div className={styles.sharePreview}>
        <div className={styles.previewWechat}>
          <div className={styles.title}>{shareTitle}</div>
          <div className={styles.info}>
            <div className={styles.content}>{shareContent}</div>
            <div className={styles.img}>
              <img src={cdnApi(shareIcon)} width={46} height={46} alt='' />
            </div>
          </div>
        </div>
        <div className={styles.avatar}>
          <img
            src='https://img2.maka.im/cdn/viewer/default_wx_avatar.png'
            width={30}
            height={30}
            alt=''
          />
        </div>
      </div>
    );
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

  const toVipPage = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({ url: `maka://home/vip/vipPage`, type: 'NATIVE' });
    } else {
    }
  };

  const toActivity = () => {
    APPBridge.navToPage({
      url: 'maka://home/activity/activityPage',
      type: 'NATIVE',
    });
  };

  return (
    <div className={cn([styles.share, appid && styles[appid]])}>
      <MobileHeader
        title='分享作品'
        rightText='活动首页'
        onRightClick={toActivity}
      />

      <div className={styles.main}>
        <div className={styles.title}>
          <span>分享设置</span>
          <Button
            className={styles.preview}
            size='sm'
            onClick={() => setPreviewVisible(true)}
          >
            预览
          </Button>
        </div>
        <Input
          disabled={disabledEdit}
          value={shareTitle}
          className={styles.input}
          onChange={e => {
            setTitleChanged(true);
            setShareTitle(e.target.value);
          }}
          onBlur={() => {
            const params = queryToObj();
            const { works_id, uid } = params;
            updateWorksDetal(uid, works_id, {
              title: shareTitle,
              // content: shareContent,
            });
          }}
          placeholder='请输入主题'
        />
        <div className={styles.shareContent}>
          <div className={styles.shareImg}>
            <img src={cdnApi(shareIcon)} alt='' />
            {!disabledEdit && (
              <>
                <div className={styles.upload}>
                  <OssUploader
                    label='更换图片'
                    accept='image/*'
                    folderDir='thumb'
                    onComplete={(url: string, ossPath: string) => {
                      console.log('first url', ossPath);
                      setShareIcon(ossPath);
                      const params = queryToObj();
                      const { works_id, uid } = params;
                      updateWorksDetal(uid, works_id, {
                        first_img: cdnApi(ossPath),
                        thumb: cdnApi(ossPath),
                      });
                    }}
                  />
                </div>
                <div className={styles.btn}>更换图片</div>
              </>
            )}
          </div>
          <Input
            disabled={disabledEdit}
            type='textarea'
            className={styles.textarea}
            value={shareContent}
            onChange={e => {
              setTitleChanged(true);
              setShareContent(e.target.value);
            }}
            onBlur={() => {
              const params = queryToObj();
              const { works_id, uid } = params;
              updateWorksDetal(uid, works_id, {
                content: shareContent,
              });
            }}
            placeholder='请输入描述'
          />
        </div>
        <div className='mt-6'>
          <div className={styles.title}>立即分享</div>
          <div className={styles.shareTypes}>
            <div
              className={styles.shareItem}
              onClick={() => popupShareTips('wechat')}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_weixin.png' />
              <span>微信好友</span>
            </div>
            <div
              className={styles.shareItem}
              onClick={() => popupShareTips('wechatTimeline')}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_pengyouquan.png' />
              <span>朋友圈</span>
            </div>
            <div
              className={styles.shareItem}
              onClick={() => {
                if (APPBridge.judgeIsInApp()) {
                  popupShareTips('copyLink');
                } else {
                  navigator.clipboard.writeText(shareLink);
                }
              }}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_lianjie.png' />
              <span>链接</span>
            </div>
            {false && workInfo.type === 'longH5' && (
              <div
                className={styles.shareItem}
                onClick={async () => {
                  if (!worksData) {
                    return;
                  }
                  toast.loading('图片生成中');
                  const urlParams = {
                    works_id: workInfo.works_id,
                    uid: getUid(),
                    format: 'png',
                    type: 'longH5',
                    pageCount: '1',
                    url: shareLink,
                    width: '1080',
                    height: '1920',
                    appid,
                  };
                  const downloadUrl = `${API('工具截图')}/screenshot/v2/export?${new URLSearchParams(urlParams).toString()}`;
                  const screenshotRes = await request.get(downloadUrl);
                  if (APPBridge.judgeIsInApp()) {
                    APPBridge.appCall({
                      type: 'MKSaveImage',
                      params: {
                        urls: screenshotRes.data.fullUrls,
                      },
                    });
                  } else {
                    window.open(screenshotRes.data.fullUrls[0]);
                  }
                  toast.dismiss();
                }}
              >
                <img src='https://res.maka.im/cdn/webstore7/assets/app/common/icon_gen_poster.png' />
                <span>生成海报</span>
              </div>
            )}
            <div
              className={styles.shareItem}
              onClick={() => popupShareTips('system')}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_gengduo.png' />
              <span>更多</span>
            </div>
          </div>
        </div>

        <div className={styles.shareTip}>
          分享即代表您同意
          <span onClick={() => toPage()}>《MAKA内容审核标准及违规处理》</span>
        </div>
      </div>
      <ResponsiveDialog
        isOpen={previewVisible}
        onOpenChange={setPreviewVisible}
      >
        {renderSharePreview()}
      </ResponsiveDialog>
    </div>
  );
};

export default observer(Share);
