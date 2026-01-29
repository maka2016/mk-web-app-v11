'use client';
import APPBridge from '@/store/app-bridge';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

interface Props {
  title: string;
  leftText?: string;
  rightText?: string;
  className?: string;
  isWebPage?: boolean;
  rightContent?: React.ReactNode;
  hideInPc?: boolean;
  onRightClick?: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

const MobileHeader = (props: Props) => {
  const t = useTranslations();
  const {
    title,
    leftText = t('back'),
    rightText,
    rightContent,
    className,
    onRightClick,
    onClose,
    isWebPage = false,
    style,
    hideInPc = true,
  } = props;

  const closePage = (e: any) => {
    console.log('closePage');
    e.preventDefault();
    e.stopPropagation();

    if (onClose) {
      console.log('onClose');
      onClose();
      return;
    }

    if (isWebPage) {
      //如果没有的回去则跳转
      if (history.length <= 1) {
        window.location.href = '/';
        return;
      }
      history.back();
      return;
    }
    if (APPBridge.judgeIsInApp()) {
      // 关闭页面
      APPBridge.appCall({
        type: 'MKPageClose',
      });
    } else {
      //如果没有的回去则跳转
      if (history.length <= 1) {
        window.location.href = '/';
        return;
      }
      history.back();
      return;
    }
  };

  return (
    <div
      className={cn(
        'sticky top-0 h-11 py-0 px-3 flex items-center justify-between text-black/88 bg-white border-b border-[#f0f0f0] z-10',
        hideInPc && 'md:hidden',
        className
      )}
      style={style}
    >
      <div className='w-20'>
        <div className='flex items-center w-fit' onClick={closePage}>
          {/* <Icon name="left" size={24} /> */}
          <ChevronLeft size={24} />
          <span className='flex items-center text-sm font-normal leading-[22px] text-black whitespace-nowrap'>
            {leftText}
          </span>
        </div>
      </div>
      <span className='flex-1 text-center text-base font-[var(--font-semibold)] leading-6 whitespace-nowrap text-ellipsis overflow-hidden text-black/88'>
        {title}
      </span>
      <div
        className='flex items-center justify-end w-20 text-right text-[var(--app-theme-color)] text-sm font-normal leading-[22px]'
        onClick={() => onRightClick?.()}
      >
        {rightText && <span>{rightText}</span>}
        {rightContent}
      </div>
    </div>
  );
};

export default MobileHeader;
