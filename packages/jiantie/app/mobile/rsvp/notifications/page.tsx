'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Bell,
  Check,
  CheckCheck,
  Edit,
  MessageSquare,
  Settings,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// 双眼睛图标组件
const EyesIcon = ({ className }: { className?: string }) => (
  <div
    className={className}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3px',
      width: '20px',
      height: '20px',
    }}
  >
    <svg
      width='10'
      height='10'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      style={{ flexShrink: 0 }}
    >
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
    <svg
      width='10'
      height='10'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      style={{ flexShrink: 0 }}
    >
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  </div>
);

export default function NotificationsPage() {
  const router = useRouter();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showUnreadOnly] = useState(false);
  const [notificationsData, setNotificationsData] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // TODO: 需要从 session 或 context 获取当前用户 ID
  const userId = 'current_user_id'; // 临时占位

  // 加载通知列表
  const loadNotifications = async (isInitial = false) => {
    if (isInitial) {
      setIsInitialLoading(true);
    } else {
      setIsUpdating(true);
    }
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
      if (isInitial) {
        setIsInitialLoading(false);
      } else {
        setIsUpdating(false);
      }
    }
  };

  // 初始加载和筛选变化时重新加载（筛选变化时也算初始加载）
  useEffect(() => {
    setIsInitialLoading(true);
    loadNotifications(true);
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
        // 重新加载通知列表（更新数据，保留原有UI）
        loadNotifications(false);
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
      loadNotifications(false);
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // 格式化相对时间
  const formatRelativeTime = (date: Date | string) => {
    const now = new Date();
    const time = new Date(date);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return time.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  // 获取通知类型配置
  const getNotificationConfig = (notification: any) => {
    const willAttend = notification.submission?.will_attend;
    const actionType = notification.action_type;
    const submissionData = notification.submission?.submission_data || {};

    // 确认出席 - 绿色
    if (willAttend === true) {
      const companions =
        submissionData.companions || submissionData._companions || 0;
      return {
        icon: Check,
        iconComponent: null,
        iconBgColor: '#22c55e', // green-500
        cardBgColor: '#f0fdf4', // green-50
        borderColor: '#bbf7d0', // green-200
        message: companions > 0 ? `确认出席，${companions}位同行` : '确认出席',
      };
    }

    // 确认不出席 - 红色
    if (willAttend === false) {
      return {
        icon: X,
        iconComponent: null,
        iconBgColor: '#ef4444', // red-500
        cardBgColor: '#fef2f2', // red-50
        borderColor: '#fecaca', // red-200
        message: '回复不出席',
      };
    }

    // 查看邀请（view_page 类型或没有 submission）- 浅紫色
    if (actionType === 'view_page' || !notification.submission) {
      return {
        icon: null,
        iconComponent: EyesIcon,
        iconBgColor: '#a855f7', // purple-500
        cardBgColor: '#faf5ff', // purple-50
        borderColor: '#e9d5ff', // purple-200
        message: '查看了邀请',
      };
    }

    // 有留言的情况（在 submission_data 中有留言字段）- 浅蓝色
    if (
      submissionData.message ||
      submissionData.comment ||
      submissionData.note
    ) {
      const message =
        submissionData.message || submissionData.comment || submissionData.note;
      return {
        icon: MessageSquare,
        iconComponent: null,
        iconBgColor: '#3b82f6', // blue-500
        cardBgColor: '#eff6ff', // blue-50
        borderColor: '#bfdbfe', // blue-200
        message:
          typeof message === 'string' && message.length > 30
            ? `${message.substring(0, 30)}...`
            : message || '已提交',
      };
    }

    // 更新联系信息（resubmit 且数据有变化）- 浅黄色
    if (actionType === 'resubmit') {
      return {
        icon: Edit,
        iconComponent: null,
        iconBgColor: '#eab308', // yellow-500
        cardBgColor: '#fefce8', // yellow-50
        borderColor: '#fde047', // yellow-200
        message: '更新了联系信息',
      };
    }

    // 系统通知 - 白色/浅灰色，金色铃铛
    if (notification.is_system) {
      return {
        icon: Bell,
        iconComponent: null,
        iconBgColor: '#f59e0b', // amber-500 (金色)
        cardBgColor: '#ffffff', // white
        borderColor: '#e5e7eb', // gray-200
        message: notification.message || '系统通知',
      };
    }

    // 默认：已提交
    return {
      icon: Check,
      iconComponent: null,
      iconBgColor: '#6b7280', // gray-500
      cardBgColor: '#ffffff', // white
      borderColor: '#e5e7eb', // gray-200
      message: '已提交',
    };
  };

  const getSenderName = (notification: any) => {
    return notification.contact?.name || '访客';
  };

  const getNotificationDesc = (notification: any) => {
    const config = getNotificationConfig(notification);
    return config.message;
  };

  const getStatusColor = (notification: any) => {
    const config = getNotificationConfig(notification);
    // 根据图标背景色返回对应的文本颜色
    if (config.iconBgColor === '#22c55e') return 'text-green-600';
    if (config.iconBgColor === '#ef4444') return 'text-red-600';
    if (config.iconBgColor === '#a855f7') return 'text-purple-600';
    if (config.iconBgColor === '#3b82f6') return 'text-blue-600';
    if (config.iconBgColor === '#eab308') return 'text-yellow-600';
    if (config.iconBgColor === '#f59e0b') return 'text-amber-600';
    return 'text-gray-600';
  };

  return (
    <div className='relative bg-white min-h-screen pb-20'>
      <MobileHeader
        title={unreadCount > 0 ? `通知中心 (${unreadCount} 未读)` : '通知中心'}
      />

      <div className='px-4 py-3'>
        {isInitialLoading ? (
          <div className='text-center py-8 text-gray-500'>加载中...</div>
        ) : notifications.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            {showUnreadOnly ? '暂无未读通知' : '暂无通知'}
          </div>
        ) : (
          <div className='space-y-3 relative'>
            {/* 更新时的加载指示器 - 显示在列表顶部 */}
            {isUpdating && (
              <div className='absolute -top-2 left-0 right-0 z-10 flex justify-center'>
                <div className='bg-blue-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-md'>
                  <div className='h-2.5 w-2.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  <span>更新中...</span>
                </div>
              </div>
            )}
            {notifications.map((notification: any) => {
              const config = getNotificationConfig(notification);
              const IconComponent = config.icon;
              const IconCustomComponent = config.iconComponent;
              const senderName = getSenderName(notification);

              return (
                <div
                  key={notification.id}
                  style={{
                    backgroundColor: config.cardBgColor,
                    borderColor: config.borderColor,
                    borderWidth: notification.is_read ? '1px' : '2px',
                  }}
                  className='p-4 rounded-xl cursor-pointer transition-colors shadow-sm border'
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className='flex items-start gap-3'>
                    {/* 图标 */}
                    <div
                      style={{
                        backgroundColor: config.iconBgColor,
                      }}
                      className='rounded-full p-2 flex-shrink-0 flex items-center justify-center'
                    >
                      {IconCustomComponent ? (
                        <IconCustomComponent className='h-5 w-5 text-white' />
                      ) : IconComponent ? (
                        <IconComponent className='h-5 w-5 text-white' />
                      ) : null}
                    </div>

                    {/* 内容 */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2 mb-1'>
                        <div className='flex items-center gap-1.5 flex-1 min-w-0'>
                          <span className='font-medium text-sm text-gray-900'>
                            {senderName}
                          </span>
                          {!notification.is_read && (
                            <div className='h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0' />
                          )}
                        </div>
                        <div className='text-xs text-gray-400 whitespace-nowrap'>
                          {formatRelativeTime(notification.create_time)}
                        </div>
                      </div>
                      <div className='text-sm text-gray-700 leading-5'>
                        {config.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3'>
        <Button
          className='flex-1'
          variant='outline'
          onClick={handleMarkAllAsRead}
          disabled={isMarkingAsRead || unreadCount === 0}
        >
          <CheckCheck className='h-4 w-4 mr-1' />
          全部已读
        </Button>
        <Button
          className='flex-1'
          variant='outline'
          onClick={() => {
            // TODO: 实现通知设置页面
            toast.success('通知设置功能开发中');
          }}
        >
          <Settings className='h-4 w-4 mr-1' />
          通知设置
        </Button>
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
                          loadNotifications(false);
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
