'use client';

import { getAppId, getUid } from '@/services';
import { useStore } from '@/store';
import { useCheckPublish } from '@/utils/checkPubulish';
import { navigateWithBridge } from '@/utils/navigate-with-bridge';
import { generateAndSharePoster } from '@/utils/poster-share';
import { useShareNavigation } from '@/utils/share';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
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
  ChevronRight,
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
import { WorkInfoCard } from './WorkInfoCard';

type RSVPStats = {
  invited: number;
  replied: number;
};

interface WorkDetailContentProps {
  work?: SerializedWorksEntity;
  onClose?: () => void;
  onDataChange?: () => void; // 数据变更回调（删除/复制后触发）
}

export function WorkDetailContent({
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
    const appid = getAppId();

    const url = `/mobile/preview?works_id=${work.id}&uid=${uid}&appid=${appid}`;
    navigateWithBridge({ path: url, router });
  };

  // 编辑作品
  const handleEdit = () => {
    if (!work) return;
    const uid = getUid();
    const appid = getAppId();
    const url = `/mobile/editor?works_id=${work.id}&uid=${uid}&appid=${appid}`;
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

  // 分享给微信好友（图片/视频规格）
  const handleShareToWechat = async () => {
    if (!work || !workId) return;

    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }

    try {
      setIsGeneratingPoster(true);
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
    }
  };

  // 保存到手机相册（图片/视频规格）
  const handleSaveToAlbum = async () => {
    if (!work) return;
    if (isImageOrVideoSpec()) {
      const specInfo = (work as any).specInfo;
      if (specInfo?.export_format?.includes('image')) {
        toPosterShare(work.id);
      } else {
        toVideoShare(work.id);
      }
    }
  };

  // 更多分享方式（系统分享）（图片/视频规格）
  const handleMoreShare = async () => {
    if (!work || !workId) return;

    // 检查分享权限
    const hasPermission = await checkSharePermission();
    if (!hasPermission) {
      showVipInterceptor();
      return;
    }

    try {
      setIsGeneratingPoster(true);
      // 使用通用函数生成并分享海报
      const success = await generateAndSharePoster({
        worksId: workId,
        title: work.title || '邀请函',
        desc: (work as any).desc || '',
        cover: work.cover,
        shareType: 'system',
      });

      if (!success) {
        toast.error('分享失败，请重试');
      }
    } finally {
      setIsGeneratingPoster(false);
    }
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
        <WorkInfoCard
          work={work}
          rsvpStats={rsvpStats}
          size='medium'
          purchaseStatus={null}
        />

        {/* 编辑操作 */}
        <div className='space-y-3'>
          <h3 className='text-sm font-semibold text-[#09090B]'>编辑操作</h3>
          <div className='flex gap-2'>
            {!isImageOrVideoSpec() && (
              <Button
                variant='outline'
                onClick={handlePreview}
                disabled={isCopying || isDeleting}
                className='flex items-center justify-center gap-1 h-auto py-2 px-2 flex-1'
              >
                <Eye className='w-4 h-4 text-gray-600' />
                <span className='text-xs text-gray-600'>预览</span>
              </Button>
            )}
            <Button
              variant='outline'
              onClick={handleEdit}
              disabled={isCopying || isDeleting}
              className='flex items-center justify-center gap-1 h-auto py-2 px-2 flex-1'
            >
              <Pencil className='w-4 h-4 text-gray-600' />
              <span className='text-xs text-gray-600'>编辑</span>
            </Button>
            <Button
              variant='outline'
              onClick={handleCopy}
              disabled={isCopying || isDeleting}
              className='flex items-center justify-center gap-1 h-auto py-2 px-2 flex-1'
            >
              <Copy className='w-4 h-4 text-gray-600' />
              <span className='text-xs text-gray-600'>
                {isCopying ? '复制中...' : '复制'}
              </span>
            </Button>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isCopying || isDeleting}
              className='flex items-center justify-center gap-1 h-auto py-2 px-2 flex-1'
            >
              <Trash2 className='w-4 h-4 text-red-500' />
              <span className='text-xs text-red-500'>删除</span>
            </Button>
          </div>
        </div>

        {/* 分享邀请 */}
        {(work.is_rsvp || isImageOrVideoSpec()) && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-[#71717a]'>分享邀请</h3>

            {/* 图片/视频规格的分享选项 */}
            {isImageOrVideoSpec() && !isMiniP && (
              <div className='space-y-2'>
                {/* 分享给微信好友 */}
                {isInApp && (
                  <button
                    onClick={handleShareToWechat}
                    disabled={isGeneratingPoster}
                    className='w-full bg-white border border-[#e4e4e7] rounded-[14px] p-4 flex items-center gap-3 active:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <div className='w-11 h-11 bg-[#67d773] rounded-xl flex items-center justify-center flex-shrink-0'>
                      <svg
                        width='24'
                        height='24'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M8.5 11.5C8.91421 11.5 9.25 11.1642 9.25 10.75C9.25 10.3358 8.91421 10 8.5 10C8.08579 10 7.75 10.3358 7.75 10.75C7.75 11.1642 8.08579 11.5 8.5 11.5Z'
                          fill='white'
                        />
                        <path
                          d='M11.5 11.5C11.9142 11.5 12.25 11.1642 12.25 10.75C12.25 10.3358 11.9142 10 11.5 10C11.0858 10 10.75 10.3358 10.75 10.75C10.75 11.1642 11.0858 11.5 11.5 11.5Z'
                          fill='white'
                        />
                        <path
                          fillRule='evenodd'
                          clipRule='evenodd'
                          d='M10 4C6.13401 4 3 6.79086 3 10.2C3 11.8326 3.68813 13.3116 4.81619 14.4018C4.73866 15.0764 4.52952 15.7181 4.20989 16.2975C3.89026 16.8769 3.46731 17.3846 2.96681 17.7946C2.75926 17.9651 2.68186 18.2482 2.77304 18.5007C2.86423 18.7532 3.10433 18.9233 3.37495 18.9319C4.82253 18.9694 6.18364 18.4632 7.24984 17.5766C8.08808 17.8519 8.99611 18 9.95 18C13.816 18 17 15.2091 17 11.8C17 8.39086 13.866 5.6 10 5.6C9.66863 5.6 9 6.26863 9 6.6V10.8C9 11.4627 9.53726 12 10.2 12H13.95C14.2814 12 14.55 11.7314 14.55 11.4C14.55 11.0686 14.2814 10.8 13.95 10.8H10.2V6.6C10.2 6.26863 9.86863 6 9.53726 6C13.816 6 17 8.79086 17 12.2C17 15.6091 13.866 18.4 10 18.4C6.13401 18.4 3 15.6091 3 12.2C3 8.79086 6.13401 6 10 6V4Z'
                          fill='white'
                        />
                      </svg>
                    </div>
                    <div className='flex-1 text-left'>
                      <div className='text-base font-semibold text-[#09090b] leading-6'>
                        分享给微信好友
                      </div>
                      <div className='text-xs text-[#6a7282] leading-[18px]'>
                        生成可直接发送给好友的邀请函
                      </div>
                    </div>
                    <div className='text-[#99a1af] text-xl'>›</div>
                  </button>
                )}

                {/* 保存到手机相册 */}
                <button
                  onClick={handleSaveToAlbum}
                  disabled={isGeneratingPoster}
                  className='w-full bg-white border border-[#e4e4e7] rounded-[14px] p-4 flex items-center gap-3 active:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <div className='w-11 h-11 flex items-center justify-center flex-shrink-0'>
                    <span className='text-2xl'>📥</span>
                  </div>
                  <div className='flex-1 text-left'>
                    <div className='text-base font-semibold text-[#09090b] leading-6'>
                      保存到手机相册
                    </div>
                    <div className='text-xs text-[#6a7282] leading-[18px]'>
                      保存高清海报至相册，便于转发分享
                    </div>
                  </div>
                  <div className='text-[#99a1af] text-xl'>›</div>
                </button>

                {/* 更多分享方式 */}
                <Button
                  onClick={handleMoreShare}
                  disabled={isGeneratingPoster}
                  variant='outline'
                  className='w-full h-auto py-2 px-4 bg-white border-[#e4e4e7] rounded-md text-[#09090b] hover:bg-gray-50'
                >
                  <Share2 size={14} className='mr-1' />
                  <span className='text-sm font-semibold'>更多分享方式</span>
                </Button>
              </div>
            )}

            {/* RSVP 类型的分享选项 */}
            {work.is_rsvp && !isImageOrVideoSpec() && (
              <div className='space-y-3'>
                {/* 指定嘉宾 */}
                <button
                  onClick={handleTargetInvitee}
                  className='w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors'
                >
                  <div className='w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0'>
                    <Target className='w-5 h-5 text-red-500' />
                  </div>
                  <div className='flex-1 text-left'>
                    <span className='text-sm font-medium text-[#09090B]'>
                      指定嘉宾
                    </span>
                    <p className='text-xs text-gray-500 mt-1'>
                      向个别嘉宾发送带有专属链接的邀请
                    </p>
                  </div>
                  <ChevronRight className='w-5 h-5 text-gray-400 flex-shrink-0' />
                </button>

                {/* 公开分享 */}
                <button
                  onClick={handlePublicShare}
                  className='w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors'
                >
                  <div className='w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0'>
                    <Globe className='w-5 h-5 text-blue-500' />
                  </div>
                  <div className='flex-1 text-left'>
                    <span className='text-sm font-medium text-[#09090B]'>
                      公开分享
                    </span>
                    <p className='text-xs text-gray-500 mt-1'>
                      生成公开链接，任何人都可以RSVP
                    </p>
                  </div>
                  <ChevronRight className='w-5 h-5 text-gray-400 flex-shrink-0' />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 宾客回执（仅 RSVP 类型） */}
        {work.is_rsvp && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-[#09090B]'>宾客回执</h3>
            <div className='bg-white rounded-lg border border-gray-100 shadow-sm'>
              <button
                onClick={handleManageGuests}
                className='w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors'
              >
                <div className='w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0'>
                  <FileText className='w-5 h-5 text-gray-600' />
                </div>
                <div className='flex-1 text-left'>
                  <span className='text-sm font-medium text-[#09090B]'>
                    管理宾客回执
                  </span>
                  <p className='text-xs text-gray-500 mt-1'>
                    查看宾客列表和回执信息
                  </p>
                </div>
                <ChevronRight className='w-5 h-5 text-gray-400 flex-shrink-0' />
              </button>
            </div>
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
