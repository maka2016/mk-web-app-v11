import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useState } from 'react';

export default function WxAuthPanel({
  jumpToAuth,
  open,
  onClose,
}: {
  jumpToAuth: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const [comfirmCancel, setComfirmCancel] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (confirming) return;
    setConfirming(true);
    jumpToAuth();
  };

  const handleCancel = () => {
    setComfirmCancel(true);
  };

  const handleFinalCancel = () => {
    onClose();
  };

  return (
    <ResponsiveDialog
      isOpen={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          setComfirmCancel(false);
          setConfirming(false);
          onClose();
        }
      }}
      showCloseIcon={false}
      dismissible={false}
      contentProps={{
        className: 'rounded-t-lg p-4',
      }}
    >
      {!comfirmCancel ? (
        <div className='space-y-4'>
          <div className='mb-6 flex items-start gap-2'>
            <img
              src='https://img2.maka.im/cdn/webstore10/jiantie/auth-icon.svg'
              alt='AuthIcon'
              className='flex-shrink-0'
            />
            <div className='text-foreground'>
              点击&ldquo;确认&rdquo;一键登录查看完整内容
            </div>
          </div>
          <Button
            variant='default'
            size='lg'
            className='w-full mb-4'
            disabled={confirming}
            onClick={handleConfirm}
          >
            确认
          </Button>
          <Button
            variant='ghost'
            size='lg'
            className='w-full text-primary'
            onClick={handleCancel}
          >
            取消
          </Button>
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='mb-6 flex items-start gap-2'>
            <img
              src='https://img2.maka.im/cdn/webstore10/jiantie/warning-icon.svg'
              alt='WarningIcon'
              className='flex-shrink-0'
            />
            <div className='text-foreground'>
              不登录您可能无法提交，确认不登录浏览吗？
            </div>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='lg'
              className='flex-1'
              onClick={handleFinalCancel}
            >
              暂不登录
            </Button>
            <Button
              variant='default'
              size='lg'
              className='flex-1'
              disabled={confirming}
              onClick={handleConfirm}
            >
              登录查看完整内容
            </Button>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
