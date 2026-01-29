'use client';

import { isWechat } from '@/utils';
import { trpc } from '@/utils/trpc';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Textarea } from '@workspace/ui/components/textarea';
import { ArrowUpRight, Copy, Share2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useWechatInfo } from '../../GridViewer/wechat';
import { updateWechatShare } from '../../GridViewer/wechat/wechatShare';
import {
  DEFAULT_RELAY_THEME,
  parseRelayTheme,
  RelayAttrs,
  RelayDisplayMode,
} from '../type';
import { RelayDebugButton } from './RelayDebugButton';
import { RelayUserList } from './RelayUserList';

type RelayRuntime = 'editor' | 'visitor';

interface RelayCompProps {
  /** 作品ID，用于关联接力配置 */
  worksId: string;
  /** 是否允许创建配置（默认通过URL判断是否是编辑器模式） */
  canCreate?: boolean;
  /** 接力主题设置（可选） */
  theme?: any;
  /** 显示模式 */
  displayMode?: RelayDisplayMode;
  /** 组件属性（从画布传入） */
  attrs?: RelayAttrs;
  /** 作品详情（可选，用于获取封面等信息） */
  worksDetail?: {
    title?: string;
    cover?: string;
  };
}

// 判断是否是编辑器模式
const isEditorMode = () => {
  if (typeof window === 'undefined') return false;
  return /editor/.test(window.location.href);
};

// 判断是否是调试模式（通过URL参数或环境变量）
const isDebugMode = () => {
  // 调试模式已关闭
  return false;
};

type RelayMainViewProps = {
  runtime: RelayRuntime;
  relayTheme: any;
  contentPrefix: string;
  contentSuffix: string;
  displayRank: number | string;
  buttonText: string;
  submitting: boolean;
  currentUserRelayed: boolean;
  /** 当前用户微信头像（初始化已获取到时展示） */
  currentUserAvatarUrl?: string;
  showUserList: boolean;
  records: any[];
  relayCount: number;
  listDisplayMode: 'horizontal' | 'grid';
  onRelayClick?: () => void;
  onOpenAllUsers?: () => void;
  isFull?: boolean;
};

