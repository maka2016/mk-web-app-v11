'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { getAppId, getUid } from '@/services';
import { useStore } from '@/store';
import { getUrlWithParam } from '@/utils';
import { useCheckPublish } from '@/utils/checkPubulish';
import { toVipPage } from '@/utils/jiantie';
import { trpc } from '@/utils/trpc';
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
  Target,
  Trash2,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { WorkInfoCard } from '../components/WorkInfoCard';

type WorksDetail = any;
type RSVPStats = {
  invited: number;
  replied: number;
};

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appid = getAppId();
  const { isVip } = useStore();
  const { canShareWithoutWatermark } = useCheckPublish();
  const workId = params.id as string;

  const [work, setWork] = useState<WorksDetail | null>(null);
  const [rsvpStats, setRsvpStats] = useState<RSVPStats | null>(null);
  const [formConfigId, setFormConfigId] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 返回上一页
  const handleBack = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navAppBack();
    } else {
      router.back();
    }
  };

  // 加载作品详情
  useEffect(() => {
    const loadWork = async () => {
      if (!workId) return;

      setLoading(true);
      try {
        const detail = await trpc.works.findById.query({ id: workId });
        setWork(detail);

        // 检查分享权限
        if (isVip) {
          setCanShare(true);
        } else {
          try {
            const hasPermission = await canShareWithoutWatermark(workId);
            setCanShare(hasPermission);
          } catch (error) {
            console.error('Failed to check share permission:', error);
            setCanShare(false);
          }
        }

        // 如果是 RSVP 类型，获取统计信息
        if (detail.is_rsvp) {
          try {
            const formConfig = await trpc.rsvp.getFormConfigByWorksId.query({
              works_id: workId,
            });

            if (formConfig) {
              setFormConfigId(formConfig.id);
              const invitees =
                await trpc.rsvp.getInviteesWithResponseStatus.query({
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
        }
      } catch (error) {
        toast.error('加载作品详情失败');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadWork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId, isVip]);

  // 预览作品
  const handlePreview = () => {
    if (!work) return;
    const uid = getUid();

    router.replace(
      `/mobile/preview?works_id=${work.id}&uid=${uid}&appid=${appid}`
    );
  };

  // 编辑作品
  const handleEdit = () => {
    if (!work) return;
    const uid = getUid();
    router.replace(`/editor?works_id=${work.id}&uid=${uid}&appid=${appid}`);
  };

  // 复制作品
  const handleCopy = async () => {
    if (!work) return;
    try {
      await trpc.works.duplicate.mutate({ id: work.id });
      toast.success('复制成功');
      handleBack();
    } catch (error) {
      toast.error('复制失败');
      console.error(error);
    }
  };

  // 删除作品
  const handleDelete = async () => {
    if (!work) return;
    try {
      await trpc.works.delete.mutate({ id: work.id });
      toast.success('删除成功');
      setDeleteDialogOpen(false);
      handleBack();
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    }
  };

  // 跳转到指定嘉宾页面
  const handleTargetInvitee = () => {
    if (!work || !formConfigId) return;
    const url = `/mobile/rsvp/invitees/create?works_id=${work.id}&form_config_id=${formConfigId}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${url}`,
        type: 'URL',
      });
    } else {
      router.push(url);
    }
  };

  // 跳转到公开分享页面
  const handlePublicShare = () => {
    if (!work || !formConfigId) return;
    const url = `/mobile/rsvp/share?works_id=${work.id}&mode=public&form_config_id=${formConfigId}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${url}`,
        type: 'URL',
      });
    } else {
      router.push(url);
    }
  };

  // 跳转到宾客管理页面
  const handleManageGuests = () => {
    if (!work || !formConfigId) return;
    const url = `/mobile/rsvp/invitees?works_id=${work.id}&form_config_id=${formConfigId}`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${url}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(getUrlWithParam(`${url}&appid=${appid}`, 'clickid'));
    }
  };

  if (loading) {
    return (
      <div className='relative bg-gray-50 min-h-screen'>
        <MobileHeader title='邀请函详情' rightText='' onClose={handleBack} />
        <div className='flex items-center justify-center p-8'>
          <div className='text-gray-500'>加载中...</div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className='relative bg-gray-50 min-h-screen'>
        <MobileHeader title='邀请函详情' rightText='' onClose={handleBack} />
        <div className='flex items-center justify-center p-8'>
          <div className='text-gray-500'>作品不存在</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='relative bg-gray-50 min-h-screen'>
        <MobileHeader title='邀请函详情' rightText='' onClose={handleBack} />

        <div className='p-4 space-y-4'>
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
            <div className='grid grid-cols-4 gap-2'>
              <Button
                variant='outline'
                onClick={handlePreview}
                className='flex items-center justify-center gap-1 h-auto py-2 px-2'
              >
                <Eye className='w-4 h-4 text-gray-600' />
                <span className='text-xs text-gray-600'>预览</span>
              </Button>
              <Button
                variant='outline'
                onClick={handleEdit}
                className='flex items-center justify-center gap-1 h-auto py-2 px-2'
              >
                <Pencil className='w-4 h-4 text-gray-600' />
                <span className='text-xs text-gray-600'>编辑</span>
              </Button>
              <Button
                variant='outline'
                onClick={handleCopy}
                className='flex items-center justify-center gap-1 h-auto py-2 px-2'
              >
                <Copy className='w-4 h-4 text-gray-600' />
                <span className='text-xs text-gray-600'>复制</span>
              </Button>
              <Button
                variant='outline'
                onClick={() => setDeleteDialogOpen(true)}
                className='flex items-center justify-center gap-1 h-auto py-2 px-2'
              >
                <Trash2 className='w-4 h-4 text-red-500' />
                <span className='text-xs text-red-500'>删除</span>
              </Button>
            </div>
          </div>

          {/* 分享邀请（仅 RSVP 类型） */}
          {work.is_rsvp && (
            <div className='space-y-3'>
              <h3 className='text-sm font-semibold text-[#09090B]'>分享邀请</h3>
              <div className='space-y-3'>
                {canShare ? (
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
                ) : (
                  <div className='bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100'>
                    <div className='flex flex-col items-center text-center py-4'>
                      <div className='w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3'>
                        <svg
                          className='w-6 h-6 text-purple-600'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                          />
                        </svg>
                      </div>
                      <h4 className='text-base font-semibold text-[#09090B] mb-2'>
                        升级解锁分享功能
                      </h4>
                      <p className='text-sm text-gray-600 mb-4'>
                        升级会员或购买作品后即可使用分享邀请功能
                      </p>
                      <Button
                        onClick={() => {
                          toVipPage({
                            works_id: work.id,
                            ref_object_id: work.template_id || '',
                            tab: appid === 'xueji' ? 'business' : 'personal',
                            vipType: 'rsvp',
                          });
                        }}
                        className='px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-medium hover:from-purple-700 hover:to-blue-700 shadow-md'
                      >
                        立即升级
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
              className='rounded-full'
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='rounded-full bg-red-500 hover:bg-red-600'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
