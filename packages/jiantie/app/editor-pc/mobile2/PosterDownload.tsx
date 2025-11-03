import { getAppId } from '@/services';
import { getWorkData2, updateWorksDetail2 } from '@/services/works2';
import { useStore } from '@/store';
import { API, getWorksDetailStatic, setWorksDetail } from '@mk/services';
import { getCanvaInfo2 } from '@mk/widgets/GridV3/comp/provider/utils';
import { onScreenShot } from '@mk/widgets/GridV3/shared';
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
import toast from 'react-hot-toast';
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

const PosterDownload = (props: Props) => {
  const { worksId } = props;
  const { permissions } = useStore();
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('vip');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    setTitle(getWorksDetailStatic().title);
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
  const onProgress = () => {
    timer.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1;
        // 到达100%时停止定时器
        if (newProgress >= 100) {
          clearInterval(timer.current);
          timer.current = null;
          return 100;
        }
        return newProgress;
      });
    }, 60);
  };

  const onScreenshotPoster = async () => {
    if (downloading) {
      return;
    }

    const res = await getWorksData();
    const currentWorksData = res.worksData;
    const currentWorksDetail = res.detail;

    const canvaInfo2 = getCanvaInfo2(
      currentWorksDetail as any,
      currentWorksData as any
    );

    if (!canvaInfo2) {
      toast.error('画布信息获取失败');
      return;
    }
    setProgress(0);
    setDownloading(true);
    onProgress();

    const { viewportWidth, canvaVisualHeight = 1, viewportScale } = canvaInfo2;
    const screenshotWidth = viewportWidth;
    const screenshotHeight = viewportScale * canvaVisualHeight;

    let size = {
      width: screenshotWidth,
      height: screenshotHeight,
    };
    const appid = getAppId();
    const screenshotRes = await onScreenShot({
      id: worksId,
      width: size.width,
      height: size.height,
      appid,
    }).catch(() => {
      toast.error('图片生成失败');
      setDownloading(false);
    });

    await updateWorksDetail2(worksId, {
      cover: screenshotRes[0],
    } as any);

    const response = await fetch(screenshotRes[0]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    FileSaver.saveAs(blob, `${title}.png`);

    setDownloading(false);
    setProgress(100);
    clearInterval(timer.current);
    timer.current = null;
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
          <Button className='w-full' onClick={() => onScreenshotPoster()}>
            立即下载
          </Button>
        ) : (
          <div className='flex align-center gap-2 w-full'>
            {selectedType === 'free' && (
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => onScreenshotPoster()}
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
              className='progress_tip ml-2'
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

export default PosterDownload;
