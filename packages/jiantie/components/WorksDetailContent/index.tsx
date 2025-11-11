'use client';

import { getAppId, getUid } from '@/services';
import { useStore } from '@/store';
import { useCheckPublish } from '@/utils/checkPubulish';
import { navigateWithBridge } from '@/utils/navigate-with-bridge';
import { generateAndSharePoster } from '@/utils/poster-share';
import { useShareNavigation } from '@/utils/share';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { cdnApi } from '@mk/services';
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
import { Button } from '@workspace/ui/components/button';
import {
  Copy,
  Eye,
  FileText,
  Globe,
  Pencil,
  Share2,
  Target,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ActionButton, RoundedActionButton } from './ActionButton';
import { SmallActionButton } from './SmallActionButton';
import { WorkInfoCard } from './WorkInfoCard';

type RSVPStats = {
  invited: number;
  replied: number;
};

interface WorkDetailContentProps {
  shareOnly?: boolean;
  work?: SerializedWorksEntity;
  onClose?: () => void;
  onDataChange?: () => void; // 数据变更回调（删除/复制后触发）
}

export function WorkDetailContent({
  shareOnly = false,
  work,
  onClose,
  onDataChange,
}: WorkDetailContentProps) {
  const router = useRouter();
  const { isVip, setVipShow } = useStore();
  const { canShareWithoutWatermark } = useCheckPublish();
  const { toPosterShare, toVideoShare } = useShareNavigation();

  const [rsvpStats, setRsvpStats] = useState<RSVPStats | null>(null);
  const [formConfigId, setFormConfigId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [isMiniP, setIsMiniP] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const workId = work?.id;

  // 初始化环境检测
  useEffect(() => {
    setIsMiniP(APPBridge.judgeIsInMiniP());
    setIsInApp(APPBridge.judgeIsInApp());
  }, []);

  // 检查分享权限
  const checkSharePermission = async (): Promise<boolean> => {
    if (!workId) return false;

    // 如果是会员，直接有权限
    if (isVip) {
      return true;
    }

    // 检查分享权限
    try {
      const hasPermission = await canShareWithoutWatermark(workId);
      return hasPermission;
    } catch (error) {
      console.error('Failed to check share permission:', error);
      return false;
    }
  };

  // 显示VIP拦截
  const showVipInterceptor = () => {
    if (!work) return;
    const appid = getAppId();
    setVipShow(true, {
      works_id: work.id,
      ref_object_id: work.template_id || '',
      tab: appid === 'xueji' ? 'business' : 'personal',
      vipType: 'rsvp',
    });
  };

  // 加载 RSVP 统计信息
  useEffect(() => {
    const loadRSVPStats = async () => {
      if (!workId || !work?.is_rsvp) return;

      try {
        const formConfig = await trpc.rsvp.getFormConfigByWorksId.query({
          works_id: workId,
        });

        if (formConfig) {
          setFormConfigId(formConfig.id);
          const invitees = await trpc.rsvp.getInviteesWithResponseStatus.query({
            form_config_id: formConfig.id,
          });

          const invited = invitees?.length || 0;
          const replied =
            invitees?.filter((item: any) => item.has_response).length || 0;

          setRsvpStats({ invited, replied });
        } else {
          setFormConfigId(null);
          setRsvpStats({ invited: 0, replied: 0 });
        }
      } catch (error) {
        console.error('Failed to load RSVP stats:', error);
        setFormConfigId(null);
        setRsvpStats({ invited: 0, replied: 0 });
      }
    };

    loadRSVPStats();
  }, [workId, work?.is_rsvp]);

  // 判断是否为图片/视频规格（需要分享而不是预览）
  const isImageOrVideoSpec = () => {
    if (!work) return false;
    const specInfo = (work as any).specInfo;
    if (!specInfo) return false;
    const specName = specInfo.export_format || '';
    // poster, video 类型需要分享
    return specName.includes('image') || specName.includes('video');
  };

  // 预览作品（网页类型和RSVP）
  const handlePreview = () => {
    if (!work) return;
    const uid = getUid();

    const url = `/mobile/preview?works_id=${work.id}&uid=${uid}`;
    navigateWithBridge({ path: url, router });
  };

  // 编辑作品
  const handleEdit = () => {
    if (!work) return;
    const uid = getUid();
    const url = `/editor?works_id=${work.id}&uid=${uid}`;
    navigateWithBridge({ path: url, router });
  };

  // 复制作品
  const handleCopy = async () => {
    if (!work || isCopying) return;

    setIsCopying(true);
    try {
      await trpc.works.duplicate.mutate({ id: work.id });
      toast.success('复制成功');
      onDataChange?.(); // 通知数据变更
      onClose?.();
    } catch (error) {
      toast.error('复制失败');
      console.error(error);
    } finally {
      setIsCopying(false);
    }
  };

  // 删除作品
  const handleDelete = async () => {
    if (!work || isDeleting) return;

    setIsDeleting(true);
    try {
      await trpc.works.delete.mutate({ id: work.id });
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      onDataChange?.(); // 通知数据变更
      onClose?.();
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 跳转到指定嘉宾页面
  const handleTargetInvitee = async () => {
    if (!work || !formConfigId) return;

    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }

    const url = `/mobile/rsvp/invitees/create?works_id=${work.id}&form_config_id=${formConfigId}`;
    navigateWithBridge({ path: url, router });
  };

  // 跳转到公开分享页面
  const handlePublicShare = async () => {
    if (!work || !formConfigId) return;

    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }

    const url = `/mobile/rsvp/share?works_id=${work.id}&mode=public&form_config_id=${formConfigId}`;
    navigateWithBridge({ path: url, router });
  };

  // 跳转到宾客管理页面
  const handleManageGuests = async () => {
    if (!work || !formConfigId) return;
    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }

    const url = `/mobile/rsvp/invitees?works_id=${work.id}&form_config_id=${formConfigId}`;
    navigateWithBridge({ path: url, router });
  };

  // 分享给微信好友
  const handleShareToWechat = async () => {
    if (!work || !workId) return;

    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }

    if (!isImageOrVideoSpec()) {
      // 微信分享缩略图尺寸限制：建议 500x400 (5:4 比例)，使用 cdnApi 调整尺寸
      const thumbUrl = work.cover
        ? cdnApi(work.cover, {
            resizeWidth: 500,
            resizeHeight: 400,
            format: 'webp',
            quality: 85,
            mode: 'lfit',
          })
        : '';

      APPBridge.appCall({
        type: 'MKShare',
        appid: 'jiantie',
        params: {
          title: work.title || '邀请函',
          content: work.desc || '',
          thumb: thumbUrl,
          type: 'link',
          shareType: 'wechat',
          url: `${location.origin}/viewer2/${work.id}?appid=${getAppId()}`,
        },
      });
      return;
    }

    try {
      // 图片/视频规格
      setIsGeneratingPoster(true);
      toast.loading('生成海报中...');
      // 使用通用函数生成并分享海报
      const success = await generateAndSharePoster({
        worksId: workId,
        title: work.title || '邀请函',
        desc: (work as any).desc || '',
        cover: work.cover,
        shareType: 'wechat',
      });

      if (!success) {
        toast.error('分享失败，请重试');
      }
    } finally {
      setIsGeneratingPoster(false);
      toast.dismiss();
    }
  };

  // 保存到手机相册（图片/视频规格）
  const handleSaveToAlbum = async () => {
    if (!work) return;
    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }
    if (isImageOrVideoSpec()) {
      const specInfo = (work as any).specInfo;
      if (specInfo?.export_format?.includes('image')) {
        toPosterShare(work.id);
      } else {
        toVideoShare(work.id);
      }
    } else {
      toPosterShare(work.id);
    }
  };

  // 更多分享方式（系统分享）非rsvp
  const handleMoreShare = async () => {
    if (!work || !workId) return;
    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }
    navigator.share({
      title: work.title || '邀请函',
      text: work.desc || '',
      url: `${location.origin}/viewer2/${work.id}?appid=${getAppId()}`,
    });
  };

  if (!work) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-gray-500'>作品不存在</div>
      </div>
    );
  }

  return (
    <>
      <div className='p-4 space-y-4 max-h-[70vh] overflow-y-auto pb-20'>
        {/* 作品信息卡片 */}
        {!shareOnly && (
          <WorkInfoCard
            work={work}
            rsvpStats={rsvpStats}
            size='medium'
            purchaseStatus={null}
          />
        )}

        {/* 编辑操作 */}
        {!shareOnly && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-[#09090B]'>编辑操作</h3>
            <div className='flex gap-2'>
              {!isImageOrVideoSpec() && (
                <SmallActionButton
                  icon={Eye}
                  label='预览'
                  onClick={handlePreview}
                  disabled={isCopying || isDeleting}
                />
              )}
              <SmallActionButton
                icon={Pencil}
                label='编辑'
                onClick={handleEdit}
                disabled={isCopying || isDeleting}
              />
              <SmallActionButton
                icon={Copy}
                label='复制'
                onClick={handleCopy}
                disabled={isDeleting}
                loading={isCopying}
              />
              <SmallActionButton
                icon={Trash2}
                label='删除'
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isCopying}
                variant='destructive'
              />
            </div>
          </div>
        )}

        {/* 分享邀请 */}
        {
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-[#71717a]'>分享邀请</h3>

            {/* 非rsvp规格的分享选项 */}
            {!work.is_rsvp && !isMiniP && (
              <div className='space-y-2'>
                {/* 分享给微信好友 */}
                {isInApp && (
                  <ActionButton
                    icon={
                      <img
                        src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
                        alt='微信'
                        className='w-6 h-6'
                      />
                    }
                    iconBgColor='bg-[#67d773]'
                    title='分享给微信好友'
                    description='生成可直接发送给好友的邀请函'
                    onClick={handleShareToWechat}
                    disabled={isGeneratingPoster}
                  />
                )}

                {/* 保存到手机相册 */}
                <ActionButton
                  icon={<span className='text-2xl'>📥</span>}
                  title='保存到手机相册'
                  description='保存高清海报至相册，便于转发分享'
                  onClick={handleSaveToAlbum}
                  disabled={isGeneratingPoster}
                />

                {/* 更多分享方式 */}
                {!isImageOrVideoSpec() && (
                  <Button
                    onClick={handleMoreShare}
                    disabled={isGeneratingPoster}
                    variant='outline'
                    className='w-full h-auto py-2 px-4 bg-white border-[#e4e4e7] rounded-md text-[#09090b] hover:bg-gray-50'
                  >
                    <Share2 size={14} className='mr-1' />
                    <span className='text-sm font-semibold'>更多分享方式</span>
                  </Button>
                )}
              </div>
            )}

            {/* RSVP 类型的分享选项 */}
            {work.is_rsvp && (
              <div className='space-y-3'>
                {/* 指定嘉宾 */}
                <RoundedActionButton
                  icon={<Target className='w-5 h-5 text-red-500' />}
                  iconBgColor='bg-red-50'
                  title='指定嘉宾'
                  description='向个别嘉宾发送带有专属链接的邀请'
                  onClick={handleTargetInvitee}
                />

                {/* 公开分享 */}
                <RoundedActionButton
                  icon={<Globe className='w-5 h-5 text-blue-500' />}
                  iconBgColor='bg-blue-50'
                  title='公开分享'
                  description='生成公开链接，任何人可填写回执'
                  onClick={handlePublicShare}
                />
              </div>
            )}
          </div>
        }

        {/* 宾客回执（仅 RSVP 类型） */}
        {work.is_rsvp && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-[#09090B]'>宾客回执</h3>
            <RoundedActionButton
              icon={<FileText className='w-5 h-5 text-gray-600' />}
              iconBgColor='bg-gray-100'
              title='管理宾客回执'
              description='查看宾客列表和回执信息'
              onClick={handleManageGuests}
            />
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除作品 &ldquo;{work?.title}&rdquo; 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className='rounded-full'
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='rounded-full bg-red-500 hover:bg-red-600'
            >
              {isDeleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
