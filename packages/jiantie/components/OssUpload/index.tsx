import { getOSSUploadInfo, getUid } from '@/services';
import { OSSClientCompat } from '@/services/oss-client-compat';
import { getFileExtendingName, random } from '@/utils';
import cls from 'classnames';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

interface Props {
  icon?: string;
  onChange?: (fileName: string, file: any, progress: number) => void;
  onComplete?: (url: string, ossPath: string) => void;
  folderDir: string;
  accept: string;

  fileType?: string;

  maxSize?: number; // 最大上传显示单位m

  label?: string;
  type?: 'primary' | 'hollow' | 'normal';
  className?: string;
  customStyle?: boolean;
  disabled?: boolean;
  children?: any;
}

export interface ClientInfo {
  region: string;
  endpoint: string;
  accessKeyId: string;
  accessKeySecret: string;
  stsToken: string;
  bucket: string;
}

const OssUploader = forwardRef<any, Props>((props, ref) => {
  const {
    className = '',
    maxSize = 20,
    onComplete,
    fileType,
    icon,
    disabled,
  } = props;
  const [ossClient, setossClient] = useState<any>();
  const [clientInfo, setClientInfo] = useState<ClientInfo>();
  const [inputKey, setInputKey] = useState(random());
  const [ossData, setOssData] = useState<Record<string, string>>({});
  const divRef = useRef<HTMLInputElement>(null);

  const t = useTranslations('OssUpload');

  useImperativeHandle(ref, () => ({
    upload: () => {
      divRef.current?.click();
    },
  }));

  useEffect(() => {
    async function initOssData() {
      const res = await getOSSUploadInfo(getUid());
      if (!res.data || !res.data.uploadPath) {
        return;
      }
      const clientInfo_ = {
        region: 'oss-cn-beijing', // 后续要改造接口从接口返回拿
        endpoint: res.data.hostId,
        accessKeyId: res.data.token.Credentials.AccessKeyId,
        accessKeySecret: res.data.token.Credentials.AccessKeySecret,
        stsToken: res.data.token.Credentials.SecurityToken,
        bucket: res.data.bucket,
      };

      const client = new OSSClientCompat(clientInfo_);
      setClientInfo(clientInfo_);
      setossClient(client);
      setOssData({ uploadPath: res.data.uploadPath });
    }
    initOssData();
  }, []);

  async function multipartUpload(file: File) {
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
    const uploadFilePath = `${ossData.uploadPath}/${props.folderDir}/${fileName}`;
    props.onChange && props.onChange(uploadFilePath, file, 0);

    try {
      // 填写Object完整路径。Object完整路径中不能包含Bucket名称。
      // 您可以通过自定义文件名（例如exampleobject.txt）或目录（例如exampledir/exampleobject.txt）的形式，实现将文件上传到当前Bucket或Bucket中的指定目录。
      await ossClient.multipartUpload(uploadFilePath, file, {
        progress(p: any) {
          if (p === 1) {
            setInputKey(random());
            const pUrl = clientInfo?.endpoint.split('//') || [];
            const url = `${pUrl[0]}//${clientInfo?.bucket}.${pUrl[1]}/${uploadFilePath}`;
            setTimeout(() => {
              toast.dismiss();
              props.onComplete && props.onComplete(url, uploadFilePath);
            }, 500);
          }
          if (p > 0) {
            props.onChange && props.onChange(uploadFilePath, file, p);
          }
          // props.onChange(uploadFilePath, file, p)
          // 断点记录点。浏览器重启后无法直接继续上传，您需要手动触发上传操作。
        },
      });
    } catch (e) {
      toast.dismiss();
      console.error('上传失败', e);
      toast.error('图片上传失败');
    }
  }

  const onChange = (e: any) => {
    let file = null;
    if (e.target.files) {
      [file] = e.target.files;
    }
    if (!file) {
      return;
    }
    if ((file as File).size * 0.001 > maxSize * 1024) {
      toast.error(
        t('maxSize', {
          size: maxSize,
        })
      );
      return;
    }
    if (fileType) {
      const fileExtension = getFileExtendingName((file as File).name);
      console.log('fileExtension', fileExtension);
      if (fileExtension && fileType.indexOf(fileExtension) < 0) {
        toast.error(t('fileTypeError'));
        return;
      }
    }
    toast.loading('图片上传中...');
    multipartUpload(file);
    console.log('onChange', file);
  };

  return (
    <div className={cls(['relative w-full h-full', className])}>
      <input
        key={inputKey}
        ref={divRef}
        onChange={onChange}
        type='file'
        accept={props.accept}
        className='absolute left-0 top-0 w-full h-0 border-none opacity-0 cursor-pointer'
      />
      <input
        type='file'
        accept='image/*'
        className='absolute left-0 top-0 w-full h-0 border-none opacity-0 cursor-pointer'
      ></input>
      <div
        className='absolute left-0 top-0 w-full h-full z-[1]'
        onClick={() => {
          divRef.current?.click();
        }}
      >
        {props.children}
      </div>
    </div>
  );
});

export default OssUploader;
OssUploader.displayName = 'OssUploader';
