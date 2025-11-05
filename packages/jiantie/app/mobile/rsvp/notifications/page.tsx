'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Separator } from '@workspace/ui/components/separator';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const router = useRouter();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notificationsData, setNotificationsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // TODO: 需要从 session 或 context 获取当前用户 ID
  const userId = 'current_user_id'; // 临时占位

  // 加载通知列表
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await trpc.rsvp.getMyNotifications.query({
        user_id: userId,
        unread_only: showUnreadOnly,
        take: 100,
      });
      setNotificationsData(data);
    } catch (error: any) {
      toast.error(error.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载和筛选变化时重新加载
  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUnreadOnly]);

  const handleNotificationClick = async (notification: any) => {
    setSelectedNotification(notification);
    setDetailDialogOpen(true);

    // 如果未读，标记为已读
    if (!notification.is_read && notification.submission?.id) {
      try {
        await trpc.rsvp.markNotificationAsRead.mutate({
          user_id: userId,
          submission_ids: [notification.submission.id],
        });
        // 重新加载通知列表
        loadNotifications();
      } catch (error: any) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (
      !confirm(
        `确定要标记所有 ${notificationsData?.total || 0} 条通知为已读吗？`
      )
    ) {
      return;
    }
    setIsMarkingAsRead(true);
    try {
      await trpc.rsvp.markAllNotificationsAsRead.mutate({ user_id: userId });
      toast.success('已全部标记为已读');
      loadNotifications();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const getNotificationTitle = (notification: any) => {
    const action =
      notification.action_type === 'submit' ? '提交了' : '重新提交了';
    const formTitle = notification.form_config?.title || 'RSVP';
    return `${notification.contact?.name || '访客'}${action}${formTitle}`;
  };

  const getNotificationDesc = (notification: any) => {
    const willAttend = notification.submission?.will_attend;
    if (willAttend === true) return '确认出席';
    if (willAttend === false) return '确认不出席';
    return '已提交';
  };

  const getStatusColor = (notification: any) => {
    const willAttend = notification.submission?.will_attend;
    if (willAttend === true) return 'text-green-600';
    if (willAttend === false) return 'text-gray-500';
    return 'text-blue-600';
  };

  return (
    <div className='relative bg-white min-h-screen'>
      <MobileHeader title='通知中心' />
      <div className='px-4 py-3 border-b border-black/[0.06]'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Bell className='h-5 w-5' />
            <span className='font-semibold text-lg leading-[26px]'>
              RSVP 通知
            </span>
            {unreadCount > 0 && (
              <span className='bg-red-500 text-white text-xs px-2 py-0.5 rounded-full'>
                {unreadCount}
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className='text-xs'
            >
              {showUnreadOnly ? '全部' : '未读'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAsRead}
                className='text-xs'
              >
                <CheckCheck className='h-4 w-4 mr-1' />
                全部已读
              </Button>
            )}
          </div>
        </div>
      </div>
      <Separator />

      <div className='px-4 py-3'>
        {isLoading ? (
          <div className='text-center py-8 text-gray-500'>加载中...</div>
        ) : notifications.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            {showUnreadOnly ? '暂无未读通知' : '暂无通知'}
          </div>
        ) : (
          <div className='space-y-2'>
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  notification.is_read
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className='flex items-start gap-3'>
                  <div
                    className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                      notification.is_read ? 'bg-gray-300' : 'bg-blue-500'
                    }`}
                  />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <div className='font-medium text-sm leading-5 mb-1'>
                          {getNotificationTitle(notification)}
                        </div>
                        <div
                          className={`text-xs ${getStatusColor(notification)}`}
                        >
                          {getNotificationDesc(notification)}
                        </div>
                      </div>
                      <div className='text-xs text-gray-400 whitespace-nowrap'>
                        {new Date(notification.create_time).toLocaleString(
                          'zh-CN',
                          {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 通知详情弹窗 */}
      <ResponsiveDialog
        isOpen={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        title='通知详情'
      >
        {selectedNotification && (
          <div className='px-4 pb-4'>
            <div className='space-y-4'>
              {/* 表单信息 */}
              <div className='border-b pb-3'>
                <div className='text-sm text-gray-600 mb-1'>表单</div>
                <div className='font-semibold'>
                  {selectedNotification.form_config?.title}
                </div>
              </div>

              {/* 嘉宾信息 */}
              <div className='border-b pb-3'>
                <div className='text-sm text-gray-600 mb-1'>嘉宾</div>
                <div className='font-semibold'>
                  {selectedNotification.contact?.name || '访客'}
                </div>
                {selectedNotification.contact?.phone && (
                  <div className='text-sm text-gray-500 mt-1'>
                    {selectedNotification.contact.phone}
                  </div>
                )}
              </div>

              {/* 提交状态 */}
              <div className='border-b pb-3'>
                <div className='text-sm text-gray-600 mb-1'>状态</div>
                <div
                  className={`font-semibold ${getStatusColor(selectedNotification)}`}
                >
                  {getNotificationDesc(selectedNotification)}
                </div>
              </div>

              {/* 提交时间 */}
              <div className='border-b pb-3'>
                <div className='text-sm text-gray-600 mb-1'>
                  {selectedNotification.action_type === 'submit'
                    ? '提交时间'
                    : '重新提交时间'}
                </div>
                <div className='text-sm'>
                  {new Date(selectedNotification.create_time).toLocaleString(
                    'zh-CN'
                  )}
                </div>
              </div>

              {/* 表单数据 */}
              {selectedNotification.submission?.submission_data &&
                typeof selectedNotification.submission.submission_data ===
                  'object' &&
                Object.keys(
                  selectedNotification.submission.submission_data
                ).filter(key => !key.startsWith('_')).length > 0 && (
                  <div>
                    <div className='text-sm text-gray-600 mb-2'>表单内容</div>
                    <div className='bg-gray-50 rounded p-3 space-y-2'>
                      {Object.entries(
                        selectedNotification.submission.submission_data
                      ).map(([key, value]) => {
                        if (key.startsWith('_')) return null;
                        return (
                          <div
                            key={key}
                            className='flex items-start justify-between text-sm'
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
                      })}
                    </div>
                  </div>
                )}

              {/* 操作按钮 */}
              <div className='flex gap-2 pt-2'>
                <Button
                  className='flex-1'
                  variant='outline'
                  onClick={() => {
                    router.push(
                      `/mobile/rsvp/share?form_config_id=${selectedNotification.form_config?.id}&works_id=${selectedNotification.form_config?.works_id}`
                    );
                  }}
                >
                  查看详情
                </Button>
                {!selectedNotification.is_read && (
                  <Button
                    className='flex-1'
                    onClick={async () => {
                      if (selectedNotification.submission?.id) {
                        try {
                          await trpc.rsvp.markNotificationAsRead.mutate({
                            user_id: userId,
                            submission_ids: [
                              selectedNotification.submission.id,
                            ],
                          });
                          loadNotifications();
                          setDetailDialogOpen(false);
                        } catch (error: any) {
                          toast.error(error.message || '操作失败');
                        }
                      }
                    }}
                  >
                    <Check className='h-4 w-4 mr-1' />
                    标记已读
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
