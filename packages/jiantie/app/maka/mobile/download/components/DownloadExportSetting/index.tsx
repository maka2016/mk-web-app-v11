import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { cn } from '@workspace/ui/lib/utils';
import { useState } from 'react';
import styles from './index.module.scss';

const formatTypes = [
  {
    key: 'png',
    label: 'PNG',
    desc: '图片质量高清',
  },
  {
    key: 'jpg',
    label: 'JPG',
    desc: '文件较小，适合分享',
  },
  {
    key: 'pdf',
    label: 'PDF',
    desc: '多页可下载为一个文件，适合印刷',
  },
];

// 高清2倍 标准0.8
const scaleTypes = [
  {
    key: '0.8',
    label: '标准',
  },
  {
    key: '1',
    label: '高清',
    desc: 'VIP尊享',
  },
];

interface Props {
  onDownload: (formatValue: string, scaleValue: string) => void;
}

const DownloadExportSetting = (props: Props) => {
  const { onDownload } = props;
  const [format, setFormat] = useState('png');
  const [scale, setScale] = useState('0.8');

  return (
    <div className={styles.exportSetting}>
      <div className={styles.head}>下载设置</div>
      <div className={styles.setting}>
        <div className={styles.title}>导出更多格式</div>
        <RadioGroup
          defaultValue={format}
          onValueChange={val => {
            setFormat(val);
          }}
        >
          {formatTypes.map(item => (
            <div key={item.key} className={styles.radioItem}>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value={item.key} id={item.key} />
                <Label htmlFor='r1'>{item.label}</Label>
              </div>
              <span className={styles.desc}>{item.desc}</span>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div className={styles.setting}>
        <div className={styles.title}>图片尺寸</div>
        <RadioGroup
          defaultValue={scale}
          onValueChange={val => {
            setScale(val);
          }}
        >
          {scaleTypes.map(item => (
            <div key={item.key} className={styles.radioItem}>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value={item.key} id={`${item.key}`} />
                <Label htmlFor='r1'>{item.label}</Label>
              </div>
              {item.desc && (
                <span className={cn([styles.desc, styles.vip])}>
                  {item.desc}
                </span>
              )}
            </div>
          ))}
        </RadioGroup>
      </div>
      <Button
        className='mt-2 w-full'
        size='lg'
        onClick={() => {
          onDownload(format, scale);
        }}
      >
        下载
      </Button>
    </div>
  );
};

export default DownloadExportSetting;
