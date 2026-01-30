import { random } from '@/utils';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import toast from 'react-hot-toast';
import styles from './index.module.scss';
// import { openFilePicker } from "../../utils/wenzyApp"
import { getAppId, getToken, getUid, startupStsOssClient } from '@/services';
import { cn } from '@workspace/ui/lib/utils';

interface Props {
  onChange?: (fileName: string, file: any, progress: number) => void;
  onComplete?: (url: string, file: any) => void;

  onBegin?: () => void;

  onValid?: (file: any) => Promise<{ pass: boolean; msg: string }>;
  accept: string;
  folderDir?: string;

  fileType?: string;

  maxSize?: number; // 最大上传显示单位m

  label?: string;
  mutiple?: boolean;
  className?: string;

  children?: React.ReactNode;

  disabled?: boolean;
}

export interface ClientInfo {
  region: string;
  endpoint: string;
  accessKeyId: string;
  accessKeySecret: string;
  stsToken: string;
  bucket: string;
}

export interface OssUploaderMethods {
  upload: () => void;

  uploadFile: (file: File) => void;
}

const OssUploader = forwardRef<OssUploaderMethods, Props>((props, ref) => {
  const {
    className = '',
    maxSize = 20,
    folderDir = 'timages',
    onChange,
    fileType,
    onBegin,
    onValid,
  } = props;
  const [ossClient, setossClient] = useState<any>();
  const [inputKey, setInputKey] = useState(random());
  const [ossData, setOssData] = useState<Record<string, string>>({});
  const divRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startupStsOssClient({
      appid: getAppId(),
      uid: getUid().toString(),
      token: getToken(),
    }).then(({ client, uploadPath }) => {
      setossClient(client);
      setOssData({ uploadPath });
    });
  }, []);

  async function multipartUpload(file: File) {
    if (!file) {
      return;
    }
    if ((file as File).size * 0.001 > maxSize * 1024) {
      toast.error(`文件不能超过${maxSize}MB`);
      return;
    }
    if (fileType) {
      const fileExtension = getFileExtendingName((file as File).name);
      if (fileExtension && fileType.indexOf(fileExtension) < 0) {
        toast.error(`文件格式不正确`);
        return;
      }
    }
    if (onValid) {
      let checkRes = await onValid(file);
      if (!checkRes.pass) {
        toast.error(checkRes?.msg ?? `文件不符合要求`);
        return;
      }
    }

    function getFileExtendingName(filename: string) {
      // 文件扩展名匹配正则
      const reg = /\.[^.]+$/;
      const matches = reg.exec(filename);
      if (matches) {
        return matches[0];
      }
      return '';
    }

    const fileName = `${new Date().valueOf()}${getFileExtendingName(file.name)}`;
    const uploadFilePath = `${ossData.uploadPath}/${folderDir}/${fileName}`;
    onChange?.(uploadFilePath, file, 0);
    const notifier = toast.loading('上传中.....', {
      style: { zIndex: 999999 },
    });

    try {
      // 填写Object完整路径。Object完整路径中不能包含Bucket名称。
      // 您可以通过自定义文件名（例如exampleobject.txt）或目录（例如exampledir/exampleobject.txt）的形式，实现将文件上传到当前Bucket或Bucket中的指定目录。
      // await ossClient?.multipartUpload(uploadFilePath, file, {
      //   progress(p: any, checkpoint: any) {
      //     if (p === 1) {
      //       setInputKey(random())
      //       setTimeout(() => {
      //         console.log('uploadFilePath', fileName)
      //         console.log(file)
      //         props.onComplete?.(uploadFilePath, file)

      //       }, 500)
      //       toast.dismiss(notifier)
      //       toast.success('上传完成')
      //     }

      //     if (p > 0) {
      //       onChange?.(uploadFilePath, file, p)
      //     }

      //     // props.onChange(uploadFilePath, file, p)
      //     // 断点记录点。浏览器重启后无法直接继续上传，您需要手动触发上传操作。
      //   },
      // })

      const res = await ossClient?.put(uploadFilePath, file, {});
      console.log('upload res:', res);
      setInputKey(random());
      setTimeout(() => {
        props.onComplete?.(uploadFilePath, file);
      }, 500);
      toast.success('上传完成');

      onChange?.(uploadFilePath, file, 1);
    } catch (e) {
      console.log(e);
      toast.error('上传失败');
    } finally {
      toast.dismiss(notifier);
    }
  }

  const _onChange = async (e: any) => {
    onBegin?.();
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      // if (!file) {
      //   continue
      // }
      // if ((file as File).size * 0.001 > maxSize * 1024) {
      //   toast.error(`文件不能超过${maxSize}mb`)
      //   continue
      // }
      // if (fileType) {
      //   const fileExtension = getFileExtendingName((file as File).name)
      //   if (fileExtension && (fileType.indexOf(fileExtension) < 0)) {
      //     toast.error(`文件格式不正确`)
      //     continue
      //   }
      // }
      // if (onValid) {
      //   let checkRes = await onValid(file)
      //   if (!checkRes.pass) {
      //     toast.error(checkRes?.msg ?? `文件不符合要求`)
      //     continue
      //   }
      // }
      multipartUpload(file);
    }
  };
  useImperativeHandle(ref, () => ({
    upload: () => {
      upload();
    },
    uploadFile: file => {
      return multipartUpload(file);
    },
  }));

  const upload = async () => {
    // if (!isPc() && !isIOS()) {
    //   const file = await openFilePicker(props.fileType?.split(','))
    //   onBegin?.()
    //   multipartUpload(file)
    // }
    // else {
    divRef.current?.click();
    // }
  };

  return (
    <div className={cn(styles.ossuploaderWrap, className)}>
      <input
        type='file'
        className={styles.hiddenInput}
        ref={divRef}
        key={inputKey}
        onChange={_onChange}
        accept={props.accept}
        multiple={props.mutiple}
      />
      {
        <div
          className={cn(!props.disabled && 'cursor-pointer')}
          style={{ height: '100%' }}
          onClick={() => {
            if (props.disabled) return;
            upload();
          }}
        >
          {props.children}
        </div>
      }
    </div>
  );
});

export default OssUploader;
OssUploader.displayName = 'OssUploader';
