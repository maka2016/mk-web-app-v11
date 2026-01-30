import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { useTranslations } from 'next-intl';

interface SaveErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  errorMessage?: string;
  errorStack?: string;
}

export default function SaveErrorDialog({
  open,
  onOpenChange,
  onRetry,
  errorMessage,
  errorStack,
}: SaveErrorDialogProps) {
  const handleReload = () => {
    window.location.reload();
  };
  const t = useTranslations('Editor');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='w-[320px]'>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('saveError')}</AlertDialogTitle>
          <AlertDialogDescription className='text-black/88'>
            {t('errorTip')}
            {errorMessage && (
              <div className='mt-2 p-2 bg-red-50 rounded text-sm text-red-600 break-words'>
                {errorMessage}
              </div>
            )}
            {errorStack && (
              <details className='mt-2'>
                <summary className='cursor-pointer text-sm text-gray-600 hover:text-gray-800'>
                  查看调用堆栈
                </summary>
                <pre className='mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 overflow-auto max-h-48 break-words whitespace-pre-wrap'>
                  {errorStack}
                </pre>
              </details>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleReload}>重新加载</AlertDialogCancel>
          {/* <AlertDialogAction
            className="rounded-full bg-primary text-primary-btn hover:bg-primary/90"
            onClick={onRetry}
          >
            重试
          </AlertDialogAction> */}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