function RelayMainView({
  runtime,
  relayTheme,
  contentPrefix,
  contentSuffix,
  displayRank,
  buttonText,
  submitting,
  currentUserRelayed,
  currentUserAvatarUrl,
  showUserList,
  records,
  relayCount,
  listDisplayMode,
  onRelayClick,
  onOpenAllUsers,
  isFull = false,
}: RelayMainViewProps) {
  const visibleRecords = records.slice(0, 8);

  // 满员且未参与时，显示满员提示
  const showFullMessage = isFull && !currentUserRelayed;
  const showAvatar = runtime === 'visitor' && !!currentUserAvatarUrl;

  return (
    <div
      className={
        runtime === 'editor'
          ? 'relay-comp relative z-10 space-y-4'
          : 'relay-comp space-y-4'
      }
      style={{
        color: relayTheme.textColor,
        backgroundColor: relayTheme.listBackgroundColor || 'transparent',
        pointerEvents: runtime === 'editor' ? 'none' : 'auto',
      }}
    >
      {/* 顶部内容：我是第 X 名接力者 或 已满员提示 */}
      <div className='text-center'>
        <div className='inline-flex items-center justify-center gap-2'>
          {showAvatar && (
            <img
              src={currentUserAvatarUrl}
              alt='微信头像'
              className='h-6 w-6 rounded-full object-cover'
              onError={e => {
                // 如果头像加载失败，直接隐藏，避免破坏标题布局
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )}
          <div
            className='text-lg font-semibold'
            style={{ color: relayTheme.textColor }}
          >
            {showFullMessage ? (
              '接力已结束'
            ) : (
              <>
                {contentPrefix}
                <span className='mx-1 text-red-500 font-bold'>
                  {displayRank}
                </span>
                {contentSuffix}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 接力按钮（编辑器禁用交互，访客可点击） */}
      <Button
        variant={currentUserRelayed ? 'secondary' : 'default'}
        size='lg'
        onClick={e => {
          if (runtime === 'editor') return;
          e.preventDefault();
          e.stopPropagation();
          onRelayClick?.();
        }}
        disabled={runtime === 'editor' ? true : submitting || showFullMessage}
        className={runtime === 'editor' ? 'w-full opacity-60' : 'w-full'}
        style={{
          backgroundColor: relayTheme.buttonColor,
          color: relayTheme.buttonTextColor,
        }}
      >
        {runtime === 'visitor' && submitting ? (
          '接力中...'
        ) : runtime === 'visitor' && currentUserRelayed ? (
          <>已接力，分享邀请好友</>
        ) : showFullMessage ? (
          '已满员'
        ) : (
          buttonText
        )}
      </Button>

      {/* 用户列表 */}
      {showUserList && (
        <div>
          {records.length > 0 && (
            <>
              <div
                className='text-sm font-medium mb-2 text-center'
                style={{
                  color:
                    relayTheme.secondaryTextColor || relayTheme.titleTextColor,
                }}
              >
                {`已有${relayCount}人参与`}
              </div>
              <RelayUserList
                records={visibleRecords}
                displayMode={listDisplayMode}
                theme={relayTheme}
                showAvatarOnly
              />
            </>
          )}

          {/* 常驻：无论是否超过 8 人，都可以查看留言列表 */}
          <div
            className={records.length > 0 ? 'mt-2 text-center' : 'text-center'}
          >
            <Button
              variant='link'
              size='sm'
              className='text-red-500'
              onClick={() => onOpenAllUsers?.()}
            >
              查看留言
            </Button>
          </div>
        </div>
      )}

      {runtime === 'editor' && (
        <div className='mt-2 text-xs text-center text-gray-400'>编辑器预览</div>
      )}
    </div>
  );
}

export default function RelayComp({
  worksId,
  theme,
  worksDetail: providedWorksDetail,
}: RelayCompProps) {
  const isEditor = isEditorMode();
  const isDebug = isDebugMode();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const wechatInfo = useWechatInfo();
  const {
    openId: userOpenid,
    unionId: userUnionid,
    wechatName,
    wxAvatar,
  } = wechatInfo?.wechatClientInfo || {};

  // 配置和状态数据
  const [configData, setConfigData] = useState<{
    config: any;
    relay_count: number;
    current_user_relayed: boolean;
  } | null>(null);
  const [listData, setListData] = useState<{
    data: any[];
    total: number;
  } | null>(null);
  const [checkData, setCheckData] = useState<{
    relayed: boolean;
    relay_record: any;
    user_rank: number | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [showAllUsersDialog, setShowAllUsersDialog] = useState(false);

  // 加载配置数据
  const loadConfig = useCallback(async () => {
    if (!worksId) return;
    try {
      const data = await trpc.relay.getConfig.query({ works_id: worksId });
      setConfigData(data);
    } catch (error: any) {
      console.error('Failed to load relay config:', error);
    }
  }, [worksId]);

  // 加载列表数据
  const loadList = useCallback(async () => {
    if (!worksId || !configData?.config?.enabled) return;
    try {
      const data = await trpc.relay.getList.query({
        works_id: worksId,
        skip: 0,
        take: 20,
      });
      setListData(data);
    } catch (error: any) {
      console.error('Failed to load relay list:', error);
    }
  }, [worksId, configData?.config?.enabled]);

  // 检查用户是否已接力
  const loadCheck = useCallback(async () => {
    if (!worksId || !userOpenid) return;
    try {
      // 确保 openid 去除空格
      const normalizedOpenid = userOpenid.trim();
      const data = await trpc.relay.check.query({
        works_id: worksId,
        openid: normalizedOpenid,
      });
      setCheckData(data);
    } catch (error: any) {
      console.error('Failed to check relay status:', error);
      toast.error(`loadCheck error: ${JSON.stringify(error)}`);
    }
  }, [worksId, userOpenid]);

  // 初始加载
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 监听配置更新事件
  useEffect(() => {
    const handleConfigUpdate = (event: CustomEvent) => {
      const updatedWorksId = event.detail?.worksId;
      // 如果事件中的 worksId 与当前组件匹配，或者没有指定 worksId（全局更新），则刷新配置
      if (!updatedWorksId || updatedWorksId === worksId) {
        loadConfig();
      }
    };

    window.addEventListener(
      'relay-config-updated',
      handleConfigUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        'relay-config-updated',
        handleConfigUpdate as EventListener
      );
    };
  }, [worksId, loadConfig]);

  // 当配置加载完成后加载列表
  useEffect(() => {
    if (configData?.config?.enabled) {
      loadList();
    }
  }, [configData?.config?.enabled, loadList]);

  // 当用户openid变化时检查状态
  useEffect(() => {
    if (userOpenid) {
      loadCheck();
    }
  }, [userOpenid, loadCheck]);

  // 解析主题配置
  const relayTheme = useMemo(() => {
    if (theme) {
      const parsed = parseRelayTheme(theme);
      return parsed
        ? { ...DEFAULT_RELAY_THEME, ...parsed }
        : DEFAULT_RELAY_THEME;
    }
    return DEFAULT_RELAY_THEME;
  }, [theme]);

  // 获取配置
  const config = configData?.config;
  const relayCount = configData?.relay_count || 0;
  const currentUserRelayed = checkData?.relayed || false;
  const userRank = checkData?.user_rank || null;
  const records = listData?.data || [];

  // 计算是否满员
  const isFull =
    !!config?.max_relay_count && relayCount >= config.max_relay_count;

  // 计算显示的排名：如果用户已接力，显示实际排名；否则显示总人数+1
  const displayRank =
    currentUserRelayed && userRank !== null ? userRank : relayCount + 1;

  // 获取分享配置（必须在所有条件返回之前调用）
  const shareConfig = useMemo(() => {
    const shareTitle =
      config?.share_title ||
      `接力挑战 - ${providedWorksDetail?.title || window.document.title || '等你来接力'}`;
    const shareDesc = config?.share_desc || '接力挑战，等你来参与';

    // 获取当前页面URL，添加接力来源参数
    const currentUrl = new URL(window.location.href);
    if (userOpenid && !currentUrl.searchParams.has('relay_from')) {
      currentUrl.searchParams.set('relay_from', userOpenid);
    }
    const shareLink = currentUrl.toString();

    // 获取作品封面
    const shareCover = providedWorksDetail?.cover || '';

    return {
      title: shareTitle,
      desc: shareDesc,
      cover: shareCover,
      link: shareLink,
    };
  }, [
    config?.share_title,
    config?.share_desc,
    providedWorksDetail?.title,
    providedWorksDetail?.cover,
    userOpenid,
  ]);

  // 按钮文案
  const buttonText = config?.button_text || '接力';

  // 内容显示配置
  const contentPrefix = config?.content_prefix ?? '我是第';
  const contentSuffix = config?.content_suffix ?? '名接力者';

  // 内容显示（3段格式） - 目前主要用于 UI 展示，不单独使用字符串

  // 获取预设词列表（如果为空，使用默认值）
  const messagePresets = useMemo(() => {
    const configPresets = config?.message_presets as string[] | null;
    if (!configPresets || configPresets.length === 0) {
      return ['加油！'];
    }
    return configPresets;
  }, [config?.message_presets]);

  // 格式化时间显示（用于表格视图）
  const formatTime = (time: Date | string): string => {
    try {
      const date = typeof time === 'string' ? new Date(time) : time;
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) {
        return '刚刚';
      } else if (minutes < 60) {
        return `${minutes}分钟前`;
      } else if (hours < 24) {
        return `${hours}小时前`;
      } else if (days < 7) {
        return `${days}天前`;
      } else {
        return date.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        });
      }
    } catch {
      return '';
    }
  };

  // 获取用户头像或默认头像（用于表格视图）
  const getUserAvatar = (avatar: string | null | undefined): string => {
    if (avatar) return avatar;
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTAgMTBDMTIuNzYxNCAxMCAxNSA3Ljc2MTQyIDE1IDVDMTUgMi4yMzg1OCAxMi43NjE0IDAgMTAgMEM3LjIzODU4IDAgNSAyLjIzODU4IDUgNUM1IDcuNzYxNDIgNy4yMzg1OCAxMCAxMCAxMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEwIDEyQzYuNjg2MyAxMiA0IDEzLjY4NjMgNCAxN0g2QzYgMTQuNzg5MSA3Ljc4OTA5IDEzIDEwIDEzQzEyLjIxMDkgMTMgMTQgMTQuNzg5MSAxNCAxN0gxNkMxNiAxMy42ODYzIDEzLjMxMzcgMTIgMTAgMTJaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  };

  // 如果配置不存在或未启用，且不在编辑器模式，不显示
  if (!isEditor && (!config || !config.enabled)) {
    return null;
  }

  // 编辑器模式：用“默认值/占位数据”喂给同一套渲染，避免两套 UI 漂移
  if (isEditor) {
    const placeholderRecords: any[] = [
      {
        id: 'placeholder-1',
        user_nickname: '用户A',
        user_avatar: null,
        relay_time: new Date(),
      },
      {
        id: 'placeholder-2',
        user_nickname: '用户B',
        user_avatar: null,
        relay_time: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: 'placeholder-3',
        user_nickname: '用户C',
        user_avatar: null,
        relay_time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ];

    const showUserList = config?.show_user_list !== false;
    const listDisplayMode = (config?.list_display_mode || 'horizontal') as
      | 'horizontal'
      | 'grid';
    const previewButtonText = config?.button_text || '接力';

    return (
      <RelayMainView
        runtime='editor'
        relayTheme={relayTheme}
        contentPrefix={contentPrefix}
        contentSuffix={contentSuffix}
        displayRank={'x'}
        buttonText={previewButtonText}
        submitting={false}
        currentUserRelayed={false}
        currentUserAvatarUrl={undefined}
        showUserList={showUserList}
        records={placeholderRecords}
        relayCount={placeholderRecords.length}
        listDisplayMode={listDisplayMode}
        isFull={false}
      />
    );
  }

  // 处理已接力状态下的分享
  const handleShareAfterRelay = () => {
    console.log('handleShareAfterRelay called');
    // 调试模式下跳过微信检查
    if (!isDebug && !isWechat()) {
      toast.error('请在微信中打开');
      return;
    }

    // 调试模式下直接显示分享弹窗，不显示微信分享引导
    if (isDebug) {
      setShowShareDialog(true);
      return;
    }

    // 先显示引导提示
    console.log('Setting showShareGuide to true');
    setShowShareGuide(true);

    // 已接力后触发分享：使用 updateWechatShare 刷新微信分享信息
    updateWechatShare({
      title: shareConfig.title,
      desc: shareConfig.desc,
      wxThumb: shareConfig.cover,
      link: shareConfig.link,
    });
  };

  // 点击预设词快速填充
  const handlePresetClick = (preset: string) => {
    setMessage(preset);
  };

  // 实际提交接力的函数
  const submitRelay = async (userMessage?: string | null) => {
    if (submitting) {
      return;
    }

    // 调试模式下使用默认数据，否则使用微信数据（用于 submit + 失败回填 check）
    const submitUserOpenid = isDebug
      ? `debug_openid_${Date.now()}`
      : userOpenid;

    setSubmitting(true);
    try {
      // 获取来源参数（如果有）
      const urlParams = new URLSearchParams(window.location.search);
      const relayFrom = urlParams.get('relay_from');

      // unionId 为空时传递 undefined，兼容没有 unionId 的情况
      const debugUserUnionid = isDebug
        ? undefined // 调试模式下不传 unionid
        : userUnionid || undefined; // 确保为空时传递 undefined
      const debugUserNickname = isDebug
        ? `调试用户_${Date.now().toString().slice(-4)}`
        : wechatName || '微信用户';
      const debugUserAvatar = isDebug ? undefined : wxAvatar;

      // 提交接力
      await trpc.relay.submit.mutate({
        works_id: worksId,
        user_openid: submitUserOpenid!,
        user_unionid: debugUserUnionid, // unionId 为空时传递 undefined
        user_nickname: debugUserNickname,
        user_avatar: debugUserAvatar || undefined,
        share_source: relayFrom || undefined,
        user_message: userMessage || null,
      });

      toast.success('接力成功！');

      // 更新微信分享标题
      if (config?.share_title) {
        updateWechatShare({
          title: config.share_title,
          desc: shareConfig.desc,
          wxThumb: shareConfig.cover,
          link: shareConfig.link,
        });
      }

      setShowShareDialog(true);

      // 重新加载数据（调试模式下需要传入调试openid）
      if (isDebug) {
        // 调试模式下需要手动调用 check，传入调试openid
        try {
          const checkData = await trpc.relay.check.query({
            works_id: worksId,
            openid: submitUserOpenid!,
          });
          setCheckData(checkData);
        } catch (error: any) {
          console.error('Failed to check relay status in debug mode:', error);
        }
      }
      await Promise.all([
        loadConfig(),
        loadList(),
        isDebug ? Promise.resolve() : loadCheck(),
      ]);
    } catch (error: any) {
      // 调试：打印完整的错误信息
      console.error('Relay submit error:', error);
      console.error('Error details:', {
        message: error?.message,
        data: error?.data,
        code: error?.code || error?.data?.code,
        shape: error?.shape,
      });

      // 提取友好的错误消息
      let errorMessage = '接力失败，请重试';

      // 优先从 error.message 获取错误消息（TRPC 的错误消息通常在这里）
      const message = error?.message || '';

      // 如果是已知的业务错误消息，直接使用
      if (
        message.includes('已经参与过接力') ||
        message.includes('接力功能已禁用') ||
        message.includes('已达到上限') ||
        message.includes('作品不存在') ||
        message.includes('无权操作')
      ) {
        errorMessage = message;
      } else if (message) {
        // 过滤掉可能包含 SQL 错误信息的内容
        const sqlKeywords = [
          'unique constraint',
          'constraint failed',
          'P2002',
          'SQL',
          'database',
          'prisma',
          'violates unique constraint',
          'duplicate key',
        ];
        const hasSqlError = sqlKeywords.some(keyword =>
          message.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasSqlError) {
          // 如果是 SQL 错误（包括唯一约束），使用友好的默认消息
          errorMessage = '您已经参与过接力了';
        } else {
          // 其他未知错误，使用原消息（如果存在）
          errorMessage = message || errorMessage;
        }
      }

      toast.error(errorMessage);

      // 如果提示“已参与过接力”，立即刷新一次 check/config/list，避免标题仍显示“未接力名次”
      const alreadyRelayed =
        errorMessage.includes('已经参与过接力') ||
        errorMessage.includes('您已经参与过接力了');
      if (alreadyRelayed && submitUserOpenid) {
        try {
          const latestCheck = await trpc.relay.check.query({
            works_id: worksId,
            openid: submitUserOpenid,
          });
          setCheckData(latestCheck);
        } catch (e) {
          console.error(
            'Failed to refresh relay check after duplicate submit:',
            e
          );
        }
        // 人数/列表也可能因为其他人接力发生变化，顺手刷新（失败不影响主流程）
        await Promise.all([loadConfig(), loadList()]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 处理接力按钮点击
  const handleRelay = async () => {
    console.log('handleRelay called, currentUserRelayed:', currentUserRelayed);
    // 如果已接力，触发分享引导
    if (currentUserRelayed) {
      handleShareAfterRelay();
      return;
    }

    // 调试模式下跳过微信检查
    if (!isDebug) {
      if (!isWechat()) {
        toast.error('请在微信中打开');
        return;
      }

      if (!userOpenid) {
        wechatInfo?.setNeedAuth(true);
        return;
      }
    }

    // 如果启用了留言功能，显示留言弹窗
    if (config?.enable_message) {
      setMessage('');
      setShowMessageDialog(true);
      return;
    }

    // 如果没有启用留言功能，直接提交
    await submitRelay(null);
  };

  // 处理留言弹窗确认
  const handleMessageDialogConfirm = async () => {
    setShowMessageDialog(false);
    await submitRelay(message.trim() || null);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareConfig.link);
      toast.success('链接已复制到剪贴板');
      setShowShareDialog(false);
    } catch (error) {
      toast.error('复制失败，请手动复制');
      console.error('Failed to copy link:', error);
    }
  };

  const handleWechatShare = () => {
    if (!isWechat()) {
      toast.error('请在微信中打开');
      return;
    }

    // 已接力分享给好友：使用 updateWechatShare 更新微信分享信息
    updateWechatShare({
      title: shareConfig.title,
      desc: shareConfig.desc,
      wxThumb: shareConfig.cover,
      link: shareConfig.link,
    });

    // 关闭弹窗
    setShowShareDialog(false);
  };

  return (
    <>
      <RelayMainView
        runtime='visitor'
        relayTheme={relayTheme}
        contentPrefix={contentPrefix}
        contentSuffix={contentSuffix}
        displayRank={displayRank}
        buttonText={buttonText}
        submitting={submitting}
        currentUserRelayed={currentUserRelayed}
        currentUserAvatarUrl={wxAvatar}
        showUserList={!!config?.show_user_list}
        records={records}
        relayCount={relayCount}
        listDisplayMode={
          (config?.list_display_mode || 'horizontal') as 'horizontal' | 'grid'
        }
        onRelayClick={handleRelay}
        onOpenAllUsers={() => setShowAllUsersDialog(true)}
        isFull={isFull}
      />

      {/* 分享弹窗 */}
      <ResponsiveDialog
        isOpen={showShareDialog}
        onOpenChange={setShowShareDialog}
        title='接力成功！'
        description='快分享给下一个朋友吧~'
        showCloseIcon={true}
      >
        <div className='px-4 py-6 space-y-6'>
          {/* 描述文字 */}
          <div className='text-center text-sm text-muted-foreground leading-5'>
            将链接分享给好友，邀请他们参与接力
          </div>

          {/* 操作按钮 */}
          <div className='flex flex-col gap-2'>
            {isWechat() && (
              <Button
                variant='default'
                size='lg'
                onClick={handleWechatShare}
                className='w-full'
              >
                <Share2 className='h-4 w-4 mr-2' />
                分享给好友
              </Button>
            )}

            <Button
              variant='outline'
              size='lg'
              onClick={handleCopyLink}
              className='w-full'
            >
              <Copy className='h-4 w-4 mr-2' />
              复制链接
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 全部接力用户列表弹窗 - 接力祝福语列表 */}
      <ResponsiveDialog
        isOpen={showAllUsersDialog}
        onOpenChange={setShowAllUsersDialog}
        title='接力祝福语'
        description=''
        showCloseIcon={true}
      >
        <div className='max-h-[60vh] overflow-y-auto px-4 py-3'>
          {records.length === 0 ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              暂无接力祝福语
            </div>
          ) : (
            <div className='space-y-4'>
              {records.map(record => (
                <div
                  key={record.id}
                  className='flex items-start justify-between gap-3'
                >
                  {/* 左侧：头像 + 昵称 + 祝福语 */}
                  <div className='flex items-start gap-3 flex-1 min-w-0'>
                    <img
                      src={getUserAvatar(record.user_avatar)}
                      alt={record.user_nickname}
                      className='w-9 h-9 rounded-full object-cover flex-shrink-0'
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.src = getUserAvatar(null);
                      }}
                    />
                    <div className='flex-1 min-w-0'>
                      <div className='text-xs text-muted-foreground mb-1 truncate'>
                        {record.user_nickname || '匿名用户'}
                      </div>
                      <div
                        className='text-sm break-words'
                        style={{ color: relayTheme.textColor }}
                      >
                        {record.user_message || (
                          <span className='text-muted-foreground'>无留言</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 右侧：时间 */}
                  <div className='ml-2 text-xs text-muted-foreground whitespace-nowrap'>
                    {formatTime(record.relay_time)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ResponsiveDialog>

      {/* 留言弹窗 */}
      <ResponsiveDialog
        isOpen={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        title='接力留言'
        description='为接力添加一句话留言（可选）'
        showCloseIcon={true}
      >
        <div className='space-y-4 px-4 py-4'>
          {/* 预设词快速选择 */}
          <div>
            <Label className='text-sm mb-2 block'>快速选择</Label>
            <div className='flex flex-wrap gap-2'>
              {messagePresets.map((preset, index) => (
                <Badge
                  key={index}
                  variant='outline'
                  className='cursor-pointer hover:bg-accent'
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset}
                </Badge>
              ))}
            </div>
          </div>

          {/* 自定义输入 */}
          <div className='space-y-2'>
            <Label htmlFor='message'>自定义留言</Label>
            <Textarea
              id='message'
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder='输入留言（可选）'
              maxLength={200}
              rows={3}
            />
            <div className='text-xs text-gray-500 text-right'>
              {message.length}/200
            </div>
          </div>

          {/* 操作按钮 */}
          <div className='flex gap-2 justify-end pt-2'>
            <Button
              variant='outline'
              onClick={() => setShowMessageDialog(false)}
            >
              取消
            </Button>
            <Button onClick={handleMessageDialogConfirm} disabled={submitting}>
              {submitting ? '提交中...' : '确认接力'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 分享引导提示 - 使用 ResponsiveDialog 全屏遮罩 */}
      <ResponsiveDialog
        isOpen={showShareGuide}
        onOpenChange={setShowShareGuide}
        title=''
        description=''
        showCloseIcon={false}
        dismissible={true}
        fullHeight={true}
        contentProps={{
          className: 'p-0 bg-transparent border-0 shadow-none',
        }}
      >
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto'>
          {/* 箭头和提示文字 - 指向右上角 */}
          <div className='absolute top-4 right-4 flex flex-col items-end gap-2 z-10'>
            {/* 提示文字 */}
            <div className='bg-white rounded-lg px-4 py-2 shadow-lg max-w-[200px] border border-gray-200'>
              <div className='text-sm font-medium text-gray-900'>
                点击右上角
              </div>
              <div className='text-xs text-gray-500 mt-1'>
                选择「发送给朋友」或「分享到朋友圈」
              </div>
            </div>

            {/* 箭头 */}
            <div className='relative'>
              <ArrowUpRight
                className='h-8 w-8 text-white drop-shadow-lg'
                style={{
                  transform: 'rotate(-45deg)',
                }}
              />
              <div className='absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-pulse' />
            </div>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={() => setShowShareGuide(false)}
            className='absolute top-4 left-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10'
            aria-label='关闭提示'
          >
            <X className='h-5 w-5 text-gray-600' />
          </button>
        </div>
      </ResponsiveDialog>

      {/* 调试按钮 - 仅调试模式且非编辑器模式显示 */}
      {isDebug && !isEditor && (
        <RelayDebugButton
          worksId={worksId}
          userOpenid={userOpenid}
          configData={configData}
          listData={listData}
          checkData={checkData}
          submitting={submitting}
          showShareDialog={showShareDialog}
          relayCount={relayCount}
          currentUserRelayed={currentUserRelayed}
          onLoadConfig={loadConfig}
          onLoadList={loadList}
          onLoadCheck={loadCheck}
          onTriggerRelay={handleRelay}
          onOpenShareDialog={() => setShowShareDialog(true)}
          onSetShareDialog={setShowShareDialog}
        />
      )}
    </>
  );
}
