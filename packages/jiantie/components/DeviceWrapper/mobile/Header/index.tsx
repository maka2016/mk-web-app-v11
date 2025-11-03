'use client';
import React from 'react';
import styles from './index.module.scss';
import APPBridge from '@mk/app-bridge';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  leftText?: string;
  rightText?: string;
  className?: string;
  isWebPage?: boolean;
  rightContent?: React.ReactNode;
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
    <div className={cls([styles.head, className])} style={style}>
      <div className={styles.left}>
        <div className='flex items-center w-fit' onClick={closePage}>
          {/* <Icon name="left" size={24} /> */}
          <ChevronLeft size={24} />
          <span>{leftText}</span>
        </div>
      </div>
      <span className={styles.title}>{title}</span>
      <div className={styles.right} onClick={() => onRightClick?.()}>
        {rightText && <span>{rightText}</span>}
        {rightContent}
      </div>
    </div>
  );
};

export default MobileHeader;
