'use client';
import {
  API,
  checkBindPhone,
  copyWork,
  deleteWork,
  getAppId,
  getToken,
  getUid,
  getWorksDetail,
} from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { cn } from '@workspace/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './index.module.scss';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { toVipPage } from '@/utils/jiantie';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { observer } from 'mobx-react';
import toast from 'react-hot-toast';

interface Props {
  worksId: string;
}

interface Detail {
  works_id: string;
  page_width: number;
  page_height: number;
  uid: string;
  title: string;
  editor_version: number;
  template_id: string;

  type: string;
}

const WorksPreview = (props: Props) => {
  const { worksId } = props;
  const { permissions, setBindPhoneShow, isVip } = useStore();
  const [iframeUrl, setIframeUrl] = useState('');
  const [detail, setDetail] = useState<Detail>();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const worksDetail = async () => {
    if (!worksId) {
      return;
    }
    const uid = getUid();
    const res = (await getWorksDetail(uid, worksId)) as any;
    if (res?.data) {
      setIframeUrl(
        res.data.viewer_url.replace('/poster', '/multiposter') +
          `?appid=${getAppId()}`
      );
      setDetail(res.data);
    }
  };

  useEffect(() => {
    worksDetail();
  }, [worksId]);

  const toEditor = async () => {
    if (!detail) {
      return;
    }
    if (detail.editor_version < 7) {
      toast.error('抱歉，该作品只支持在电脑浏览器内编辑。');
      return;
    }

    let url = `${API('根域名')}/editor-wap-v7/?token=${getToken()}&page_id=${worksId}&uid=${getUid()}&is_full_screen=1&popEnable=0`;

    if (APPBridge.isRN()) {
      url += '&rn_mode=true';
    }
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      router.push(url);
    }
  };

  const toShare = async () => {
    if (!detail) {
      return;
    }
    const canShare =
      permissions?.tiantianhuodong_sharing ||
      permissions?.H5_wenzhangH5_work_sharing;
    if (!canShare) {
      toVipPage({
        works_id: worksId,
        ref_object_id: detail.template_id,
        tab: 'business',
        vipType: 'h5',
        editor_version: 7, // 兼容maka会员页
      });
      return;
    }

    if (APPBridge.judgeIsInApp() && !APPBridge.isRN()) {
      const shareUri = `maka://h5Share?workId=${worksId}&isVideo=0`;
      APPBridge.navToPage({
        url: shareUri,
        type: 'NATIVE',
      });
    } else {
      const hasBind = await checkBindPhone(detail.uid, getAppId());
      if (hasBind) {
        if (APPBridge.judgeIsInApp()) {
          APPBridge.navToPage({
            url: `${location.origin}/maka/mobile/share?works_id=${worksId}&uid=${detail.uid}&is_full_screen=1`,
            type: 'URL',
          });
        } else {
          router.push(
            `/maka/mobile/share?works_id=${worksId}&uid=${detail.uid}&appid=${getAppId()}`
          );
        }
      } else {
        setBindPhoneShow(true);
      }
    }
  };

  const toDownload = () => {
    if (!detail) {
      return;
    }
    if (!permissions?.remove_watermarks) {
      toVipPage({
        works_id: worksId,
        ref_object_id: detail.template_id,
        tab: 'business',
        editor_version: 7, // 兼容maka会员页
      });
      return;
    }
    if (APPBridge.judgeIsInApp()) {
      if (APPBridge.isRN()) {
        APPBridge.navToPage({
          url: `${location.origin}/maka/mobile/download?works_id=${worksId}&uid=${detail.uid}&is_full_screen=1`,
          type: 'URL',
        });
      } else {
        APPBridge.navToPage({
          url: `maka://posterShare?workId=${worksId}&width=${detail?.page_width}&height=${detail?.page_height}&previewUrl=${`${API(
            '根域名'
          )}/mk-viewer-7/poster/${detail.uid}/${worksId}`}`,
          type: 'NATIVE',
        });
      }
    } else {
      router.push(
        `/maka/mobile/download?works_id=${worksId}&uid=${detail.uid}&appid=${getAppId()}`
      );
    }
  };

  const toPayment = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/vip&is_full_screen=1&back=true`,
        type: 'URL',
      });
    } else {
      location.href = `/maka/mobile/vip?appid=${getAppId()}`;
    }
  };

  const toWorksData = () => {
    if (!detail) {
      return;
    }
    if (detail.editor_version < 7) {
      APPBridge.navToPage({
        url:
          'maka://home/market/marketActivity?position=dataOverview&workId=' +
          worksId,
        type: 'NATIVE',
      });
      return;
    }
    const url = `${API('根域名')}/mk-web-store-v7/mobile/dataVisible?works_id=${worksId}&uid=${getUid()}&token=${getToken()}&is_full_screen=1`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
    }
  };

  const onDeleteWorks = async () => {
    if (!worksId) {
      return;
    }
    const uid = getUid();

    toast.loading('删除中...');
    const res = await deleteWork(uid, worksId);
    if (res.data) {
      if (APPBridge.judgeIsInApp()) {
        APPBridge.navAppBack();
      } else {
        history.back();
      }
      toast('删除成功！');
    } else {
      toast('删除失败！');
    }
  };

  const onCopyWorks = async () => {
    if (!worksId) {
      return;
    }
    const res = await copyWork(worksId);
    if (res.data) {
      toast('复制成功, 请到我的作品查看！');
    } else {
      toast('复制失败！');
    }
  };

  return (
    <div className={styles.container}>
      <MobileHeader title={detail?.title || '预览'} />
      <div className={styles.viewer}>
        {iframeUrl && <iframe src={iframeUrl}></iframe>}
      </div>
      {detail && (
        <div className={styles.footer}>
          <div className={styles.iconBtn} onClick={() => toEditor()}>
            <Icon name='edit' size={24} />
            <span>编辑</span>
          </div>
          <div className={styles.iconBtn} onClick={() => toWorksData()}>
            <Icon name='form-fill' size={24} />
            <span>查看数据</span>
          </div>
          {detail.type === 'poster' && isVip && (
            <div className={styles.iconBtn} onClick={() => toPayment()}>
              <Icon name='VIPLOGO' size={24} color='#fff' />
              <span>续费会员</span>
            </div>
          )}
          {detail.type === 'poster' && !isVip && (
            <div className={styles.iconBtn} onClick={() => toPayment()}>
              <Icon name='ad-hjg99fe1' size={24} />
              <span>无限次去水印</span>
            </div>
          )}

          {detail.type === 'poster' ? (
            <div className={styles.iconBtn} onClick={() => toDownload()}>
              <Icon name='save-one' size={24} />
              <span>保存图片</span>
            </div>
          ) : (
            <div className={styles.iconBtn} onClick={() => toShare()}>
              <Icon name='share' size={24} />
              <span>分享</span>
            </div>
          )}
          <div className={styles.iconBtn} onClick={() => setOpen(true)}>
            <Icon name='ellipsis' size={24} />
            <span>更多</span>
          </div>
        </div>
      )}
      <ResponsiveDialog isOpen={open} onOpenChange={setOpen}>
        <div className={styles.menu}>
          <div className={styles.title}>更多操作</div>
          <div
            className={cn([styles.menuItem, styles.delete])}
            onClick={() => onDeleteWorks()}
          >
            删除
          </div>

          <div className={styles.menuItem} onClick={() => onCopyWorks()}>
            复制
          </div>
          <div className={styles.btn} onClick={() => setOpen(false)}>
            取消
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default observer(WorksPreview);
