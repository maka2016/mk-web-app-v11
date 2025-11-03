import { getAppId, getUid, request } from '@/services';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { useStore } from '@/store';
import { API, getWorksDetailStatic, setWorksDetail } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Progress } from '@workspace/ui/components/progress';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import FileSaver from 'file-saver';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

const types = [
  {
    label: <div>个人/公益使用【带水印】</div>,
    value: 'free',
  },
  {
    label: (
      <div>
        商业使用
        <span
          style={{
            color: '#e3af53',
          }}
        >
          【无水印】
        </span>
      </div>
    ),
    value: 'vip',
  },
];

interface Props {
  worksId: string;
}

const TOTAL_DURATION = 60000; // 120秒 = 2分钟
const PROGRESS_CAP_BEFORE_DONE = 99.5; // 未完成前的上限

const VideoDownload = (props: Props) => {
  const { worksId } = props;
  const { permissions } = useStore();
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('vip');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const taskId = useRef<number>(null);
  const animationRef = useRef<any>(null);

  const startTimeRef = useRef<any>(null);
  const lastUpdateRef = useRef<any>(null);
  const speedFactorRef = useRef<any>(1); // 初始速度因子
  const completedRef = useRef<boolean>(false);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    setTitle(getWorksDetailStatic().title);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopPolling();
    };
  }, []);

  const getWorksData = async () => {
    const res = await getWorkData2(worksId);
    const worksData = res?.work_data;
    const detail = res?.detail;

    return {
      worksData,
      detail,
    };
  };

  const prefixUrl = (url: string) => {
    if (url.indexOf('http') === -1 || url.indexOf('https') === -1) {
      return 'https://res.maka.im' + url;
    }
    return url;
  };

  const checkStatus = async () => {
    if (!taskId.current) return false;
    const url = `https://www.maka.im/mk-gif-generator/screenshot-v3/get-task-by-id/${taskId.current}`;
    const res = await request.get(url);
    if (res.data.status === 2) {
      const response = await fetch(prefixUrl(url));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      FileSaver.saveAs(blob, `${title}.mp4`);
    }
    return res.data.status === 2;
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPollingUntilDone = () => {
    if (pollIntervalRef.current || !taskId.current) return;
    pollIntervalRef.current = setInterval(async () => {
      const done = await checkStatus();
      if (done) {
        completedRef.current = true;
        setProgress(100);
        stopPolling();
        setDownloading(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      } else {
        speedFactorRef.current = 0.25; // 降速到25%
      }
    }, 3000);
  };

  const updateProgress = (timestamp: number) => {
    if (completedRef.current) {
      setProgress(100);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    if (!startTimeRef.current) startTimeRef.current = timestamp;
    if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;

    const deltaTime = timestamp - lastUpdateRef.current;
    lastUpdateRef.current = timestamp;

    // 线性前进，直到未完成上限
    const baseIncrement =
      (100 / TOTAL_DURATION) * speedFactorRef.current * deltaTime;
    setProgress(prev => {
      if (completedRef.current) return 100;
      const next = prev + baseIncrement;
      return next >= PROGRESS_CAP_BEFORE_DONE
        ? PROGRESS_CAP_BEFORE_DONE
        : Number(next.toFixed(2));
    });

    animationRef.current = requestAnimationFrame(updateProgress);
  };

  const onExportVideo = async () => {
    if (downloading) {
      return;
    }
    // 重置状态
    taskId.current = null;
    animationRef.current = null;
    startTimeRef.current = null;
    lastUpdateRef.current = null;
    speedFactorRef.current = 1; // 初始速度因子
    completedRef.current = false;
    pollIntervalRef.current = null;
    setProgress(0);

    setDownloading(true);
    animationRef.current = requestAnimationFrame(updateProgress);
    const res = await getWorksData();
    const worksData = res.worksData;
    const worksDetail = res.detail;
    const urlParams = {
      appid: getAppId(),
      uid: getUid(),
      works_id: worksId,
      title: worksDetail?.title || '',
      music_url: worksData?.canvasData?.music?.url || '',
      viewer_url: `https://jiantieapp.com/viewer2/${worksId}?appid=${getAppId()}&exportVideo=1`,
      thumb: worksDetail.cover || '',
      version: worksDetail.version.toString() || '',
    };
    const url = `https://www.maka.im/mk-gif-generator/screenshot-v3/export-video-async?${new URLSearchParams(urlParams).toString()}`;
    const task = await request.get(url);
    taskId.current = task.data.id;
    startPollingUntilDone();
  };

  const showVipModal = () => {
    // window.open('https://www.maka.im/mk-web-store-v7/makapc/pricing');
    window.parent.postMessage({ type: 'vip', data: true }, API('根域名'));
  };

  const isVip = permissions?.remove_watermarks;

  return (
    <div className={styles.downloadContainer}>
      <div className={styles.title}>下载</div>
      <div className='p-4 flex flex-col gap-4'>
        <Label>作品名称</Label>
        <Input
          placeholder='请输入作品名称'
          value={title}
          onChange={e => {
            setTitle(e.target.value);
          }}
          onBlur={async e => {
            await updateWorksDetail2(worksId, {
              title: e.target.value,
            } as any);
            setWorksDetail({
              title: e.target.value,
            });
          }}
        />

        {!isVip && (
          <>
            <Label>作品用途</Label>
            <Select
              value={selectedType}
              onValueChange={key => {
                setSelectedType(key);
              }}
            >
              <SelectTrigger className={styles.searchType}>
                <SelectValue
                  placeholder={
                    types.find(item => item.value === selectedType)?.label ||
                    '请选择作品用途'
                  }
                />
              </SelectTrigger>
              <SelectContent className={styles.searchType}>
                {types.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {isVip ? (
          <Button className='w-full' onClick={() => onExportVideo()}>
            立即下载
          </Button>
        ) : (
          <div className='flex align-center gap-2 w-full'>
            {selectedType === 'free' && (
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => onExportVideo()}
              >
                带水印下载
              </Button>
            )}
            <Button
              className='flex-1'
              style={{
                background: 'linear-gradient(135deg,#ffecc9,#f3c97c)',
                color: '#613400',
              }}
              onClick={() => showVipModal()}
            >
              升级会员去水印
            </Button>
          </div>
        )}
      </div>
      <ResponsiveDialog
        isOpen={downloading}
        onOpenChange={() => {}}
        title='作品生成中...'
        showCloseIcon={false}
      >
        <div className='p-4'>
          <div className='flex items-center mb-4'>
            <Progress value={progress} className='w-full h-1' />
            <span
              className='progress_tip ml-2 w-14 text-right'
              style={{ color: 'var(--text-normal)' }}
            >
              {progress}%
            </span>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
};

export default VideoDownload;
