'use client';

import {
  API,
  cdnApi,
  copyWork,
  deleteWork,
  getToken,
  getUid,
  updateWorks,
} from '@/services';
import { useStore } from '@/store';
import APPBridge from '@/store/app-bridge';
import { useShareNavigation } from '@/utils/share';
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
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Switch } from '@workspace/ui/components/switch';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  BarChart3,
  ChevronRight,
  Download,
  Edit3,
  MoreHorizontal,
  Share2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { cls } from 'react-image-crop';
import { WorksItem } from '../../app/maka-v2/works/types';
import { ActionBar, ActionButton } from './ActionButton';
import { useWorksActions } from './WorksActionsContext';

dayjs.extend(relativeTime);

// 类型守卫函数
function checkIsLegacyWork(
  work: SerializedWorksEntity | WorksItem
): work is WorksItem {
  return work.editor_version === 7;
}

type WorkInfoCardWork = SerializedWorksEntity | WorksItem;

interface WorkInfoCardProps {
  work: WorkInfoCardWork;
  purchaseStatus?: 'purchased' | 'not-purchased' | null;
  toEdit: () => void;
  onData: (work: WorkInfoCardWork) => void; // 数据查看回调（可选，用于自定义数据查看逻辑）
  onShare: () => void;
  onDownload: () => void;
  isVip: boolean;
  showBadge?: boolean;
  loading?: boolean;
  specInfo?: Record<string, any>; // 规格信息（用于判断是否为视频，仅旧版本需要）
  onClick?: () => void;
  onDataChange?: () => void; // 数据变更回调（删除/复制后触发）
}

