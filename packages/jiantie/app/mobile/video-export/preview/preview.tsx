'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import APPBridge from '@/store/app-bridge';
import { Button } from '@workspace/ui/components/button';
import styles from './index.module.scss';

const Preview = (props: { videoUrl: string; title: string }) => {
  const onSave = () => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        params: {
          url: props.videoUrl,
          name: `${props.title}.mp4`,
        },
        type: 'MkVideoDownload',
      });
    } else {
      const link = document.createElement('a');
      link.href = props.videoUrl;
      link.download = 'video.mp4';
      link.click();
    }
  };
  return (
    <div className={styles.preview}>
      <MobileHeader title='预览' className='flex-shrink-0' />
      <div className={styles.videoContainer}>
        <video controls width='100%'>
          <source src={props.videoUrl} type='video/mp4' />
        </video>
      </div>
      <div className={styles.footer}>
        <Button variant='secondary' className='w-full' onClick={() => onSave()}>
          保存到相册
        </Button>
      </div>
    </div>
  );
};

export default Preview;
