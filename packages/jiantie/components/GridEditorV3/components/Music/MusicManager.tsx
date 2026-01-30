import { IMusic } from '@/components/GridEditorV3/works-store/types';
import { cdnApi } from '@/services';
import APPBridge from '@/store/app-bridge';
import { EventEmitter, isAndroid } from '@/utils';
import { Icon } from '@workspace/ui/components/Icon';
import { Button } from '@workspace/ui/components/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import cls from 'classnames';
import { CircleCheck, Power, PowerOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import MusicLibContent from './MusicLibContent';
import { MusicProvider, useMusic } from './MusicProvider';
import UserMusicPage from './UserMusicPage';
import styles from './index.module.scss';

interface MusicManagerProps {
  music?: IMusic;
  setMusic?: (music: IMusic) => void;
  onClose?: () => void;
}

const MusicManager = (props: MusicManagerProps) => {
  const { music, setMusic } = props;
  const [currentMusic, setCurrentMusic] = useState<any>(music || {});
  const [isSupportUpload, setIsSupportUpload] = useState(!isAndroid());

  const { togglePlay, isPlaying, stop } = useMusic();

  useEffect(() => {
    const isSupportUploadFunc = async () => {
      if (isAndroid()) {
        let APPLETSV2Enable = await APPBridge.featureDetect([
          'FileManagerOpen',
        ]);
        return APPLETSV2Enable.FileManagerOpen;
      } else {
        return true;
      }
    };
    const init = async () => {
      const isSupportUpload = await isSupportUploadFunc();
      setIsSupportUpload(isSupportUpload);
    };
    init();
  }, []);

  const onUseMusic = (payload: IMusic) => {
    if (!payload?.url) {
      return;
    }
    const data = {
      title: payload.title,
      url: payload.url,
      materialId: payload.materialId,
      type: 'music',
      duration: 0,
      preview: payload?.preview,
    };
    setMusic?.(data);
    setCurrentMusic(data);
  };

  const clearMusic = () => {
    const emptyMusic = {
      title: '',
      materialId: '',
      type: '',
      duration: -1,
      url: '',
      preview: '',
    };
    setMusic?.(emptyMusic);
    setCurrentMusic(emptyMusic);
    stop();
  };

  const renderCurrentMusic = () => {
    if (!currentMusic.url) {
      return null;
    }
    return (
      <div className={styles.currentMusic}>
        <div
          className={styles.cover}
          onClick={() => {
            togglePlay(currentMusic.url);
          }}
        >
          <div className={styles.mask}>
            <Icon
              name={isPlaying(currentMusic.url) ? 'pause' : 'play'}
              color='#fff'
            />
          </div>
          <img
            src={cdnApi(currentMusic.preview, {
              resizeWidth: 120,
            })}
            alt=''
          />
        </div>
        <div className={styles.name}>{currentMusic.title}</div>
        <Button variant='ghost' onClick={() => clearMusic()}>
          清空
        </Button>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Tabs
        defaultValue='music'
        className='h-full flex flex-col overflow-hidden pt-2'
      >
        <TabsList className='mx-2'>
          <TabsTrigger value='music' className='flex-1'>
            音乐库
          </TabsTrigger>
          {isSupportUpload && (
            <TabsTrigger value='my' className='flex-1'>
              用户上传
            </TabsTrigger>
          )}
        </TabsList>
        <div className='flex-1 overflow-hidden'>
          <TabsContent value='music' className='h-full overflow-hidden'>
            <MusicLibContent
              value={currentMusic}
              onChange={payload => {
                onUseMusic(payload);
              }}
            />
          </TabsContent>
          <TabsContent value='my' className='h-full overflow-hidden'>
            <UserMusicPage
              value={currentMusic}
              onChange={payload => {
                onUseMusic(payload);
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
      {renderCurrentMusic()}
      <div className={styles.footer}>
        {currentMusic.disabled ? (
          <>
            <Button
              className='flex-1 hover:bg-background'
              size='lg'
              variant='outline'
              onClick={() => {
                props.onClose?.();
              }}
            >
              暂不开启
            </Button>
            <Button
              className={styles.open_btn}
              size='lg'
              onClick={() => {
                setMusic?.({
                  ...currentMusic,
                  disabled: false,
                });
                setCurrentMusic({
                  ...currentMusic,
                  disabled: false,
                });
                EventEmitter.emit('resumeMusic', '');
                props.onClose?.();
              }}
            >
              <Power size={20} />
              开启功能
            </Button>
          </>
        ) : (
          <>
            <Button
              className={cls([styles.close_btn, 'hover:bg-background'])}
              size='lg'
              variant='outline'
              onClick={() => {
                setMusic?.({
                  ...currentMusic,
                  disabled: true,
                });
                setCurrentMusic({
                  ...currentMusic,
                  disabled: true,
                });
                EventEmitter.emit('stopMusic', '');
                stop();
                props.onClose?.();
              }}
            >
              <PowerOff size={20} />
              关闭功能
            </Button>
            <Button
              className={styles.open_btn}
              size='lg'
              onClick={() => {
                props.onClose?.();
              }}
            >
              <CircleCheck size={20} />
              完成设置
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const MusicManagerWrapper = (props: MusicManagerProps) => {
  return (
    <MusicProvider>
      <MusicManager {...props} />
    </MusicProvider>
  );
};

export default MusicManagerWrapper;
