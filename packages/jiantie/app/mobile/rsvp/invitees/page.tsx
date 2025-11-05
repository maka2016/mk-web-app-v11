'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { useShareNavigation } from '@/utils/share';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { BehaviorBox } from '@workspace/ui/components/BehaviorTracker';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { ArrowRight, Share, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './share.module.scss';

export default function RSVPInviteesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formConfigId = searchParams.get('form_config_id') || '';
  const worksId = searchParams.get('works_id') || '';

  const [inviteeResponses, setInviteeResponses] = useState<any[]>([]);
  const [viewingInvitee, setViewingInvitee] = useState<any>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseFilter, setResponseFilter] = useState<
    'all' | 'responded' | 'not_responded'
  >('all');

  // 分享面板相关状态
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isMiniP, setIsMiniP] = useState(false);
  const [executingKey, setExecutingKey] = useState<string | null>(null);

  const { toPosterShare } = useShareNavigation();

  // 生成公开链接
  const publicLink = useMemo(() => {
    if (typeof window === 'undefined' || !worksId) return '';
    const origin = window.location.origin;
    return `${origin}/viewer2/${worksId}`;
  }, [worksId]);

  // 初始化 APP 环境判断
  useEffect(() => {
    const initAPP = async () => {
      await APPBridge.init();
      setIsMiniP(APPBridge.judgeIsInMiniP());
    };
    initAPP();
  }, []);

  // 跳转到嘉宾管理页面
  const handleNavigateToManage = () => {
    const params = new URLSearchParams();
    if (formConfigId) params.set('form_config_id', formConfigId);
    if (worksId) params.set('works_id', worksId);
    router.push(`/mobile/rsvp/invitees/manage?${params.toString()}`);
  };

  // 查询当前RSVP下的嘉宾响应状态
  useEffect(() => {
    const fetchInviteeResponses = async () => {
      if (!formConfigId) return;
      try {
        const data = await trpc.rsvp.getInviteesWithResponseStatus.query({
          form_config_id: formConfigId,
        });
        setInviteeResponses(data || []);
      } catch (error: any) {
        console.error('Failed to fetch invitee responses:', error);
        toast.error(error.message || '加载失败');
      }
    };
    fetchInviteeResponses();
  }, [formConfigId]);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('复制成功');
  };

  // 保存长图
  const savePoster = async () => {
    if (!worksId) return;
    toPosterShare(worksId);
  };

  // 不再强制要求formConfigId，因为嘉宾归属于用户
  // 但需要worksId用于生成链接

  return (
    <div className='relative bg-white'>
      <MobileHeader title={'嘉宾邀请'} />

      <div className='px-4 py-3 max-h-[80vh] overflow-y-auto flex flex-col gap-4'>
        {/* 公开链接分享 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            公开链接分享
          </div>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setShareDialogOpen(true);
                }}
              >
                公开分享
              </Button>
            </div>
          </div>
        </div>

        {/* 指定嘉宾分享 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            指定嘉宾分享
          </div>
          <div className='space-y-2'>
            <Button
              variant='outline'
              className='w-full h-10 font-semibold'
              onClick={handleNavigateToManage}
            >
              <User size={16} className='mr-2' />
              指定嘉宾
            </Button>
          </div>
        </div>

        {/* 邀请记录 */}
        <div className='border border-black/[0.1] rounded-xl p-3'>
          <div className='font-semibold text-base leading-6 text-[#09090B] mb-3'>
            邀请记录
          </div>

          {/* 分类标签 */}
          <div className='flex items-center gap-2 mb-3'>
            <Button
              size='sm'
              variant={responseFilter === 'all' ? 'default' : 'outline'}
              className={
                responseFilter === 'all'
                  ? 'bg-[#3358D4] text-white hover:bg-[#3358D4]/90'
                  : ''
              }
              onClick={() => setResponseFilter('all')}
            >
              全部
            </Button>
            <Button
              size='sm'
              variant={responseFilter === 'responded' ? 'default' : 'outline'}
              className={
                responseFilter === 'responded'
                  ? 'bg-[#3358D4] text-white hover:bg-[#3358D4]/90'
                  : ''
              }
              onClick={() => setResponseFilter('responded')}
            >
              已响应
            </Button>
            <Button
              size='sm'
              variant={
                responseFilter === 'not_responded' ? 'default' : 'outline'
              }
              className={
                responseFilter === 'not_responded'
                  ? 'bg-[#3358D4] text-white hover:bg-[#3358D4]/90'
                  : ''
              }
              onClick={() => setResponseFilter('not_responded')}
            >
              未响应
            </Button>
          </div>

          {/* 筛选后的记录列表 */}
          <div className='space-y-3'>
            {(() => {
              // 根据筛选条件过滤记录
              const filteredResponses = inviteeResponses.filter((item: any) => {
                if (responseFilter === 'all') return true;
                if (responseFilter === 'responded')
                  return item.has_response === true;
                if (responseFilter === 'not_responded')
                  return item.has_response === false;
                return true;
              });

              if (filteredResponses.length === 0) {
                return (
                  <div className='text-sm text-gray-500 text-center py-4'>
                    暂无记录
                  </div>
                );
              }

              return filteredResponses.map((item: any) => {
                // 状态文本和颜色
                let statusText = '未响应';
                let statusColor = 'text-gray-500';
                let statusBgColor = 'bg-gray-50';

                if (item.has_response) {
                  if (item.will_attend === true) {
                    statusText = '已确认出席';
                    statusColor = 'text-green-600';
                    statusBgColor = 'bg-green-50';
                  } else if (item.will_attend === false) {
                    statusText = '已确认不出席';
                    statusColor = 'text-orange-600';
                    statusBgColor = 'bg-orange-50';
                  } else {
                    statusText = '已响应';
                    statusColor = 'text-blue-600';
                    statusBgColor = 'bg-blue-50';
                  }
                }

                return (
                  <div
                    key={item.id}
                    className='border border-[#e4e4e7] rounded-lg p-4 cursor-pointer hover:border-[#3358D4] hover:shadow-sm transition-all'
                    onClick={() => {
                      setViewingInvitee(item);
                      setResponseDialogOpen(true);
                    }}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='font-semibold text-sm leading-5 text-[#09090B] mb-2'>
                          {item.name || '未知嘉宾'}
                        </div>
                        <div className='flex items-center gap-2 mb-2'>
                          <span
                            className={`text-xs px-2 py-1 rounded ${statusColor} ${statusBgColor}`}
                          >
                            {statusText}
                          </span>
                        </div>
                        {item.submission_create_time ? (
                          <div className='text-xs text-gray-400'>
                            响应时间：
                            {new Date(
                              item.submission_create_time
                            ).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        ) : (
                          <div className='text-xs text-gray-400'>
                            邀请时间：
                            {new Date(item.create_time).toLocaleString(
                              'zh-CN',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        size={16}
                        className='text-gray-400 flex-shrink-0 ml-2'
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* 嘉宾响应详情弹窗 */}
        <ResponsiveDialog
          isOpen={responseDialogOpen}
          onOpenChange={setResponseDialogOpen}
          title={viewingInvitee ? `${viewingInvitee.name}的响应详情` : ''}
        >
          {viewingInvitee && (
            <div className='px-4 pb-4 max-h-[70vh] overflow-y-auto'>
              <div className='border border-[#e4e4e7] rounded-md p-3'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <div className='font-semibold text-sm'>嘉宾信息</div>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-gray-600'>姓名：</span>
                      <span className='text-xs text-gray-800'>
                        {viewingInvitee.name}
                      </span>
                    </div>
                    {viewingInvitee.phone && (
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-gray-600'>手机：</span>
                        <span className='text-xs text-gray-800'>
                          {viewingInvitee.phone}
                        </span>
                      </div>
                    )}
                    {viewingInvitee.email && (
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-gray-600'>邮箱：</span>
                        <span className='text-xs text-gray-800'>
                          {viewingInvitee.email}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className='pt-3 border-t border-gray-200'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-xs text-gray-600'>响应状态：</span>
                      <span
                        className={`text-xs font-semibold ${
                          viewingInvitee.has_response
                            ? viewingInvitee.will_attend === true
                              ? 'text-green-600'
                              : viewingInvitee.will_attend === false
                                ? 'text-orange-600'
                                : 'text-blue-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {viewingInvitee.has_response
                          ? viewingInvitee.will_attend === true
                            ? '已确认出席'
                            : viewingInvitee.will_attend === false
                              ? '已确认不出席'
                              : '已响应'
                          : '未响应'}
                      </span>
                    </div>
                    {viewingInvitee.submission_create_time && (
                      <div className='flex items-center gap-2 mb-2'>
                        <span className='text-xs text-gray-600'>
                          响应时间：
                        </span>
                        <span className='text-xs text-gray-500'>
                          {new Date(
                            viewingInvitee.submission_create_time
                          ).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {viewingInvitee.submission_data &&
                    typeof viewingInvitee.submission_data === 'object' &&
                    Object.keys(viewingInvitee.submission_data).filter(
                      key => !key.startsWith('_')
                    ).length > 0 && (
                      <div className='pt-3 border-t border-gray-200'>
                        <div className='text-xs font-semibold text-gray-700 mb-2'>
                          表单数据：
                        </div>
                        <div className='space-y-1'>
                          {Object.entries(viewingInvitee.submission_data).map(
                            ([key, value]) => {
                              if (key.startsWith('_')) return null;
                              return (
                                <div
                                  key={key}
                                  className='flex items-start justify-between text-xs'
                                >
                                  <span className='text-gray-600 flex-shrink-0 mr-2'>
                                    {key}：
                                  </span>
                                  <span className='text-gray-800 text-right flex-1'>
                                    {typeof value === 'object'
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </ResponsiveDialog>

        {/* 分享设置面板 - 用于公开链接分享 */}
        <ResponsiveDialog
          isOpen={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          title='分享设置'
        >
          <div className='px-4 pb-4'>
            <div className={styles.shareTypesWrap}>
              <div className={styles.title}>
                <Share size={16} color='#09090B' />
                <span>分享方式</span>
              </div>
              <div className={styles.shareTypes}>
                {/* 复制链接 */}
                <BehaviorBox
                  behavior={{
                    object_type: 'rsvp_share_copy_link_btn',
                    object_id: worksId,
                  }}
                  className={styles.shareItem}
                  onClick={() => {
                    if (publicLink) {
                      handleCopyLink(publicLink);
                    }
                  }}
                >
                  <img
                    src='https://img2.maka.im/cdn/webstore10/jiantie/icon_lianjie.png'
                    alt='复制链接'
                  />
                  <span>复制链接</span>
                </BehaviorBox>

                {/* 保存长图 */}
                {!isMiniP && (
                  <BehaviorBox
                    behavior={{
                      object_type: 'rsvp_share_poster_btn',
                      object_id: worksId,
                    }}
                    className={styles.shareItem}
                    onClick={async () => {
                      if (executingKey) return;
                      setExecutingKey('poster');
                      try {
                        await savePoster();
                      } finally {
                        setExecutingKey(null);
                      }
                    }}
                  >
                    <img
                      src='https://res.maka.im/cdn/webstore10/jiantie/icon_poster.png'
                      alt='长图'
                    />
                    <span>保存长图</span>
                  </BehaviorBox>
                )}
              </div>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    </div>
  );
}
