'use client';
import Header from '@/components/DeviceWrapper/mobile/Header';
import { useStore } from '@/store';
import { toVipPage } from '@/utils/jiantie';
import APPBridge from '@mk/app-bridge';
import { EventEmitter } from '@mk/utils';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { WorkDetailContent } from '@/components/WorksDetailContent';
import { checkBindPhone, getAppId, getUid } from '@/services';
import { useCheckPublish } from '@/utils/checkPubulish';
import { navigateWithBridge } from '@/utils/navigate-with-bridge';
import { useShareNavigation } from '@/utils/share';
import { Icon } from '@workspace/ui/components/Icon';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';

interface Props {
  worksId: string;
  worksStore: any;
  workDetail?: any;
}

const PreviewHeader = (props: Props) => {
  const { worksId, worksStore } = props;
  const { userProfile, setBindPhoneShow } = useStore();
  const router = useRouter();
  const t = useTranslations('Editor');
  const { toShare, toVideoShare } = useShareNavigation();
  const { canShareWithoutWatermark, canExportWithoutWatermark } =
    useCheckPublish();
  const [isSharing, setIsSharing] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const worksDetail = worksStore.worksDetail;
  const isVideo =
    worksStore.worksDetail.specInfo.export_format.includes('video');

  const stopIframeMusic = () => {
    EventEmitter.emit('stopMusic', '');
  };

  const shareWorks = async () => {
    stopIframeMusic();

    const appid = getAppId();
    const uid = getUid();
    const hasBind = await checkBindPhone(uid, appid);

    if (!hasBind) {
      setBindPhoneShow(true);
      setIsSharing(false);
      return;
    }

    if (isVideo) {
      toVideoShare(worksId);
    } else {
      if (worksStore.worksDetail.is_rsvp) {
        const url = `/mobile/rsvp/invitees?works_id=${worksId}&mode=public`;
        navigateWithBridge({ path: url, router });
        return;
      } else {
        toShare(worksId);
      }
    }
    setIsSharing(false);
  };

  const checkPublish = async () => {
    try {
      // 根据类型选择对应的检查函数，减少重复代码
      const checkFunction = isVideo
        ? canExportWithoutWatermark
        : canShareWithoutWatermark;
      const canShare = await checkFunction(worksId);

      const appid = getAppId();
      if (canShare) {
        await shareWorks();
      } else {
        toVipPage({
          vipType: !isVideo ? 'h5' : 'poster',
          works_id: worksId,
          tab: appid === 'xueji' ? 'business' : 'personal',
        });
        setIsSharing(false);
      }
    } catch (error) {
      // 添加错误处理
      console.error('分享权限检查失败:', error);
      toast.error(t('sharePermissionCheckFailed'));
      setIsSharing(false);
    }
  };

  const handleSave = async () => {
    // if (isSharing) {
    //   return;
    // }
    // setIsSharing(true);
    setDetailDialogOpen(true);
    // await checkPublish();
  };

  const closePage = async () => {
    // toast.loading("保存到草稿箱...");
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      router.back();
    }
    setTimeout(() => {
      toast.dismiss();
    }, 1000);
  };

  return (
    <>
      <Header
        leftText={'返回'}
        title={t('preview')}
        onClose={() => closePage()}
        rightContent={
          <BehaviorBox
            behavior={{
              object_type: 'work_share_btn',
              object_id: worksId,
            }}
          >
            <Button size='sm' onClick={() => handleSave()} disabled={isSharing}>
              {isVideo ? (
                <div className='flex items-center gap-1'>
                  <Icon
                    name='download'
                    size={16}
                    color='var(--btn-text-color)'
                  />
                  <span>导出</span>
                </div>
              ) : (
                '分享'
              )}
            </Button>
          </BehaviorBox>
        }
        style={{
          zIndex: 99999,
        }}
      />

      {/* 作品详情弹窗 */}
      <ResponsiveDialog
        title='邀请函详情'
        isOpen={detailDialogOpen}
        onOpenChange={open => {
          setDetailDialogOpen(open);
        }}
        showCloseIcon={true}
      >
        <WorkDetailContent
          work={worksDetail}
          shareOnly={true}
          onClose={() => setDetailDialogOpen(false)}
          onDataChange={() => {}}
        />
      </ResponsiveDialog>
    </>
  );
};

export default PreviewHeader;
