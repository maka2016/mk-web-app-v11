import styled from '@emotion/styled';
import { useEffect, useRef } from 'react';
import { useGridContext } from '../../../comp/provider';
import { getCanvaInfo2 } from '../../../comp/provider/utils';
import PageManagerForUser from '../../PageManager/forUser';
import SettingGroup from './SettingGroup';

const SettingWrapper = styled.div`
  /* bottom: var(--safe-area-inset-bottom, 0); */
`;

/**
 * 设计师和用户共用的组件管理器
 */
export default function SettingWidgetV4({
  onUpdate,
}: {
  onUpdate?: () => void;
}) {
  const { gridsData, fullStack } = useGridContext();
  const { isWebsite, maxPageCount, isFlatPage } = getCanvaInfo2();
  const addPageable = gridsData.length < maxPageCount;

  const newOperatingBtnRef = useRef<HTMLDivElement>(null);
  const initialHeightRef = useRef<number>(0);

  useEffect(() => {
    /** 键盘弹起隐藏底部悬浮按钮 */
    initialHeightRef.current = window.innerHeight;

    const handleResize = () => {
      if (!newOperatingBtnRef.current) {
        return;
      }
      const currentHeight = window.innerHeight;

      // 软键盘弹起隐藏底部悬浮按钮
      if (currentHeight < initialHeightRef.current - 100) {
        // 判断为软键盘弹出（通常高度减少超过100px）
        newOperatingBtnRef.current.style.display = 'none';
      } else {
        // 软键盘收起
        newOperatingBtnRef.current.style.display = 'flex';
      }
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!addPageable && !isWebsite) {
    return null;
  }

  return (
    <>
      <SettingWrapper className='SettingWidgetV4 sticky bottom-0 left-0 right-0 z-50 md:max-w-[375px] max-w-full'>
        {!fullStack && <SettingGroup onUpdate={onUpdate} />}
        {!isFlatPage && !fullStack && gridsData.length > 1 && (
          <div className='bg-white p-2 PageManagerForUser'>
            <PageManagerForUser />
          </div>
        )}
      </SettingWrapper>
    </>
  );
}