export function WorkInfoCard({
  work,
  purchaseStatus,
  isVip,
  showBadge = true,
  loading = false,
  specInfo: externalSpecInfo,
  onDownload,
  onShare,
  onClick,
  onDataChange,
  onData,
  toEdit,
}: WorkInfoCardProps) {
  // 尝试使用 useWorksActions，如果不在 Provider 中则返回 null
  let worksActions: ReturnType<typeof useWorksActions> | null = null;
  try {
    worksActions = useWorksActions();
  } catch {
    // 不在 WorksActionsProvider 中，使用回调函数模式
  }

  // 判断是否为旧版本作品
  const isLegacyWork = checkIsLegacyWork(work);

  const store = useStore();
  const { toVideoShare } = useShareNavigation();
  const t = useTranslations('Profile');
  const isMobile = store.environment.isMobile;

  // 内部状态管理
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isOperatingLegacy, setIsOperatingLegacy] = useState(false);

  const resizeWidth = 440;

  // 类型适配：统一数据访问接口
  const getSpecInfo = () => {
    const workOriginal = work as any;
    if (!(workOriginal as any).specInfo) {
      const work = workOriginal as WorksItem;
      return {
        display_name: work.spec?.name,
        export_format:
          work.analytics || work.spec?.id === '7ee4c72fe272959de662fff3378e7063'
            ? 'html'
            : 'image',
        viewport_width: work.spec?.width,
        width: work.spec?.width,
        height: work.spec?.height,
      };
    }
    return workOriginal.specInfo;
  };

  const specInfo = getSpecInfo();
  const specDisplayName = specInfo?.display_name;
  const exportFormat = specInfo?.export_format;
  const rsvpStats = isLegacyWork ? null : work.rsvpStats;

  // 合并 H5 判断逻辑
  const isH5 = useMemo(() => {
    if (!exportFormat) {
      // 临时方案
      return !!(
        (work as any).analytics ||
        (work as any).spec.id === '7ee4c72fe272959de662fff3378e7063'
      );
    } else {
      return /html/gi.test(exportFormat || '');
    }
  }, [work, exportFormat]);

  // 获取缩略图 URL
  const getCoverUrl = () => {
    if (isLegacyWork) {
      // WorksItem 且 H5：使用 thumb，否则使用 cover
      return isH5 && work.thumb ? work.thumb : work.cover;
    }
    // SerializedWorksEntity：使用 cover
    return work.cover;
  };

  const coverUrl = getCoverUrl();

  // 获取版本标签
  const getVersionLabel = () => {
    if (isVip || !showBadge) return '';
    const isPurchased = purchaseStatus === 'purchased';
    return (
      <div
        className={cls(
          `absolute top-1.5 right-1.5 px-1.5 py-0.5 ${isPurchased ? 'bg-red-500' : 'bg-gray-500'} rounded text-white text-[10px] leading-tight`
        )}
      >
        {isPurchased ? t('purchased') : t('notPurchased')}
      </div>
    );
  };

  // 判断当前作品是否正在操作中
  const isOperatingCurrent =
    (worksActions?.isOperating && worksActions.operatingWorkId === work.id) ||
    isOperatingLegacy;

  const handleDownloadLegacy = async (work: WorksItem) => {
    // 只处理旧版本作品（editor_version !== 10）
    const specInfoMap = externalSpecInfo || {};
    const isVideo = specInfoMap[work.spec.id]?.export_format?.includes('video');

    const canPublish = await store.checkSharePermission(work.id, {
      trackData: {
        works_id: work.id,
        ref_object_id: work.template_id,
        editor_version: work.editor_version,
        works_type: 'poster',
        vipType: 'share',
      },
    });
    if (!canPublish) {
      return;
    }

    if (isVideo) {
      toVideoShare(work.id);
    } else {
      // 下载海报
      store.push(
        `/maka-v2/download-legacy?works_id=${work.id}&uid=${work.uid}`
      );
    }
  };

  const handleCopyLegacy = async (work: WorksItem) => {
    setIsOperatingLegacy(true);
    try {
      await copyWork(work.id);
      toast.success(t('copySuccess'));
      onDataChange?.();
    } catch (error) {
      toast.error(t('copyFailed'));
      console.error(error);
    } finally {
      setIsOperatingLegacy(false);
    }
  };

  const handleDeleteLegacy = async (work: WorksItem) => {
    setIsOperatingLegacy(true);
    try {
      await deleteWork(+work.uid, work.id);
      toast.success(t('deleteSuccess'));
      setDeleteDialogOpen(false);
      onDataChange?.();
    } catch (error) {
      toast.error(t('deleteFailed'));
      console.error(error);
    } finally {
      setIsOperatingLegacy(false);
    }
  };

  const handleToggleOfflineLegacy = async (work: WorksItem) => {
    setIsOperatingLegacy(true);
    try {
      const res = (await updateWorks({
        works_id: work.id,
        status: work.offline ? 1 : -1,
      })) as any;
      if (res.success === 1) {
        toast.success(work.offline ? t('onlineSuccess') : t('offlineSuccess'));
        onDataChange?.();
      } else {
        toast.error(res.error || t('operationFailed'));
      }
    } catch (error) {
      toast.error(t('operationFailed'));
      console.error(error);
    } finally {
      setIsOperatingLegacy(false);
    }
  };

  const handleRenameLegacy = async (work: WorksItem) => {
    if (!renameInput.trim()) {
      toast.error(t('renameInputPlaceholder'));
      return;
    }

    setIsOperatingLegacy(true);
    try {
      if (work.editor_version === 10) {
        // 新版本使用 updateWorksDetail2
        const { updateWorksDetail2 } = await import('@/services');
        await updateWorksDetail2(work.id, {
          title: renameInput,
        });
        toast.success(t('updateSuccess'));
      } else {
        const res = (await updateWorks({
          works_id: work.id,
          title: renameInput,
        })) as any;
        if (res.success === 1) {
          toast.success(t('updateSuccess'));
        } else {
          toast.error(res.error);
        }
      }
      setRenameInput('');
      setRenameOpen(false);
      onDataChange?.();
    } catch (error) {
      toast.error(t('renameFailed'));
      console.error(error);
    } finally {
      setIsOperatingLegacy(false);
    }
  };

  const handleOrderLegacy = (work: WorksItem) => {
    const url = `${API('根域名')}/mk-store-7/order?uid=${getUid()}&works_id=${work.id}&token=${getToken()}&is_full_screen=1`;
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url,
        type: 'URL',
      });
    } else {
      location.href = url;
    }
  };

  // 编辑作品
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toEdit) {
      return toEdit();
    }
    if (isLegacyWork) {
    } else if (worksActions) {
      worksActions.editWork(work as SerializedWorksEntity);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // 点击卡片跳转编辑器
    handleEdit?.(e);
    onClick?.();
  };

  // 更多操作（打开设置面板）
  const handleMore = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSettingOpen(true);
  };

  // 下载/分享（海报类型）
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    return onDownload();
    // if (isLegacyWork) {
    //   await handleDownloadLegacy(work as WorksItem);
    //   return;
    // }
    // if (!worksActions) return;

    // const serializedWork = work as SerializedWorksEntity;
    // const worksDetail = (await trpc.works.findById.query({
    //   id: work.id,
    // })) as unknown as SerializedWorksEntity;
    // if (worksDetail.share_type === 'invite') {
    //   worksActions.toDownloadInviteeManager(serializedWork);
    //   return;
    // }
    // await worksActions.downloadWork(serializedWork, { autoShare: true });
  };

  // 复制作品
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLegacyWork) {
      await handleCopyLegacy(work as WorksItem);
    } else if (worksActions) {
      await worksActions.copyWork(work as SerializedWorksEntity, onDataChange);
    }
  };

  const handleDeleteConfirm = async () => {
    if (isLegacyWork) {
      await handleDeleteLegacy(work as WorksItem);
    } else if (worksActions) {
      await worksActions.deleteWork(
        work as SerializedWorksEntity,
        purchaseStatus,
        () => {
          setDeleteDialogOpen(false);
          onDataChange?.();
        }
      );
    }
  };

  // 查看数据
  const handleViewData = (e: React.MouseEvent) => {
    e.stopPropagation();
    onData(work);
  };

  // 切换上线下线
  const handleToggleOffline = async () => {
    if (isLegacyWork) {
      await handleToggleOfflineLegacy(work as WorksItem);
    } else if (worksActions) {
      await worksActions.toggleOffline(work as SerializedWorksEntity, () => {
        onDataChange?.();
      });
    }
  };

  const renderSpecInfo = () => {
    if (isH5) {
      // H5 类型：优先显示 pv/uv/rsvpStats（SerializedWorksEntity），否则显示 analytics（WorksItem）
      if (isLegacyWork) {
        // WorksItem：显示 analytics 数组
        if (work.analytics && work.analytics.length > 0) {
          return (
            <div className='flex items-center gap-3 text-sm md:text-xs text-gray-500'>
              {work.analytics.map((data, index) => (
                <div key={index} className='flex items-center gap-0.5'>
                  <span>{data.text}</span>
                  <span className='font-medium text-gray-700 mx-0.5'>
                    {data.data || 0}
                  </span>
                </div>
              ))}
            </div>
          );
        }
        // 如果没有 analytics，尝试显示 pv/uv
        const pv = work.pv ?? 0;
        const uv = work.uv ?? 0;
        if (pv > 0 || uv > 0) {
          return (
            <div className='flex items-center gap-3 text-sm md:text-xs text-gray-500'>
              <div
                className='flex items-center gap-0.5'
                onClick={e => {
                  handleViewData(e);
                }}
              >
                <span>{t('views')}</span>
                <span className='font-medium text-gray-700 mx-0.5'>{pv}</span>
              </div>
              <div
                className='flex items-center gap-0.5'
                onClick={e => {
                  handleViewData(e);
                }}
              >
                <span>{t('visitors')}</span>
                <span className='font-medium text-gray-700 mx-0.5'>{uv}</span>
              </div>
            </div>
          );
        }
      } else {
        // SerializedWorksEntity：显示 pv/uv/rsvpStats
        const workWithPvUv = work as any;
        const pv = workWithPvUv.pv ?? 0;
        const uv = workWithPvUv.uv ?? 0;

        return (
          <div className='flex items-center gap-3 text-sm md:text-xs text-gray-500'>
            <div
              className='flex items-center gap-0.5'
              onClick={e => {
                handleViewData(e);
              }}
            >
              <span>{t('views')}</span>
              <span className='font-medium text-gray-700 mx-0.5'>{pv}</span>
            </div>
            <div
              className='flex items-center gap-0.5'
              onClick={e => {
                handleViewData(e);
              }}
            >
              <span>{t('visitors')}</span>
              <span className='font-medium text-gray-700 mx-0.5'>{uv}</span>
            </div>
            {rsvpStats && (
              <div
                className='flex items-center gap-0.5'
                onClick={e => {
                  handleViewData(e);
                }}
              >
                <span>{t('form')}</span>
                <span className='font-medium text-gray-700 mx-0.5'>
                  {rsvpStats.replied || 0}
                </span>
                <ChevronRight className='w-3 h-3' />
              </div>
            )}
          </div>
        );
      }
    }

    // 非 H5 类型：显示尺寸信息
    if (!isH5 && specInfo) {
      return (
        <div className='text-sm md:text-xs text-gray-500'>
          {t('size')} · {specInfo.viewport_width || specInfo.width || 1080}x
          {Math.floor(
            ((specInfo.height || 1920) *
              (specInfo.viewport_width || specInfo.width || 1080)) /
            (specInfo.width || 1080)
          )}
        </div>
      );
    }
    return null;
  };

  const renderDeleteBtn = () => {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors text-red-600'>
            <Icon name='delete' size={18} />
            <span className='text-[15px]'>{t('delete')}</span>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteWork')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteWorkWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='rounded-full'>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className='rounded-full bg-red-500'
              onClick={async () => {
                await handleDeleteConfirm();
                setSettingOpen(false);
              }}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const renderMoreActions = () => {
    return (
      <div className='p-4 space-y-4'>
        {/* 标题区域 */}
        <div className='pb-3 border-b border-gray-200'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-base font-semibold text-gray-900 flex-1 line-clamp-2'>
              {work.title}
            </span>
            <button
              onClick={() => {
                setRenameInput(work.title);
                setRenameOpen(true);
                setSettingOpen(false);
              }}
              className='ml-2 p-1.5 rounded transition-colors shrink-0'
              aria-label={t('rename')}
            >
              <Icon name='edit' size={18} />
            </button>
          </div>
          <div className='text-xs text-gray-500'>
            {t('createAt')}{' '}
            {dayjs(isLegacyWork ? work.create_time : work.update_time).format(
              'YYYY.MM.DD HH:mm'
            )}
          </div>
        </div>

        {/* 操作列表 */}
        <div className='space-y-1'>
          <button
            className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
            onClick={e => {
              handleEdit(e);
              setSettingOpen(false);
            }}
          >
            <Icon name='edit' size={18} />
            <span className='text-[15px] text-gray-900'>{t('edit')}</span>
          </button>

          {isH5 ? (
            <button
              className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
              onClick={async () => {
                onShare();
                setSettingOpen(false);
              }}
            >
              <Icon name='workshare' size={18} />
              <span className='text-[15px] text-gray-900'>{t('share')}</span>
            </button>
          ) : (
            <button
              className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
              onClick={handleDownload}
            >
              <Icon name='workshare' size={18} />
              <span className='text-[15px] text-gray-900'>{t('download')}</span>
            </button>
          )}

          {/* 旧作品的 H5 功能（传播数据、表单、订单） */}
          {isLegacyWork && (work as WorksItem).analytics && (
            <>
              <button
                className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
                onClick={e => {
                  handleViewData(e);
                  setSettingOpen(false);
                }}
              >
                <Icon name='chart-line' size={18} />
                <span className='text-[15px] text-gray-900'>{t('spreadData')}</span>
              </button>

              <button
                className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
                onClick={e => {
                  handleViewData(e);
                  setSettingOpen(false);
                }}
              >
                <Icon name='doc-success' size={18} />
                <span className='text-[15px] text-gray-900'>{t('form')}</span>
              </button>

              <button
                className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
                onClick={e => {
                  handleOrderLegacy(work as WorksItem);
                  setSettingOpen(false);
                }}
              >
                <Icon name='form-fill' size={18} />
                <span className='text-[15px] text-gray-900'>{t('order')}</span>
              </button>
            </>
          )}

          {/* 数据查看（新版本） */}
          {!isLegacyWork && isH5 && (
            <button
              className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
              onClick={e => {
                handleViewData(e);
                setSettingOpen(false);
              }}
            >
              <Icon name='chart-line' size={18} />
              <span className='text-[15px] text-gray-900'>{t('data')}</span>
            </button>
          )}

          {/* 上线下线（H5作品） */}
          {isH5 && (
            <div className='w-full flex items-center justify-between px-3 py-3'>
              <div className='flex items-center gap-3'>
                <Icon name='online' size={18} />
                <span className='text-[15px] text-gray-900'>{t('online')}</span>
              </div>
              <Switch
                checked={
                  isLegacyWork
                    ? !(work as WorksItem).offline
                    : !(work as SerializedWorksEntity).offline
                }
                onCheckedChange={async e => {
                  handleToggleOffline();
                }}
              />
            </div>
          )}

          <button
            className='w-full flex items-center gap-3 px-3 py-3 active:bg-gray-100 rounded-lg transition-colors'
            onClick={async e => {
              await handleCopy(e);
              setSettingOpen(false);
            }}
          >
            <Icon name='copy' size={18} />
            <span className='text-[15px] text-gray-900'>{t('copy')}</span>
          </button>

          {renderDeleteBtn()}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className='bg-white rounded-lg overflow-hidden shadow-sm group'>
        {/* 卡片主体 */}
        <div
          onClick={handleCardClick}
          className={`relative flex gap-3 md:flex-col md:gap-2 p-3 cursor-pointer active:bg-gray-50 md:hover:bg-gray-50`}
        >
          {/* 缩略图 */}
          <div
            className={`w-[78px] md:w-full outline outline-1 outline-gray-200 bg-gray-100 aspect-square relative flex-shrink-0 rounded overflow-hidden`}
          >
            {coverUrl ? (
              <img
                src={cdnApi(coverUrl, { resizeWidth })}
                alt={work.title}
                className='w-full h-full object-cover object-top'
                onError={e => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    'https://img2.maka.im/assets/usual/icon_statistics/maka_icon.jpg';
                }}
              />
            ) : (
              <div className='w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400'>
                <div className='text-[32px] mb-1'>🖼️</div>
                <div className='text-xs'>{t('preview')}</div>
              </div>
            )}
            {/* 加载蒙层 */}
            {(loading || isOperatingCurrent) && (
              <div className='absolute inset-0 bg-black/30 flex items-center justify-center'>
                <div className='w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin' />
              </div>
            )}
            <div className='text-xs py-1 px-2 md:text-xs absolute left-0 bottom-0 bg-black/50 text-white'>
              {specDisplayName || t('newVersion')}
            </div>
            {/* 已下线标签 */}
            {isLegacyWork && work.offline && (
              <div className='absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-gray-500 rounded text-white text-[10px] leading-tight'>
                {t('offline')}
              </div>
            )}
            {/* 桌面端 hover 更多按钮 */}
            {!isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    onClick={e => e.stopPropagation()}
                    className='absolute top-2 bg-white text-black border hover:bg-gray-200 shadow-md right-2 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10'
                  >
                    <MoreHorizontal className='w-4 h-4' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  onClick={e => e.stopPropagation()}
                  className='w-64 p-0'
                  side='bottom'
                  align='end'
                >
                  {renderMoreActions()}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* 版本标签 */}
          {getVersionLabel()}

          {/* 内容区域 */}
          <div className='flex-1 flex flex-col justify-between gap-1 overflow-hidden'>
            {/* 标题 */}
            <div>
              <h3 className='text-lg md:text-sm font-bold leading-tight text-gray-900 truncate'>
                {work.title}
              </h3>
            </div>

            {/* 详情信息 */}
            <div className='flex gap-1 flex-col'>
              <div className='flex items-start gap-1 text-sm text-gray-500 md:flex-col'>
                <span className='text-xs md:text-xs'>
                  {dayjs(
                    isLegacyWork ? work.create_time : work.update_time
                  ).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>

              {renderSpecInfo()}
            </div>
          </div>
        </div>

        {/* 操作栏 - 仅移动端显示 */}
        {isMobile && (
          <ActionBar className='p-1' count={isH5 ? 4 : 3}>
            <ActionButton
              icon={Edit3}
              label={t('edit')}
              onClick={handleEdit}
              disabled={isOperatingCurrent}
            />
            {isH5 ? (
              // H5类型：编辑、分享、数据、更多
              <>
                <ActionButton
                  icon={Share2}
                  label={t('share')}
                  onClick={e => {
                    e.stopPropagation();
                    onShare();
                  }}
                  disabled={isOperatingCurrent}
                />
                <ActionButton
                  icon={BarChart3}
                  label={t('data')}
                  onClick={handleViewData}
                  disabled={isOperatingCurrent}
                />
              </>
            ) : (
              // 海报类型：编辑、下载、数据、更多
              <>
                <ActionButton
                  icon={Download}
                  // label={isVideo ? '下载视频' : '下载海报'}
                  label={t('download')}
                  onClick={handleDownload}
                  disabled={isOperatingCurrent}
                />
              </>
            )}
            <ActionButton
              icon={MoreHorizontal}
              label={t('more')}
              onClick={handleMore}
              disabled={isOperatingCurrent}
            />
          </ActionBar>
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className='w-[320px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteWork')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteWorkWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isOperatingCurrent}
              className='rounded-full'
            >
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isOperatingCurrent}
              className='rounded-full bg-red-500'
            >
              {isOperatingCurrent ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 设置面板弹窗 */}
      <ResponsiveDialog isOpen={settingOpen} onOpenChange={setSettingOpen}>
        {renderMoreActions()}
      </ResponsiveDialog>

      {/* 重命名弹窗 */}
      <ResponsiveDialog isOpen={renameOpen} onOpenChange={setRenameOpen}>
        <div className='p-4 space-y-4'>
          <div className='text-lg font-semibold text-gray-900'>
            {t('rename')}
          </div>
          <div>
            <input
              defaultValue={work.title}
              placeholder={t('renamePlaceholder')}
              onChange={e => {
                setRenameInput(e.target.value);
              }}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          <div className='flex gap-2'>
            <Button
              className='rounded-full flex-1'
              variant='outline'
              size='lg'
              onClick={() => {
                setRenameOpen(false);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              className='rounded-full flex-1'
              size='lg'
              onClick={async () => {
                if (isLegacyWork) {
                  handleRenameLegacy(work as WorksItem);
                } else if (worksActions) {
                  await trpc.works.update.mutate({
                    id: work.id,
                    title: renameInput,
                  });
                  setRenameOpen(false);
                  onDataChange?.();
                }
              }}
            >
              {t('confirm')}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
