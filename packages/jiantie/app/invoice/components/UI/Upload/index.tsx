'use client';
import { Icon } from '@workspace/ui/components/Icon';
import React, { useState } from 'react';
import OssUploader from '../OssUpload';
import styles from './index.module.scss';

interface Props {
  style?: React.CSSProperties;
  text?: string;
  defaultUrl?: string;
  onComplete?: (url: string, file: File) => any;
  disabled?: boolean;
}

const Upload: React.FC<Props> = props => {
  const [imgUrl, setImgUrl] = useState(props.defaultUrl);

  return (
    <div
      className={styles.main}
      style={{
        borderStyle: imgUrl && props.disabled ? 'solid' : undefined,
        ...props.style,
      }}
    >
      <OssUploader
        folderDir='invoice'
        className='upload_btn'
        maxSize={10}
        onChange={() => {}}
        disabled={props.disabled}
        onComplete={async (path: string, file) => {
          console.log('onComplete', path, file);
          const url = `https://res.maka.im/${path}`;
          setImgUrl(url);
          props.onComplete?.(url, file);
        }}
        accept='.jpg,.jpeg,.png'
        fileType='.jpg,.jpeg,.png'
      >
        {imgUrl ? (
          <div className={styles.imgWrapper}>
            <img alt='' className={styles.img} src={imgUrl} />
          </div>
        ) : (
          <div className={styles.uploadWrapper}>
            <Icon name='xinjian' size={32} color='rgba(0, 0, 0, 0.25)' />
            <div className={styles.text}>{props.text || '上传图片'}</div>
          </div>
        )}
      </OssUploader>
    </div>
  );
};

export default Upload;
