import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import styled from '@emotion/styled';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Layers, LayoutDashboard, NotebookPen, UserPlus, Volume2, X } from 'lucide-react';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { getAppId } from '../../../../services';
import MusicManager from '../../components/Music/MusicManager';
import { BtnLite, BtnLiteColumn } from '../../components/style-comps';
import { getCanvaInfo2 } from '../../provider/utils';
import PageManagerForUser from '../PageManager/forUser';
import ChangeComponentTriggerDialog from '../SettingPopoverUser/ChangeComponentTrigger';
import AddElementPopover from './AddElementPopover';
import SettingElemV3 from './SettingElemV3';
import SettingRowV3 from './SettingRowV3';

const BtnLite2 = styled(BtnLiteColumn)``;

const CloseBtnWrapper = styled.div`
  position: sticky;
  right: -8px;
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
  margin: 0 4px 0 4px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  @media (min-width: 768px) {
    width: 24px;
    height: 24px;
  }
`;

const SettingGroupWrapper = styled.div`
  padding-bottom: calc(var(--safe-area-inset-bottom, 0));
  /* position: absolute; */
  z-index: 11;
  /* transform: translateY(-120%); */
  top: 0;
  right: 0;
  left: 0;
  background-color: #fff;
  /* margin: 8px;
  border-radius: 16px; */
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
    padding: 0 8px;
    border-radius: 16px;
    background-color: #fff;
  }
`;

const elemNameMap = {
  Text: '文字',
  Picture: '图片',
};

const MusicHelper = () => {
  const worksStore = useWorksStore();
  const [showMusicLib, setShowMusicLib] = useState(false);
  const musicConfig = worksStore.worksData?.music;
  const musicEnabled = !musicConfig?.disabled && !!musicConfig?.url;

  return (
    <>
      <BtnLite2
        onClick={() => {
          setShowMusicLib(true);
        }}
      >
        <div className='border_icon'>
          <Volume2 size={16} />
        </div>
        <span>音乐-{musicEnabled ? '已开启' : '未开启'}</span>
      </BtnLite2>
      <ResponsiveDialog
        isOpen={showMusicLib}
        // showOverlay={false}
        // showHandler={true}
        contentProps={{
          className: 'h-[605px]',
          style: {
            boxShadow: '0px 2px 14px 0px #55555533',
          },
        }}
        onOpenChange={val => {
          setShowMusicLib(val);
        }}
      >
        <>
          <MusicManager
            onClose={() => setShowMusicLib(false)}
            music={worksStore.worksData.music}
            setMusic={music => {
              worksStore.setMusic(music);
            }}
          />
        </>
      </ResponsiveDialog>
    </>
  );
};

function SettingGroup({ onUpdate }: { onUpdate?: () => void }) {
  const worksStore = useWorksStore();
  const { widgetStateV2, worksData, worksDetail } = worksStore;
  const gridProps = worksData.gridProps;
  const gridsData = gridProps.gridsData;
  const { getActiveRow } = worksStore.gridPropsOperator;
  const canvaInfo = getCanvaInfo2();
  const { blockSelectable = false } = gridProps?.userEditorSetting || {};
  const { clearActiveStatus } = worksStore;
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
  const currLayer = worksStore.getLayer(editingElemId || '');

  if (!currGroupRow && !currLayer) {
    return null;
  }
  if (!editingElemId && !blockSelectable) {
    const isWebsite = /html/gi.test(worksDetail?.specInfo?.export_format || '');
    const isRsvpEnable = worksDetail?.rsvp_form_config?.enabled;
    const useSystemVariables = worksDetail?.share_type === 'invite';
    const pageSettingBtn: React.ReactNode[] = [];
    if (getAppId() === 'maka') {
      pageSettingBtn.push(<AddElementPopover />);
    }
    if (isWebsite) {
      pageSettingBtn.push(
        <BtnLite2
          onClick={() => {
            const trigger = document.getElementById('RSVP_trigger_btn');
            if (trigger) {
              trigger.click();
            }
          }}
        >
          <div className='border_icon'>
            <NotebookPen size={16} />
          </div>
          <span>表单-{isRsvpEnable ? '已开启' : '未开启'}</span>
        </BtnLite2>
      );
    }

    const useMusic = ['html', 'video'].some(format =>
      worksDetail?.specInfo?.export_format?.includes(format)
    );

    if (useMusic) {
      pageSettingBtn.push(<MusicHelper />);
    }

    if (useSystemVariables) {
      pageSettingBtn.push(
        <BtnLite2
          onClick={() => {
            const trigger = document.getElementById(
              'showInviteeManagerTrigger'
            );
            if (trigger) {
              trigger.click();
            }
          }}
        >
          <div className='border_icon'>
            <UserPlus size={16} />
          </div>
          <span>添加嘉宾</span>
        </BtnLite2>
      );
    }

    const addPagable = !canvaInfo.isFlatPage && gridsData.length > 1;
    if (addPagable) {
      pageSettingBtn.push(
        <Popover>
          <PopoverTrigger asChild>
            <BtnLiteColumn>
              <div className='border_icon'>
                <Layers size={16} />
              </div>
              <span>页面管理</span>
            </BtnLiteColumn>
          </PopoverTrigger>
          <PopoverContent className='p-0 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden'>
            <div className='bg-white p-2 PageManagerForUser'>
              <PageManagerForUser />
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    if (pageSettingBtn.length === 0) {
      return null;
    }
    return (
      <SettingGroupWrapper className='SettingGroupWrapper2'>
        <div className='content overflow-x-auto'>
          <div className='flex gap-2 w-full py-1 items-center justify-center'>
            {pageSettingBtn.map((btn, index) => (
              <React.Fragment key={index}>{btn}</React.Fragment>
            ))}
          </div>
        </div>
      </SettingGroupWrapper>
    );
  }

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
          <AddElementPopover />
          <ChangeComponentTriggerDialog
            dataType={'components'}
            replaceCurrentRow={true}
            showAllComponent={false}
            trigger={(open, setOpen) => {
              return (
                <BtnLiteColumn
                  onClick={() => {
                    setOpen(true);
                  }}
                >
                  <div className='border_icon'>
                    <LayoutDashboard size={16} />
                  </div>
                  换版式
                </BtnLiteColumn>
              );
            }}
          />
          <SettingElemV3 onUpdate={onUpdate} />
        </>
      );
    }
  };

  return (
    <SettingGroupWrapper className='SettingGroupWrapper max-w-full'>
      <div className='content overflow-x-auto'>
        <div className='flex gap-2 w-full py-1 md:gap-0'>
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
              <X size={16} />
            </CloseBtn>
          </CloseBtnWrapper>
        </div>
      </div>
    </SettingGroupWrapper>
  );
}

export default observer(SettingGroup);
