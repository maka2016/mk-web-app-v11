'use client';
import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import { cdnApi, getAppId, getUid, request } from '@/services';
import APPBridge from '@/store/app-bridge';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './index.module.scss';

interface Task {
  create_time: string;
  title: string;
  id: number;
  thumb: string;
  oss_path: string;
  retry: number;
  status: number;
  inputs: string;
}

const StatusMap: Record<number, { label: string; className: string }> = {
  0: {
    label: '等待导出...',
    className: 'pending',
  },
  1: {
    label: '导出中',
    className: 'processing',
  },
  2: {
    label: '导出成功',
    className: 'success',
  },
  [-1]: {
    label: '导出失败',
    className: 'failed',
  },
};

const VideoExport = () => {
  const appid = getAppId();
  const router = useRouter();
  const [list, setList] = useState<Task[]>([]);
  const [update, setUpdate] = useState(0);
  const [showShareTip, setShowShareTip] = useState(false);
  const [loading, setLoading] = useState(true);
  const getList = async () => {
    setLoading(true);
    const uid = getUid();
    const url = `https://www.maka.im/mk-gif-generator/screenshot-v3/get-task/${appid}/${uid}`;

    const res: any = await request.get(url);
    console.log('res', res);
    if (res) {
      setList(res);
      setLoading(false);
    }
  };

  const [shareDouyinVideo, setShareDouyinVideo] = useState(false);
  const [isMiniProgram, setIsMiniProgram] = useState(false);

  const initAPPJudge = async () => {
    let feature = await APPBridge.featureDetect(['ShareDouyinVideo']);

    setShareDouyinVideo(feature.ShareDouyinVideo);
  };

  useEffect(() => {
    setIsMiniProgram(APPBridge.judgeIsInMiniP());
    initAPPJudge();
  }, []);

  useEffect(() => {
    getList();
  }, [update]);

  const prefixUrl = (url: string) => {
    if (url.indexOf('http') === -1 || url.indexOf('https') === -1) {
      return 'https://res.maka.im' + url;
    }
    return url;
  };

  const onSave = (url: string, title: string) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        params: {
          url: prefixUrl(url),
          name: `${title}.mp4`,
        },
        type: 'MkVideoDownload',
      });
    } else if (APPBridge.judgeIsInMiniP()) {
      APPBridge.minipNav(
        'navigate',
        `/pages/videopreview/index?url=${encodeURIComponent(prefixUrl(url))}&title=${title}`
      );
    } else {
      console.log(prefixUrl(url));
      const link = document.createElement('a');
      link.href = prefixUrl(url);
      link.download = 'video.mp4';
      link.click();
    }
  };

  return (
    <div className={styles.container}>
      <MobileHeader title='导出记录' />

      <div className={styles.list}>
        {list.map(item => (
          <div
            className='bg-white rounded-lg p-3 flex flex-col gap-3'
            key={item.id}
          >
            <div key={item.id} className={styles.ListItem}>
              <div className={styles.thumb}>
                <img src={item.thumb} alt='' />
              </div>
              <div>
                <div className={styles.title}>{item.title}.mp4</div>
                <div className='flex gap-2 items-center'>
                  <div
                    className={cls([
                      styles.status,
                      styles[StatusMap[item.status].className],
                    ])}
                  >
                    {StatusMap[item.status].label}
                  </div>
                  <div className={styles.time}>
                    {dayjs(item.create_time).format('MM.DD HH:mm')}
                  </div>
                </div>
              </div>
            </div>

            {item.status === 2 && (
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  className='flex-1 text-[#3358D4]'
                  size='sm'
                  onClick={() => {
                    if (APPBridge.judgeIsInApp()) {
                      APPBridge.navToPage({
                        url: `${location.origin}/mobile/video-export/preview?url=${prefixUrl(item.oss_path)}&title=${item.title}&is_full_screen=1`,
                        type: 'URL',
                      });
                    } else if (APPBridge.judgeIsInMiniP()) {
                      APPBridge.minipNav(
                        'navigate',
                        `/pages/videopreview/index?url=${encodeURIComponent(prefixUrl(item.oss_path))}&title=${item.title}`
                      );
                    } else {
                      router.push(
                        `/mobile/video-export/preview?url=${prefixUrl(item.oss_path)}&title=${item.title}`
                      );
                    }
                  }}
                >
                  <Icon name='preview' size={16} />
                  预览
                </Button>
                <Button
                  variant='outline'
                  className='flex-1 text-[#3358D4]'
                  size='sm'
                  onClick={() => onSave(item.oss_path, item.title)}
                >
                  <Icon name='xiazai' size={16} />
                  保存到相册
                </Button>
                {(isMiniProgram || shareDouyinVideo) && (
                  <Button
                    variant='outline'
                    className='flex-1 text-[#3358D4]'
                    size='sm'
                    onClick={() => {
                      if (isMiniProgram) {
                        setShowShareTip(true);
                        return;
                      }

                      APPBridge.appCall({
                        params: {
                          url: prefixUrl(item.oss_path),
                          name: `${item.title}.mp4`,
                        },
                        type: 'MkShareDouyinVideo',
                      });
                    }}
                  >
                    <img
                      className='size-4'
                      src={cdnApi('/cdn/webstore10/jiantie/icon_douyin.png')}
                      alt=''
                    />
                    抖音分享
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {update === 0 && loading && (
        <div className='flex items-center justify-center p-1'>
          <Loading />
        </div>
      )}
      {!loading && list.length === 0 && (
        <div className={styles.empty}>
          <img src={cdnApi('/cdn/webstore10/education/empty.png')} alt='' />
          <div className='text-[#999]'>暂无导出记录</div>
        </div>
      )}
      <ResponsiveDialog
        isDialog
        isOpen={showShareTip}
        onOpenChange={setShowShareTip}
        contentProps={{
          className: 'w-[320px]',
        }}
      >
        <div className={styles.dialog}>
          <div className={styles.title}>视频已保存到相册</div>
          <div className='flex items-center justify-center text-base gap-2 my-2'>
            <img
              className='size-4'
              src={cdnApi('/cdn/webstore10/jiantie/icon_douyin.png')}
              alt=''
            />
            请打开抖音进行分享
          </div>
          <img src={cdnApi('/cdn/webstore10/jiantie/douyin_share.png')} />
        </div>
        <div className='p-3'>
          <Button
            size='lg'
            className='w-full'
            onClick={() => setShowShareTip(false)}
          >
            知道了
          </Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default VideoExport;
