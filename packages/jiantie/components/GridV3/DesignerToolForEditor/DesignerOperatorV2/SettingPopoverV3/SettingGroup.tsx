import styled from '@emotion/styled';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGridContext } from '../../../comp/provider';
import { BtnLite } from '../../../shared/style-comps';
import { SettingElemV3 } from './SettingElemV3';
import { SettingRowV3 } from './SettingRowV3';

const CloseBtnWrapper = styled.div`
  position: sticky;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px 5px rgba(255, 255, 255, 0.8);
  background-color: #fff;
`;

const CloseBtn = styled(BtnLite)`
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 8px 0 4px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
`;

const SettingGroupWrapper = styled.div`
  /* position: absolute; */
  z-index: 11;
  /* transform: translateY(-120%); */
  top: 0;
  right: 0;
  left: 0;
  background-color: #fff;
  margin: 8px;
  border-radius: 16px;
  .header {
    font-size: 12px;
    background-color: #f5f5f5;
    padding: 0 12px;
    height: 32px;
    overflow: hidden;
    border-radius: 16px 16px 0 0;
    .group_info {
      font-weight: bold;
    }
  }
  .content {
    padding: 0 0 0 8px;
    border-radius: 16px;
    background-color: #fff;
  }
`;

const elemNameMap = {
  Text: '文字',
  Picture: '图片',
};

export default function SettingGroup({ onUpdate }: { onUpdate?: () => void }) {
  const { widgetStateV2, editorSDK, getActiveRow, clearActiveStatus } =
    useGridContext();
  const { editingElemId } = widgetStateV2;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 监听键盘弹起
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      // 当窗口高度明显减小时，判断为键盘弹起
      const heightDiff = initialHeight - currentHeight;
      setIsKeyboardVisible(heightDiff > 150);
    };

    window.addEventListener('resize', handleResize);

    // 监听 visualViewport API（更准确的键盘检测）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // 当键盘弹起时，隐藏组件
  if (isKeyboardVisible) {
    return null;
  }

  // 取[0,1]2层
  const currGroupRow = getActiveRow();
  const currLayer = editorSDK?.getLayer(editingElemId || '');

  const renderContent = () => {
    if (!editingElemId) {
      return (
        <>
          <SettingRowV3 />
        </>
      );
    } else {
      return (
        <>
          <SettingElemV3 onUpdate={onUpdate} />
        </>
      );
    }
  };

  if (!currGroupRow && !currLayer) {
    return null;
  }

  return (
    <SettingGroupWrapper className='SettingGroupWrapper'>
      <div className='content overflow-x-auto'>
        <div className='flex gap-2 w-full'>
          {renderContent()}
          <span className='flex-1'></span>
          <CloseBtnWrapper>
            <CloseBtn
              direction='column'
              onClick={() => {
                clearActiveStatus();
              }}
              title='取消选中'
            >
              <X size={20} />
            </CloseBtn>
          </CloseBtnWrapper>
        </div>
      </div>
    </SettingGroupWrapper>
  );
}
