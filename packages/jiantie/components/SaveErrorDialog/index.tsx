import {
  AlertDialog,
  AlertDialogAction,
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
}

export default function SaveErrorDialog({
  open,
  onOpenChange,
  onRetry,
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
