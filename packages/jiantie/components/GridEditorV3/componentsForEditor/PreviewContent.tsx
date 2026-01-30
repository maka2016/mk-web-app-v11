import { BehaviorBox } from '@/components/BehaviorTracker';
import Header from '@/components/DeviceWrapper/mobile/Header';
import { getShareUrl, useStore } from '@/store';
import { EventEmitter, SerializedWorksEntity } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useState } from 'react';
import { mkWebStoreLogger } from '../../../services/logger';
import { WorkDetailContent } from '../../WorksDetailContent';

const MobileShareContent = ({
  worksDetail,
  onClose,
}: {
  worksDetail: SerializedWorksEntity;
  onClose: () => void;
}) => {
  const store = useStore();
  const worksId = worksDetail.id;
  const isVideo = worksDetail?.specInfo?.export_format?.includes('video');
  const [isShareMode, setIsShareMode] = useState(false);

  const stopIframeMusic = () => {
    EventEmitter.emit('stopMusic', '');
  };

  const handleExportVideo = async () => {
    mkWebStoreLogger.track_success({
      object_type: 'work_video_export',
      object_id: worksId,
    });
    store.toVideoShare(worksId);
  };

  const handleToggleToShare = () => {
    mkWebStoreLogger.track_success({
      object_type: 'work_share',
      object_id: worksId,
    });
    stopIframeMusic();
    setIsShareMode(true);
  };

  const handleBackToPreview = () => {
    setIsShareMode(false);
  };

  const handleComplete = () => {
    // store.toHome();
    onClose?.();
  };

  return (
    <div className='flex flex-col h-full'>
      <Header
        leftText={isShareMode ? '返回预览' : '返回'}
        hideInPc={false}
        title={isShareMode ? '分享' : '预览'}
        onClose={isShareMode ? handleBackToPreview : onClose}
        rightContent={
          isShareMode ? (
            <Button size='sm' onClick={handleComplete}>
              <span>完成</span>
            </Button>
          ) : (
            <BehaviorBox
              behavior={{
                object_type: 'work_share_btn',
                object_id: worksId,
              }}
            >
              {isVideo ? (
                <Button size='sm' onClick={() => handleExportVideo()}>
                  <span>导出</span>
                </Button>
              ) : (
                <Button size='sm' onClick={handleToggleToShare}>
                  <span>分享</span>
                </Button>
              )}
            </BehaviorBox>
          )
        }
        style={{
          zIndex: 99999,
        }}
      />
      <div className='flex-1 overflow-hidden'>
        {isShareMode ? (
          <div className='h-full overflow-y-auto'>
            <WorkDetailContent
              work={worksDetail}
              shareOnly={true}
              onClose={onClose}
              onDataChange={() => { }}
              purchaseStatus={null}
            />
          </div>
        ) : (
          <iframe
            src={getShareUrl(worksId)}
            className='w-full h-full'
            title='预览'
          />
        )}
      </div>
    </div>
  );
};

export const PreviewContent = ({
  worksDetail,
  onClose,
}: {
  worksDetail: SerializedWorksEntity;
  onClose: () => void;
}) => {
  const store = useStore();
  const worksId = worksDetail.id;
  const isMobile = store.environment.isMobile;

  // 移动端布局：保持原有UI
  if (isMobile) {
    return <MobileShareContent worksDetail={worksDetail} onClose={onClose} />;
  }

  // PC端布局：左侧手机外框 + iframe，右侧标题和二维码
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex-1 grid grid-cols-2 gap-3 p-3 justify-center overflow-hidden'>
        <div className='relative bg-black rounded-[2rem] p-3 shadow-2xl w-[375px] aspect-[9/16] justify-self-center'>
          <div className='w-full h-full bg-white rounded-[1.5rem] overflow-hidden'>
            <iframe
              src={getShareUrl(worksId)}
              className='w-full h-full border-0'
              title='预览'
            />
          </div>
        </div>

        {/* 右侧：标题和二维码 */}
        <div className='flex flex-col items-center gap-3 h-full overflow-y-auto'>
          <WorkDetailContent
            work={worksDetail}
            onClose={onClose}
            shareOnly={true}
            onDataChange={() => { }}
            purchaseStatus={null}
          />
        </div>
      </div>
    </div>
  );
};

export const PreviewContentModal = ({
  worksDetail,
  open,
  onOpenChange,
}: {
  worksDetail: SerializedWorksEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const store = useStore();
  const isMobile = store.environment.isMobile;
  return (
    <ResponsiveDialog
      isOpen={open}
      title={!isMobile ? '预览/分享' : undefined}
      onOpenChange={onOpenChange}
      contentProps={{
        className:
          'h-full w-screen rounded-none md:rounded-lg md:max-h-[90vh] md:h-[800px] md:w-[1000px] md:w-[90vw] md:max-w-[90vw]',
        style: {
          paddingTop: 'var(--safe-area-inset-top, 0px)',
        },
      }}
    >
      <PreviewContent
        worksDetail={worksDetail}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
};
