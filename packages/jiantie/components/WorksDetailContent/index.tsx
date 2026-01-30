'use client';

import { getShareUrl, useStore } from '@/store';
import { isPc } from '@/utils/devices';
import { SerializedWorksEntity, trpc } from '@/utils/trpc';
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
import { Badge } from '@workspace/ui/components/badge';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  ChevronLeft,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Gift,
  Settings,
  Share2,
  Trash2,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { RSVPProvider } from '../RSVP/RSVPContext';
import { RSVPConfigPanel } from '../RSVP/configPanel';
import { ActionBar, VerticalActionButton } from './ActionButton';
import { WorkInfoCardEditable } from './WorkInfoCardEditable';
import { WorksActionsProvider, useWorksActions } from './WorksActionsContext';

type RSVPStats = {
  invited: number;
  replied: number;
};

interface WorkDetailContentProps {
  shareOnly?: boolean;
  work?: SerializedWorksEntity;
  onClose?: () => void;
  onDataChange?: () => void; // 数据变更回调（删除/复制后触发）
  purchaseStatus?: 'purchased' | 'not-purchased' | null; // 购买状态
}

// 内部组件 - 实际的内容
function WorkDetailContentInner({
  shareOnly = false,
  work,
  onClose,
  onDataChange,
  purchaseStatus,
}: WorkDetailContentProps) {
  const { environment, push } = useStore();
  const worksActions = useWorksActions();

  // 内部管理 work 状态，以便在编辑后更新
  const [currentWork, setCurrentWork] = useState<
    SerializedWorksEntity | undefined
  >(work);

  // 当外部 work 变化时，同步到内部状态
  useEffect(() => {
    if (work) {
      setCurrentWork(work);
    }
  }, [work]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [isFormSetting, setIsFormSetting] = useState(false);
  const [showQrCodeDialog, setShowQrCodeDialog] = useState(false);
  const [rsvpConfig, setRsvpConfig] = useState<any>(null);
  const [rsvpStats, setRsvpStats] = useState<RSVPStats | null>(null);
  const [formSubmissionsCount, setFormSubmissionsCount] = useState(0);
  const [statsData, setStatsData] = useState({
    totalViews: 0,
    totalVisitors: 0,
  });
  const workId = currentWork?.id;

  const exportFormat = work?.specInfo?.export_format;
  const isVideo = exportFormat?.includes('video');
  const isWebsite = exportFormat?.includes('html');
  const isImage = exportFormat?.includes('image');

  const fetchRsvpStats = async () => {
    if (!workId || !isWebsite) {
      setRsvpStats(null);
      return;
    }

    try {
      const invitees = await trpc.rsvp.getInviteesWithResponseStatus.query({
        works_id: workId,
      });

      const invited = invitees?.length || 0;
      const replied = invitees?.filter(item => item.has_response).length || 0;

      setRsvpStats({
        invited,
        replied,
      });
    } catch (error) {
      console.error('获取 RSVP 统计信息失败:', error);
      setRsvpStats(null);
    }
  };

  // 获取表单收集数
  const fetchFormSubmissionsCount = async () => {
    if (!workId || !isWebsite) {
      setFormSubmissionsCount(0);
      return;
    }

    try {
      const data = await trpc.rsvp.getSubmissionsByWorksId.query({
        works_id: workId,
        skip: 0,
        take: 1, // 只需要总数，不需要实际数据
      });
      setFormSubmissionsCount(data?.total || 0);
    } catch (error) {
      console.error('获取表单收集数失败:', error);
      setFormSubmissionsCount(0);
    }
  };

  // 获取回执配置状态
  const fetchRsvpConfig = async () => {
    if (!workId || !isWebsite) {
      setRsvpConfig(null);
      return;
    }

    try {
      const config = await trpc.rsvp.getFormConfigByWorksId.query({
        works_id: workId,
      });
      setRsvpConfig(config);
    } catch (error) {
      console.error('获取回执配置失败:', error);
      setRsvpConfig(null);
    }
  };

  useEffect(() => {
    fetchRsvpConfig();
    fetchRsvpStats();
    fetchFormSubmissionsCount();
  }, [workId, isWebsite]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)['freshPageData'] = () => {
        // 刷新定向邀约数据
        fetchRsvpStats();
      };
    }
  }, []);

  // 处理 work 更新
  const handleWorkUpdate = (updatedWork: SerializedWorksEntity) => {
    setCurrentWork(updatedWork);
  };

  // 预览作品（网页类型和RSVP）
  const handlePreview = () => {
    if (!currentWork) return;
    worksActions.toPreviewModal(currentWork);
  };

  // 编辑作品
  const handleEdit = () => {
    if (!currentWork) return;
    worksActions.editWork(currentWork);
  };

  // 复制作品
  const handleCopy = async () => {
    if (!currentWork) return;
    await worksActions.copyWork(currentWork, () => {
      onDataChange?.();
      onClose?.();
    });
  };

  // 删除作品
  const handleDelete = async () => {
    if (!currentWork) return;
    await worksActions.deleteWork(currentWork, purchaseStatus, () => {
      setDeleteDialogOpen(false);
      onDataChange?.();
      onClose?.();
    });
  };

  // 跳转到指定嘉宾页面
  const handleTargetInvitee = async () => {
    if (!currentWork) return;
    worksActions.manageReceipt(currentWork);
  };

  // 跳转到表单信息列表页面
  const handleFormSubmissionsClick = () => {
    if (!currentWork || !workId) return;
    push(`/mobile/rsvp/form-submissions/${workId}`);
  };

  // 分享给微信好友
  const handleShareToWechat = async (type: 'wechat' | 'wechatTimeline') => {
    if (!currentWork || !workId) return;

    // PC端：显示二维码弹窗
    if (isPc()) {
      setShowQrCodeDialog(true);
      return;
    }

    if (isWebsite) {
      // 网页类型：使用统一分享方法（自动权限检查）
      await worksActions.shareWork(currentWork, type);
      return;
    }

    try {
      return handleSaveToAlbum({
        autoShare: true,
      });
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  // 保存到手机相册（图片/视频规格）
  const handleSaveToAlbum = async (options?: { autoShare?: boolean }) => {
    if (!currentWork) return;
    await worksActions.downloadWork(currentWork, options);
  };

  // 复制链接
  const handleLinkShare = async () => {
    if (!currentWork || !workId) return;
    await worksActions.copyLink(currentWork);
  };

  // 更多分享方式（系统分享）非rsvp
  const handleMoreShare = async () => {
    if (!currentWork || !workId) return;
    await worksActions.shareWork(currentWork, 'system');
  };

  if (!currentWork) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-gray-500'>作品不存在</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='share_container overflow-y-auto pb-20 bg-slate-50 flex-1'>
        <div className='bg-white mb-4 shadow-sm'>
          {/* 作品信息卡片 */}
          <div className='p-4'>
            <WorkInfoCardEditable
              work={currentWork}
              purchaseStatus={purchaseStatus}
              onWorkUpdate={handleWorkUpdate}
            />
          </div>

          {/* 操作按钮栏 */}
          {!shareOnly && (
            <ActionBar className='p-2' count={4}>
              {isWebsite ? (
                // 网页类型：编辑、预览、分享、回执、更多
                <>
                  <VerticalActionButton
                    icon={Edit3}
                    label='编辑'
                    onClick={handleEdit}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                  />
                  <VerticalActionButton
                    icon={Eye}
                    label='预览'
                    onClick={handlePreview}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                  />
                  <VerticalActionButton
                    icon={Copy}
                    label='复制'
                    onClick={handleCopy}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                  />
                  <VerticalActionButton
                    icon={Trash2}
                    label='删除'
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                    variant='danger'
                  />
                </>
              ) : (
                // 图片/视频类型：编辑、下载/分享、复制、删除
                <>
                  <VerticalActionButton
                    icon={Edit3}
                    label='编辑'
                    onClick={handleEdit}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                  />
                  <VerticalActionButton
                    icon={Download}
                    label='下载/分享'
                    onClick={() => handleSaveToAlbum()}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                  />
                  <VerticalActionButton
                    icon={Copy}
                    label='复制'
                    onClick={handleCopy}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                  />
                  <VerticalActionButton
                    icon={Trash2}
                    label='删除'
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={worksActions.isOperating}
                    className='min-w-[60px]'
                    variant='danger'
                  />
                </>
              )}
            </ActionBar>
          )}
        </div>

        {/* 数据概览区域 */}
        {/* {isWebsite && (
          <div className='px-4 mb-4'>
            <StatsCard
              totalViews={statsData.totalViews}
              totalVisitors={statsData.totalVisitors}
              exclusiveInvites={rsvpStats?.invited || 0}
              formSubmissions={formSubmissionsCount}
              onExclusiveInvitesClick={() => {
                handleTargetInvitee();
              }}
              onFormSubmissionsClick={handleFormSubmissionsClick}
            />
          </div>
        )} */}

        {/* 报名与邀请 */}
        {isWebsite && (
          <div className='px-4 mb-4'>
            <div className='bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm'>
              {/* 标题 */}
              <div className='bg-gray-100 border-b border-[#e2e8f0] px-4 py-2'>
                <p className='text-xs font-semibold text-[#64748b]'>回执表单</p>
              </div>

              {/* 宾客回执 */}
              <div
                className='border-b border-[#e2e8f0] px-4 py-4 flex items-center justify-between'
                onClick={e => {
                  e.stopPropagation();
                  setIsFormSetting(true);
                }}
              >
                <div className='flex items-center gap-3'>
                  <div className='bg-slate-50 rounded-[10px] p-2'>
                    <FileText className='w-5 h-5 text-[#020617]' />
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <p className='text-base font-semibold text-[#1d293d]'>
                        回执表单
                      </p>
                      {rsvpConfig?.enabled ? (
                        <Badge
                          variant='success'
                          className='bg-emerald-50 text-[#009966] px-2 py-1'
                        >
                          <span className='inline-block w-1.5 h-1.5 rounded-full bg-[#00bc7d] mr-1'></span>
                          已开启
                        </Badge>
                      ) : (
                        <Badge
                          variant='danger'
                          className='bg-red-50 text-[#dc2626] px-2 py-1'
                        >
                          <span className='inline-block w-1.5 h-1.5 rounded-full bg-[#dc2626] mr-1'></span>
                          未开启
                        </Badge>
                      )}
                      {formSubmissionsCount && (
                        <Badge
                          variant='default'
                          className='bg-blue-50 text-[#2563eb] px-2 py-0.5 text-xs'
                          onClick={e => {
                            e.stopPropagation();
                            handleFormSubmissionsClick();
                          }}
                        >
                          {formSubmissionsCount} 个提交
                        </Badge>
                      )}
                    </div>
                    <p className='text-xs text-[#90a1b9]'>
                      {rsvpConfig?.enabled ? '正在收集信息' : '未开启回执'}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <button
                    title='设置'
                    className='bg-[#f1f5f9] p-2 rounded-lg hover:bg-[#e2e8f0] transition-colors'
                  >
                    <Settings className='w-4 h-4 text-[#020617]' />
                  </button>
                  {/* TODO: 这里可以添加开关按钮 */}
                </div>
              </div>

              {/* 兼容旧的专属邀请，后续可以删除 */}
              {rsvpStats && rsvpStats.invited > 0 && (
                <div
                  className='px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors'
                  onClick={handleTargetInvitee}
                >
                  <div className='flex items-center gap-3'>
                    <div className='bg-violet-50 rounded-[14px] p-2.5'>
                      <Gift className='w-5 h-5 text-[#020617]' />
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <p className='text-base font-semibold text-[#0f172b]'>
                          专属邀请
                        </p>
                        {rsvpStats ? (
                          rsvpStats.invited > 0 ? (
                            // 已开启且有邀请：显示邀请和回应数量
                            <div className='flex items-center gap-1.5'>
                              <Badge
                                variant='default'
                                className='bg-blue-50 text-[#2563eb] px-2 py-0.5 text-xs'
                              >
                                已邀请 {rsvpStats.invited}
                              </Badge>
                              <Badge
                                variant='default'
                                className='bg-green-50 text-[#16a34a] px-2 py-0.5 text-xs'
                              >
                                已回应 {rsvpStats.replied}
                              </Badge>
                            </div>
                          ) : (
                            // 未开启或没有邀请
                            <Badge
                              variant='danger'
                              className='bg-gray-50 text-[#64748b] px-2 py-1'
                            >
                              <span className='inline-block w-1.5 h-1.5 rounded-full bg-[#94a3b8] mr-1'></span>
                              未开启
                            </Badge>
                          )
                        ) : null}
                      </div>
                      <p className='text-xs text-[#90a1b9]'>
                        生成专属嘉宾请柬 (VIP)
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className='w-4 h-4 text-[#90a1b9] rotate-180' />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 分享方式 */}
        {
          <div className='px-4 mb-4'>
            <div className='bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm'>
              {/* 标题 */}
              <div className='bg-gray-100 border-b border-[#e2e8f0] px-4 py-2'>
                <p className='text-xs font-semibold text-[#64748b]'>分享方式</p>
              </div>

              {/* 分享选项 */}
              <div className='p-2'>
                <div className='grid grid-cols-4 items-center gap-2'>
                  {/* 分享给微信好友 */}
                  {!isVideo && (
                    <VerticalActionButton
                      icon={
                        <img
                          src='https://img2.maka.im/cdn/webstore10/jiantie/icon_weixin.png'
                          alt='微信'
                          className='w-8 h-8'
                        />
                      }
                      label='微信'
                      onClick={() => handleShareToWechat('wechat')}
                      disabled={isGeneratingPoster}
                    />
                  )}

                  {/* 链接分享 */}
                  {isWebsite && (
                    <>
                      <VerticalActionButton
                        icon={
                          <img
                            src='https://img2.maka.im/cdn/webstore10/jiantie/icon_pengyouquan.png'
                            alt='微信'
                            className='w-8 h-8'
                          />
                        }
                        label='朋友圈'
                        onClick={() => handleShareToWechat('wechatTimeline')}
                        disabled={isGeneratingPoster}
                      />
                      <VerticalActionButton
                        icon={<span className='text-3xl'>🔗</span>}
                        label='复制链接'
                        onClick={handleLinkShare}
                        disabled={isGeneratingPoster}
                      />
                    </>
                  )}
                  {/* 保存海报到手机相册 */}
                  {(isImage || isWebsite) && (
                    <VerticalActionButton
                      icon={<span className='text-3xl'>🏞️</span>}
                      label='导出图片'
                      onClick={() => handleSaveToAlbum()}
                      disabled={isGeneratingPoster}
                    />
                  )}

                  {/* 保存视频到手机相册 */}
                  {isVideo && (
                    <VerticalActionButton
                      label='导出视频'
                      icon={<span className='text-3xl'>🎬</span>}
                      onClick={() => handleSaveToAlbum()}
                      disabled={isGeneratingPoster}
                    />
                  )}

                  {/* 更多分享方式 */}
                  {isWebsite && !environment.isInMiniP && (
                    <VerticalActionButton
                      onClick={handleMoreShare}
                      disabled={isGeneratingPoster}
                      icon={<Share2 size={24} />}
                      label='更多分享'
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除作品 &ldquo;{currentWork?.title}&rdquo;
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialogOpen(false)}
              disabled={worksActions.isOperating}
              className='rounded-full'
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={worksActions.isOperating}
              className='rounded-full bg-red-500 hover:bg-red-600'
            >
              {worksActions.isOperating ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RSVPProvider worksId={workId} canCreate={true}>
        <ResponsiveDialog
          isOpen={isFormSetting}
          onOpenChange={setIsFormSetting}
          handleOnly={true}
          className='max-h-[80vh] overflow-hidden'
        >
          <RSVPConfigPanel
            onClose={() => {
              setIsFormSetting(false);
              // 关闭后刷新回执配置状态
              fetchRsvpConfig();
            }}
          />
        </ResponsiveDialog>
      </RSVPProvider>

      {/* 微信分享二维码弹窗 */}
      <ResponsiveDialog
        isOpen={showQrCodeDialog}
        onOpenChange={setShowQrCodeDialog}
        isDialog={true}
        contentProps={{
          className: 'max-w-[400px]',
        }}
      >
        <div className='flex flex-col items-center gap-4 p-6'>
          <div className='text-lg font-semibold text-gray-900'>
            使用微信扫一扫分享
          </div>
          <div className='flex items-center justify-center p-4 bg-white rounded-lg border border-gray-200'>
            {currentWork && workId && typeof window !== 'undefined' && (
              <QRCodeCanvas value={getShareUrl(workId)} size={200} level='H' />
            )}
          </div>
          <p className='text-sm text-gray-500 text-center'>
            请使用微信扫描上方二维码，在微信中打开并分享
          </p>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

// 外部组件 - 包裹 Provider
export function WorkDetailContent(props: WorkDetailContentProps) {
  return (
    <WorksActionsProvider>
      <WorkDetailContentInner {...props} />
    </WorksActionsProvider>
  );
}
