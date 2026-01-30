'use client';

import { getCookie, setCookie } from '@/utils';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Baby,
  Briefcase,
  Cake,
  Calendar,
  Heart,
  Home,
  Monitor,
  MoreHorizontal,
  Star,
} from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';

export type EditionType = 'personal' | 'business'; // 个人版 | 商业版

// 版本选择的存储 key
const EDITION_STORAGE_KEY = 'jiantie_edition_selection';

// 场景标签组件
interface ScenarioTagProps {
  icon: React.ReactNode;
  label: string;
  borderColor: string;
  iconColor: string;
}

const ScenarioTag = ({
  icon,
  label,
  borderColor,
  iconColor,
}: ScenarioTagProps) => {
  return (
    <div
      className='flex items-center rounded-[6px] border'
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderColor,
        padding: '3px 5px',
        gap: '2px',
      }}
    >
      <div
        className='relative shrink-0 size-[14px] flex items-center justify-center'
        style={{ color: iconColor }}
      >
        {icon}
      </div>
      <span
        className='text-xs font-semibold whitespace-nowrap'
        style={{
          fontFamily: '"PingFang SC"',
          color: 'rgba(0, 0, 0, 0.6)',
          lineHeight: '18px',
        }}
      >
        {label}
      </span>
    </div>
  );
};

// 使用场景选择弹窗组件
interface EditionSelectModalProps {
  /** 当前选中的版本 */
  activeEdition?: EditionType;
  /** 版本改变时的回调 */
  onEditionChange?: (edition: EditionType) => void;
  /** 是否显示弹窗（用于手动控制） */
  open?: boolean;
  /** 弹窗打开/关闭的回调 */
  onOpenChange?: (open: boolean) => void;
  /** 是否在首次进入时自动显示弹窗 */
  autoShow?: boolean;
}

