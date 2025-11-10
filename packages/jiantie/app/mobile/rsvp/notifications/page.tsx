'use client';
import { getAppId, getUid } from '@/services';
import { getUrlWithParam } from '@/utils';
import { trpc } from '@/utils/trpc';
import APPBridge from '@mk/app-bridge';
import { Button } from '@workspace/ui/components/button';
import { CheckCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRSVPLayout } from '../RSVPLayoutContext';

export default function NotificationsPage() {
  const router = useRouter();
  const { setTitle } = useRSVPLayout();
  const [showUnreadOnly] = useState(false);
  const [notificationsData, setNotificationsData] = useState<any>(null);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // 获取当前用户 ID
  const userId = getUid();

  // 加载通知列表
  const loadNotifications = async (isInitial = false) => {
    if (!userId) {
      return;
    }

    if (isInitial) {
      toast.loading('加载通知中...', { id: 'loading-notifications' });
    }
    try {
      const data = await trpc.rsvp.getMyNotifications.query({
        user_id: userId,
        unread_only: showUnreadOnly,
        take: 100,
      });
      setNotificationsData(data);
      if (isInitial) {
        toast.dismiss('loading-notifications');
      }
    } catch (error: any) {
      if (isInitial) {
        toast.dismiss('loading-notifications');
      }
      toast.error(error.message || '加载失败');
    }
  };

  // 初始加载和筛选变化时重新加载（筛选变化时也算初始加载）
  useEffect(() => {
    if (userId) {
      loadNotifications(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUnreadOnly, userId]);

  // 更新页面标题
  const unreadCount = notificationsData?.unreadCount || 0;
  useEffect(() => {
    setTitle(unreadCount > 0 ? `通知中心 (${unreadCount} 未读)` : '通知中心');
  }, [unreadCount, setTitle]);

  const handleNotificationClick = async (notification: any) => {
    // 如果未读，标记为已读
    if (!notification.is_read && notification.submission?.id && userId) {
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

    // 获取联系人 ID
    const contactId = notification.contact?.id || notification.contact_id;
    if (!contactId) {
      toast.error('无法找到联系人信息');
      return;
    }

    // 获取表单配置和作品ID
    const formConfigId = notification.form_config?.id || '';
    const worksId = notification.form_config?.works_id || '';

    if (!formConfigId || !worksId) {
      toast.error('无法找到表单配置信息');
      return;
    }

    // 跳转到嘉宾详情页面
    const detailUrl = `/mobile/rsvp/invitees/${contactId}?works_id=${worksId}&form_config_id=${formConfigId}`;

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}${detailUrl}`,
        type: 'URL',
      });
    } else {
      router.push(detailUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) {
      toast.error('无法获取用户信息');
      return;
    }
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
        emoji: '✅',
        iconBgColor: '#22c55e', // green-500
        cardBgColor: '#F0FDF4', // green-50
        borderColor: '#bbf7d0', // green-200
        message: companions > 0 ? `确认出席，${companions}位同行` : '确认出席',
      };
    }

    // 确认不出席 - 红色
    if (willAttend === false) {
      return {
        emoji: '❌',
        iconBgColor: '#ef4444', // red-500
        cardBgColor: '#fef2f2', // red-50
        borderColor: '#fecaca', // red-200
        message: '回复不出席',
      };
    }

    // 查看邀请（view_page 类型或没有 submission）- 浅紫色
    if (actionType === 'view_page' || !notification.submission) {
      return {
        emoji: '👀',
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
        emoji: '💬',
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
        emoji: '✏️',
        iconBgColor: '#eab308', // yellow-500
        cardBgColor: '#fefce8', // yellow-50
        borderColor: '#fde047', // yellow-200
        message: '更新了联系信息',
      };
    }

    // 系统通知 - 白色/浅灰色，金色铃铛
    if (notification.is_system) {
      return {
        emoji: '🔔',
        iconBgColor: '#f59e0b', // amber-500 (金色)
        cardBgColor: '#ffffff', // white
        borderColor: '#e5e7eb', // gray-200
        message: notification.message || '系统通知',
      };
    }

    // 默认：已提交
    return {
      emoji: '✅',
      iconBgColor: '#6b7280', // gray-500
      cardBgColor: '#ffffff', // white
      borderColor: '#e5e7eb', // gray-200
      message: '已提交',
    };
  };

  const getSenderName = (notification: any) => {
    return notification.contact?.name || '出席人数';
  };

  // 跳转到作品预览页面
  const handleGoToWork = (
    e: React.MouseEvent,
    worksId: string | null | undefined
  ) => {
    e.stopPropagation(); // 阻止触发通知卡片的点击事件
    if (!worksId) {
      toast.error('作品ID不存在');
      return;
    }

    const uid = getUid();
    const appid = getAppId();

    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/mobile/preview?works_id=${worksId}&uid=${uid}&is_full_screen=1&back=1`,
        type: 'URL',
      });
    } else {
      router.push(
        getUrlWithParam(
          `/mobile/preview?works_id=${worksId}&uid=${uid}&appid=${appid}`,
          'clickid'
        )
      );
    }
  };

  return (
    <div className='relative bg-white min-h-screen pb-20'>
      <div className='p-3'>
        {!userId ? (
          <div className='text-center py-8 text-gray-500'>请先登录</div>
        ) : notifications.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            {showUnreadOnly ? '暂无未读通知' : '暂无通知'}
          </div>
        ) : (
          <div className='space-y-3 relative'>
            {notifications.map((notification: any) => {
              const config = getNotificationConfig(notification);
              const senderName = getSenderName(notification);
              const rsvpTitle = notification.form_config?.title || 'RSVP邀请';
              const worksId = notification.form_config?.works_id;

              return (
                <div
                  key={notification.id}
                  style={{
                    backgroundColor: config.cardBgColor,
                    borderColor: config.borderColor,
                  }}
                  className='p-3 rounded-xl cursor-pointer transition-colors shadow-sm border'
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className='flex items-start gap-3'>
                    {/* 图标 */}
                    <div className='bg-white shadow-md rounded-full w-9 h-9 flex-shrink-0 flex items-center justify-center text-lg'>
                      {config.emoji}
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
                      <div className='text-sm text-gray-700 leading-5 mb-2'>
                        {config.message}
                      </div>

                      {/* RSVP信息和跳转按钮 */}
                      <div className='flex items-center justify-between gap-2 pt-2 border-t border-gray-200/50'>
                        <div className='flex-1 min-w-0'>
                          <div className='text-xs text-gray-500 truncate'>
                            {rsvpTitle}
                          </div>
                        </div>
                        {worksId && (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 px-2 text-xs flex-shrink-0'
                            onClick={e => handleGoToWork(e, worksId)}
                          >
                            <ExternalLink className='h-3 w-3 mr-1' />
                            查看作品
                          </Button>
                        )}
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
        {/* <Button
          className='flex-1'
          variant='outline'
          onClick={() => {
            // TODO: 实现通知设置页面
            toast.success('通知设置功能开发中');
          }}
        >
          <Settings className='h-4 w-4 mr-1' />
          通知设置
        </Button> */}
      </div>
    </div>
  );
}
