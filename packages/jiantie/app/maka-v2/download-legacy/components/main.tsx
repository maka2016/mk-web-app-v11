'use client';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { API, getAppId, getWorksDetail, request } from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { queryToObj } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import { cn } from '@workspace/ui/lib/utils';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import DownloadExportSetting from './DownloadExportSetting';
import styles from './index.module.scss';

/**
 * 旧作品的下载页面
 */
const Posterdownload = () => {
  const appid = getAppId();

  const store = useStore();
  const [isLoading, setLoading] = useState(true);
  const [duration, setDuration] = useState(100);
  const [iframeUrl, setIframeUrl] = useState('');
  const [title, setTitle] = useState();
  const [urls, setUrls] = useState([]);
  const [formatPopup, setFormatPopup] = useState(false);
  const [fileUri, setFileUri] = useState('');

  useEffect(() => {
    if (duration > 0) {
      setTimeout(() => {
        if (isLoading) {
          setDuration(Math.max(1, duration - 1));
        } else {
          setDuration(0);
        }
      }, 200);
    }
  }, [duration, isLoading]);

  const onDownload = async (format = 'png', scale = '0.8') => {
    setFormatPopup(false);
    setLoading(true);
    const params = queryToObj();
    const { works_id, uid } = params;
    const { data } = await getWorksDetail(uid, works_id);
    if (!data) return;
    const downloadInfo = {
      works_id: data.id,
      uid: data.uid,
      name: data.title,
      version: data.version,
    };
    setTitle(data.title);
    const reequestUrl = `${API('根域名')}/mk-gif-generator/screenshot-v2/export?format=${format}&works_id=${downloadInfo.works_id}&uid=${
      downloadInfo.uid
    }&name=${downloadInfo.name}&version=${downloadInfo.version}&quantity=100&scale=${scale}&appid=${appid}`;
    const res = await request.get(reequestUrl);
    if (res?.data?.fullUrls?.length) {
      setUrls(res.data.fullUrls);
      res.data.fullUrls.forEach((url: string, idx: number) => {
        APPBridge.appCall(
          {
            type: 'MKSaveImage',
            appid: 'jiantie',
            params: {
              urls: [url],
            },
            jsCbFnName: 'appBridgeOnSaveImagedCb',
          },
          e => {
            if (e) {
              if (idx === 0) {
                setFileUri(e.fileuri);
              }
            }
          },
          3000000
        );
      });
      // APPBridge.appCall({
      //   type: 'MKSaveImage',
      //   params: {
      //     urls: res.data.fullUrls,
      //   },
      // });
      // onCompleteTask()
    }
    setLoading(false);
  };

  useEffect(() => {
    if (appid) {
      const { works_id, uid } = queryToObj();
      setIframeUrl(
        `${API('根域名')}/mk-viewer-7/multiposter/${uid}/${works_id}`
      );
    }
  }, [appid]);

  useEffect(() => {
    if (isLoading) {
      onDownload();
    }
  }, [isLoading]);

  const reDownload = (format: string, scale: string) => {
    setLoading(true);
    setDuration(100);
  };

  const renderViewer = () => {
    return (
      <div className={styles.preview}>
        {iframeUrl && <iframe src={iframeUrl}></iframe>}
      </div>
    );
  };

  const onShare = (type = 'wechat') => {
    APPBridge.appCall({
      type: 'MKShare',
      appid: 'jiantie',
      params: {
        title,
        type: 'images',
        shareType: type, //微信好友：wechat， 微信朋友圈：wechatTimeline，更多(系统分享)：system
        urls: urls, // 可以传多张，但是客户端只下载并分享第一张
        fileuri: fileUri,
      },
    });
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

  return (
    <div className={cn(styles.posterdownload, 'md:w-[375px] md:mx-auto')}>
      <MobileHeader title='分享作品' />

      {renderViewer()}

      {!isLoading && (
        <div className={styles.tip}>
          <p>已保存至相册</p>
          <p className={styles.export} onClick={() => setFormatPopup(true)}>
            <Icon name='workshare' size={18} />
            <span>导出其他格式</span>
          </p>
        </div>
      )}

      <Separator />

      {isLoading && (
        <div className={styles.loading}>
          <p
            className={styles.loadingPercent}
          >{`生成作品中 ${100 - duration}%`}</p>
          <p className={styles.loadingDesc}>
            作品将保存到您的手机相册，请耐心等候
          </p>
          <div className={styles.progress}>
            <div
              className={styles.inner}
              style={{
                width: `${100 - duration}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className={styles.share}>
          <div className={styles.title}>立即分享</div>
          {store.isVip && (
            <div className={styles.vipTip}>
              尊敬的
              <span className={styles.vip}>
                {store.customerVips?.[0]?.role?.name || '用户'}
              </span>
              ，已自动为您的作品去掉水印
            </div>
          )}
          <div className={styles.shareTypes}>
            <div className={styles.shareItem} onClick={() => onShare('wechat')}>
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_weixin.png' />
              <span>微信好友</span>
            </div>
            <div
              className={styles.shareItem}
              onClick={() => onShare('wechatTimeline')}
            >
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_pengyouquan.png' />
              <span>朋友圈</span>
            </div>
            {/* <div className={styles.shareItem}>
                <img src="https://img2.maka.im/cdn/webstore7/assets/app/common/icon_lianjie.png" />
                <span>链接</span>
              </div> */}
            <div className={styles.shareItem} onClick={() => onShare('system')}>
              <img src='https://img2.maka.im/cdn/webstore7/assets/app/common/icon_gengduo.png' />
              <span>更多</span>
            </div>
          </div>
          <div className={styles.shareTip}>
            分享作品即代表您已仔细阅读并同意遵守 <br />
            <span onClick={() => toPage()}>《MAKA内容审核标准及违规处理》</span>
          </div>
        </div>
      )}
      <ResponsiveDialog isOpen={formatPopup} onOpenChange={setFormatPopup}>
        <DownloadExportSetting
          onDownload={(format, scale) => reDownload(format, scale)}
        />
      </ResponsiveDialog>
    </div>
  );
};

export default observer(Posterdownload);