export const EditionSelectModal = ({
  activeEdition: externalActiveEdition,
  onEditionChange,
  open: externalOpen,
  onOpenChange,
  autoShow = true,
}: EditionSelectModalProps) => {
  // 内部状态：当前选中的版本
  const [internalActiveEdition, setInternalActiveEdition] =
    useState<EditionType>('personal');
  const [internalOpen, setInternalOpen] = useState(false);

  // 使用 ref 存储初始 props 值，用于初始化 effect
  const initialPropsRef = useRef({
    externalActiveEdition,
    onEditionChange,
    externalOpen,
    onOpenChange,
    autoShow,
  });

  // 使用外部传入的版本，如果没有则使用内部状态
  const activeEdition = externalActiveEdition ?? internalActiveEdition;
  const open = externalOpen ?? internalOpen;

  // 保存版本选择到 cookie 和 localStorage
  const saveEditionSelection = (edition: EditionType) => {
    if (typeof window === 'undefined') return;

    // 保存到 cookie
    setCookie(EDITION_STORAGE_KEY, edition);

    // 保存到 localStorage
    try {
      localStorage.setItem(EDITION_STORAGE_KEY, edition);
    } catch (error) {
      console.error('保存到 localStorage 失败:', error);
    }
  };

  // 从 cookie 或 localStorage 读取版本选择
  const loadEditionSelection = (): EditionType | null => {
    if (typeof window === 'undefined') return null;

    // 优先从 cookie 读取
    const cookieValue = getCookie(EDITION_STORAGE_KEY);
    if (cookieValue === 'personal' || cookieValue === 'business') {
      return cookieValue as EditionType;
    }

    // 如果 cookie 没有，从 localStorage 读取
    try {
      const localValue = localStorage.getItem(EDITION_STORAGE_KEY);
      if (localValue === 'personal' || localValue === 'business') {
        return localValue as EditionType;
      }
    } catch (error) {
      console.error('从 localStorage 读取失败:', error);
    }

    return null;
  };

  // 初始化：检查是否已选择版本
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedEdition = loadEditionSelection();
    const initialProps = initialPropsRef.current;

    if (savedEdition) {
      // 如果已保存，使用保存的版本
      if (!initialProps.externalActiveEdition) {
        startTransition(() => {
          setInternalActiveEdition(savedEdition);
        });
      }
      if (initialProps.onEditionChange) {
        initialProps.onEditionChange(savedEdition);
      }
    } else if (
      initialProps.autoShow &&
      initialProps.externalOpen === undefined &&
      !initialProps.onOpenChange
    ) {
      // 如果没有保存且需要自动显示，且外部没有控制 open，显示弹窗
      startTransition(() => {
        setInternalOpen(true);
      });
    }
  }, []);

  // 处理版本选择
  const handleSelect = (edition: EditionType) => {
    // 保存版本选择
    saveEditionSelection(edition);

    // 更新内部状态（如果没有外部控制）
    if (!externalActiveEdition) {
      setInternalActiveEdition(edition);
    }

    // 调用外部回调
    if (onEditionChange) {
      onEditionChange(edition);
    }

    // 如果版本没有变化，只关闭弹窗
    if (edition === activeEdition) {
      const newOpen = false;
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
      return;
    }

    // 延迟关闭弹窗，让用户看到选中反馈
    setTimeout(() => {
      const newOpen = false;
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    }, 100);
  };

  // 处理弹窗打开/关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };
  // 个人版场景：结婚、满月、生日、乔迁
  const personalScenarios = [
    {
      icon: <Heart style={{ width: '14px', height: '14px' }} />,
      label: '结婚',
      iconColor: '#ef4444', // 红色
    },
    {
      icon: <Baby style={{ width: '14px', height: '14px' }} />,
      label: '满月',
      iconColor: '#f472b6', // 粉色
    },
    {
      icon: <Cake style={{ width: '14px', height: '14px' }} />,
      label: '生日',
      iconColor: '#f59e0b', // 橙色
    },
    {
      icon: <Home style={{ width: '14px', height: '14px' }} />,
      label: '乔迁',
      iconColor: '#10b981', // 绿色
    },
  ];

  // 商业版场景：会议、论坛、活动、庆典
  const businessScenarios = [
    {
      icon: <Briefcase style={{ width: '14px', height: '14px' }} />,
      label: '会议',
      iconColor: '#3b82f6', // 蓝色
    },
    {
      icon: <Monitor style={{ width: '14px', height: '14px' }} />,
      label: '论坛',
      iconColor: '#6366f1', // 靛蓝色
    },
    {
      icon: <Calendar style={{ width: '14px', height: '14px' }} />,
      label: '活动',
      iconColor: '#8b5cf6', // 紫色
    },
    {
      icon: <Star style={{ width: '14px', height: '14px' }} />,
      label: '庆典',
      iconColor: '#f59e0b', // 金色
    },
  ];

  return (
    <ResponsiveDialog
      isDialog
      isOpen={open}
      onOpenChange={handleOpenChange}
      contentProps={{
        className: 'rounded-[12px] p-4 max-w-[90vw] mx-auto',
      }}
    >
      <div
        className='flex flex-col items-center bg-white'
        style={{
          width: '100%',
          gap: '12px',
          borderRadius: '12px',
        }}
      >
        {/* 标题 */}
        <div
          className='flex flex-col items-center text-center w-full'
          style={{ gap: '8px' }}
        >
          <h2
            className='text-xl font-semibold w-full'
            style={{
              fontFamily: '"PingFang SC"',
              color: '#101828',
              lineHeight: '30px',
            }}
          >
            请选择您的使用场景
          </h2>
          <p
            className='text-sm w-full'
            style={{
              fontFamily: '"PingFang SC"',
              color: '#6a7282',
              lineHeight: '20px',
            }}
          >
            为您推荐专属模板
          </p>
        </div>

        {/* 个人版卡片 - 整个卡片可点击 */}
        <button
          className='w-full flex flex-col border-2 cursor-pointer transition-all active:scale-[0.98]'
          style={{
            borderColor: '#ffccd3',
            borderWidth: '2px',
            backgroundColor: '#fff',
            padding: '16px',
            gap: '12px',
            borderRadius: '16px',
            boxShadow: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={() => handleSelect('personal')}
        >
          <div className='flex items-start' style={{ gap: '16px' }}>
            {/* 图标 - 48x48px 带阴影 */}
            <div
              className='w-12 h-12 rounded-2xl flex items-center justify-center shrink-0'
              style={{
                background:
                  activeEdition === 'personal'
                    ? 'linear-gradient(135deg, rgba(244, 63, 94, 1) 0%, rgba(255, 155, 155, 1) 100%)'
                    : 'linear-gradient(135deg, rgba(242, 155, 227, 1) 0%, rgba(255, 155, 155, 1) 100%)',
                boxShadow:
                  activeEdition === 'personal'
                    ? '0px 6px 12px -2px rgba(244, 63, 94, 0.3), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)'
                    : '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)',
                transform:
                  activeEdition === 'personal' ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className='w-8 h-8 flex items-center justify-center'>
                <Heart className='w-8 h-8' style={{ color: '#fff' }} />
              </div>
            </div>

            {/* 内容 */}
            <div className='flex-1 flex flex-col gap-1'>
              <h3
                className='text-base font-semibold text-left'
                style={{
                  fontFamily: '"PingFang SC"',
                  color: '#101828',
                  lineHeight: '24px',
                }}
              >
                个人版
              </h3>
              <p
                className='text-xs text-left'
                style={{
                  fontFamily: '"PingFang SC"',
                  color: '#6a7282',
                  lineHeight: '18px',
                }}
              >
                记录生活中的美好时刻，适用于...
              </p>
            </div>
          </div>

          {/* 场景标签 */}
          <div className='flex items-center flex-wrap' style={{ gap: '8px' }}>
            {personalScenarios.map(scenario => (
              <ScenarioTag
                key={scenario.label}
                icon={scenario.icon}
                label={scenario.label}
                borderColor='#fecdd3'
                iconColor={scenario.iconColor}
              />
            ))}
            <div
              className='flex items-center rounded-[6px] border border-rose-100'
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                padding: '3px 5px',
                gap: '2px',
              }}
            >
              <span
                className='text-xs font-semibold'
                style={{
                  fontFamily: '"PingFang SC"',
                  color: 'rgba(0, 0, 0, 0.6)',
                  lineHeight: '18px',
                }}
              >
                等
              </span>
              <MoreHorizontal
                className='w-3.5 h-3.5'
                style={{ color: 'rgba(0, 0, 0, 0.6)' }}
              />
            </div>
          </div>
        </button>

        {/* 商业版卡片 - 整个卡片可点击 */}
        <button
          className='w-full flex flex-col border-2 cursor-pointer transition-all active:scale-[0.98]'
          style={{
            borderColor: '#bedbff',
            borderWidth: '2px',
            backgroundColor: '#fff',
            padding: '16px',
            gap: '12px',
            borderRadius: '16px',
            boxShadow: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={() => handleSelect('business')}
        >
          <div className='flex items-start' style={{ gap: '16px' }}>
            {/* 图标 - 48x48px 带阴影 */}
            <div
              className='w-12 h-12 rounded-2xl flex items-center justify-center shrink-0'
              style={{
                background:
                  activeEdition === 'business'
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 1) 0%, rgba(155, 194, 242, 1) 100%)'
                    : 'linear-gradient(135deg, rgba(51, 88, 212, 1) 0%, rgba(155, 194, 242, 1) 100%)',
                boxShadow:
                  activeEdition === 'business'
                    ? '0px 6px 12px -2px rgba(59, 130, 246, 0.3), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)'
                    : '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)',
                transform:
                  activeEdition === 'business' ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className='w-8 h-8 flex items-center justify-center'>
                <Briefcase className='w-8 h-8' style={{ color: '#fff' }} />
              </div>
            </div>

            {/* 内容 */}
            <div className='flex-1 flex flex-col gap-1'>
              <h3
                className='text-base font-semibold  text-left'
                style={{
                  fontFamily: '"PingFang SC"',
                  color: '#101828',
                  lineHeight: '24px',
                }}
              >
                商业版
              </h3>
              <p
                className='text-xs text-left'
                style={{
                  fontFamily: '"PingFang SC"',
                  color: '#6a7282',
                  lineHeight: '18px',
                }}
              >
                打造专业商务活动体验，适用于...
              </p>
            </div>
          </div>

          {/* 场景标签 */}
          <div className='flex items-center flex-wrap' style={{ gap: '8px' }}>
            {businessScenarios.map(scenario => (
              <ScenarioTag
                key={scenario.label}
                icon={scenario.icon}
                label={scenario.label}
                borderColor='#e4e5ff'
                iconColor={scenario.iconColor}
              />
            ))}
            <div
              className='flex items-center rounded-[6px] border border-rose-100'
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                padding: '3px 5px',
                gap: '2px',
              }}
            >
              <span
                className='text-xs font-semibold'
                style={{
                  fontFamily: '"PingFang SC"',
                  color: 'rgba(0, 0, 0, 0.6)',
                  lineHeight: '18px',
                }}
              >
                等
              </span>
              <MoreHorizontal
                className='w-3.5 h-3.5'
                style={{ color: 'rgba(0, 0, 0, 0.6)' }}
              />
            </div>
          </div>
        </button>

        {/* 底部提示 */}
        <p
          className='text-sm text-center whitespace-pre-wrap'
          style={{
            fontFamily: '"PingFang SC"',
            color: '#64748b',
            lineHeight: '20px',
          }}
        >
          随时可在顶部设置中更改
        </p>
      </div>
    </ResponsiveDialog>
  );
};

// Hook: 获取版本选择状态
export const useEditionSelection = () => {
  const [edition, setEdition] = useState<EditionType>('personal');
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 优先从 cookie 读取
    const cookieValue = getCookie(EDITION_STORAGE_KEY);
    if (cookieValue === 'personal' || cookieValue === 'business') {
      startTransition(() => {
        setEdition(cookieValue as EditionType);
        setIsFirstVisit(false);
      });
      return;
    }

    // 如果 cookie 没有，从 localStorage 读取
    try {
      const localValue = localStorage.getItem(EDITION_STORAGE_KEY);
      if (localValue === 'personal' || localValue === 'business') {
        startTransition(() => {
          setEdition(localValue as EditionType);
          setIsFirstVisit(false);
        });
        return;
      }
    } catch (error) {
      console.error('从 localStorage 读取失败:', error);
    }

    // 如果都没有，说明是首次访问
    startTransition(() => {
      setIsFirstVisit(true);
    });
  }, []);

  return { edition, isFirstVisit };
};
