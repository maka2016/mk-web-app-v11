'use client';

import { getAppId, getUid, updateWorksDetail2 } from '@/services';
import { getShareUrl, useStore } from '@/store';
import { safeCopy } from '@/utils/index1';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
import { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';
import DownloadHelperForInvitees from '../GridEditorV3/AppV2/Export/DownloadHelperForInvitees';
import DownloadHelperForPoster from '../GridEditorV3/AppV2/Export/DownloadHelperForPoster';
import { PreviewContentModal } from '../GridEditorV3/componentsForEditor/PreviewContent';

// 自定义 Hook：封装所有的作品操作逻辑
function useWorksActionsValue() {
  const {
    isVip,
    shareWork: storeShareWork,
    checkSharePermission,
    toMobileEditor,
    toVideoShare,
    push,
  } = useStore();

  const [worksDetail, setWorksDetail] = useState<SerializedWorksEntity | null>(
    null
  );
  const [showDownloadInviteeManager, setShowDownloadInviteeManager] =
    useState(false);
  const [showDownloadPoster, setShowDownloadPoster] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [isOperating, setIsOperating] = useState(false);
  const [operatingWorkId, setOperatingWorkId] = useState<string | null>(null);

  const toDownloadInviteeManager = (work: SerializedWorksEntity) => {
    setWorksDetail(work);
    setShowDownloadInviteeManager(true);
  };

  const toDownloadPoster = (work: SerializedWorksEntity) => {
    setWorksDetail(work);
    setShowDownloadPoster(true);
  };

  const toPreviewModal = (work: SerializedWorksEntity) => {
    setWorksDetail(work);
    setShowPreviewModal(true);
  };

  // 编辑作品
  const editWork = (work: SerializedWorksEntity) => {
    const uid = getUid();
    toMobileEditor(work.id, uid);
  };

  // 分享作品
  const shareWork = async (
    work: SerializedWorksEntity,
    shareType: 'wechat' | 'wechatTimeline' | 'system' = 'wechat'
  ) => {
    // setIsOperating(true);
    setOperatingWorkId(work.id);

    try {
      const exportFormat = work.specInfo?.export_format;
      const isWebsite = exportFormat?.includes('html');

      if (isWebsite) {
        // 网页类型：使用统一分享方法（自动权限检查）
        await storeShareWork({
          worksDetail: work,
          shareType,
          checkPermission: true,
        });
      } else {
        // 非网页类型：下载分享
        await downloadWork(work, { autoShare: true });
      }
    } finally {
      setIsOperating(false);
      setOperatingWorkId(null);
    }
  };

  // 复制作品
  const copyWork = async (
    work: SerializedWorksEntity,
    onSuccess?: () => void
  ) => {
    setIsOperating(true);
    setOperatingWorkId(work.id);

    try {
      await trpc.works.duplicate.mutate({ id: work.id });
      toast.success('复制成功');
      onSuccess?.();
    } catch (error) {
      toast.error('复制失败');
      console.error(error);
    } finally {
      setIsOperating(false);
      setOperatingWorkId(null);
    }
  };

  // 删除作品
  const deleteWork = async (
    work: SerializedWorksEntity,
    purchaseStatus?: 'purchased' | 'not-purchased' | null,
    onSuccess?: () => void
  ) => {
    const appid = getAppId();
    // 检查删除限制：非会员且已购买的作品不允许删除
    if (appid === 'jiantie' && !isVip && purchaseStatus === 'purchased') {
      toast.error('已购买的作品暂不支持删除操作');
      return;
    }

    setIsOperating(true);
    setOperatingWorkId(work.id);

    try {
      await trpc.works.delete.mutate({ id: work.id });
      toast.success('删除成功');
      onSuccess?.();
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    } finally {
      setIsOperating(false);
      setOperatingWorkId(null);
    }
  };

  // 回执管理（专属邀请）
  const manageReceipt = (work: SerializedWorksEntity) => {
    push(`/mobile/rsvp/invitees/create`, {
      query: {
        works_id: work.id,
      },
    });
  };

  // 下载/导出作品
  const downloadWork = async (
    work: SerializedWorksEntity,
    options?: { autoShare?: boolean }
  ) => {
    const hasPermission = await checkSharePermission(work.id, {
      trackData: {
        works_id: work.id,
        ref_object_id: work.template_id || '',
        tab: 'personal',
        works_type: 'poster',
        vipType: 'export',
      },
    });
    if (!hasPermission) {
      return;
    }
    setIsOperating(true);
    setOperatingWorkId(work.id);

    try {
      const exportFormat = work.specInfo?.export_format;
      const isVideo = exportFormat?.includes('video');

      if (isVideo) {
        await toVideoShare(work.id, undefined, {
          templateId: work.template_id || undefined,
        });
      } else {
        toDownloadPoster(work);
      }
    } finally {
      setIsOperating(false);
      setOperatingWorkId(null);
    }
  };

  // 去广告/去水印
  const removeWatermark = async (work: SerializedWorksEntity) => {
    setIsOperating(true);
    setOperatingWorkId(work.id);

    try {
      const exportFormat = work.specInfo?.export_format;
      const isH5 = /html/gi.test(exportFormat || '');

      // 检查权限并引导升级VIP
      const hasPermission = await checkSharePermission(work.id, {
        trackData: {
          vipWorksDetail: work,
          works_id: work.id,
          ref_object_id: work.template_id || '',
          works_type: isH5 ? 'h5' : 'poster',
          editor_version: 10,
          tab: 'personal',
          vipType: 'share',
        },
      });

      if (!hasPermission) return;

      // 如果已经有权限，则进行相应操作
      if (isH5) {
        // H5类型：去广告
        toast.success('已开启无广告模式');
      } else {
        // 海报类型：去水印
        await downloadWork(work);
      }
    } finally {
      setIsOperating(false);
      setOperatingWorkId(null);
    }
  };

  // 复制链接
  const copyLink = async (work: SerializedWorksEntity) => {
    setIsOperating(true);
    setOperatingWorkId(work.id);

    try {
      const hasPermission = await checkSharePermission(work.id, {
        trackData: {
          vipWorksDetail: work,
          works_id: work.id,
          ref_object_id: work.template_id || '',
          works_type: 'h5',
          editor_version: 10,
          tab: 'personal',
          vipType: 'share',
        },
      });

      if (!hasPermission) return;

      const link = getShareUrl(work.id);
      safeCopy(link);
      toast.success('链接已复制到剪贴板');
    } finally {
      setIsOperating(false);
      setOperatingWorkId(null);
    }
  };

  // 切换上线下线状态（兼容新旧模板）
  const toggleOffline = async (
    work: SerializedWorksEntity,
    onSuccess?: () => void
  ) => {
    setIsOperating(true);
    setOperatingWorkId(work.id);

    try {
      // 新版本：使用 updateWorksDetail2 更新 offline 字段
      const currentOffline = work.offline ?? false;
      await updateWorksDetail2(work.id, {
        offline: !currentOffline,
      });
      toast.success(currentOffline ? '已上线' : '已下线');

      onSuccess?.();
    } catch (error) {
      toast.error('操作失败');
      console.error(error);
    } finally {
      setIsOperating(false);
      setOperatingWorkId(null);
    }
  };

  return {
    editWork,
    toDownloadInviteeManager,
    toDownloadPoster,
    setShowDownloadPoster,
    toPreviewModal,
    setShowPreviewModal,
    setWorksDetail,
    shareWork,
    copyWork,
    deleteWork,
    manageReceipt,
    downloadWork,
    removeWatermark,
    copyLink,
    toggleOffline,
    setShowDownloadInviteeManager,
    showDownloadInviteeManager,
    showDownloadPoster,
    showPreviewModal,
    worksDetail,
    isOperating,
    operatingWorkId,
  };
}

// 从实现推导类型，单一数据源
type WorksActionsContextValue = ReturnType<typeof useWorksActionsValue>;

const WorksActionsContext = createContext<WorksActionsContextValue | null>(
  null
);

export function WorksActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useWorksActionsValue();

  return (
    <WorksActionsContext.Provider value={value}>
      {children}
      {value.worksDetail && (
        // 新版嘉宾的下载功能
        <>
          <DownloadHelperForPoster
            showModal={!!value.showDownloadPoster}
            setShowModal={show => {
              value.setShowDownloadPoster(show);
            }}
            worksDetail={value.worksDetail}
          />
          <DownloadHelperForInvitees
            worksDetail={value.worksDetail}
            showModal={!!value.showDownloadInviteeManager}
            setShowModal={show => {
              value.setShowDownloadInviteeManager(show);
            }}
          />
          <PreviewContentModal
            worksDetail={value.worksDetail}
            open={!!value.showPreviewModal}
            onOpenChange={(open: boolean) => {
              value.setShowPreviewModal(open);
            }}
          />
        </>
      )}
    </WorksActionsContext.Provider>
  );
}

export function useWorksActions() {
  const context = useContext(WorksActionsContext);
  if (!context) {
    throw new Error('useWorksActions must be used within WorksActionsProvider');
  }
  return context;
}
