'use client';
import APPBridge from '@/store/app-bridge';
import { useEffect } from 'react';

//仅仅Client运行

interface Props {
  title: string;
  imageUrl: string;
  path?: string;

  serverPath?: {
    miniPath: string;
    urlPath: string;
  };
}

const MiniPShare = (props: Props) => {
  const { title, imageUrl, path, serverPath } = props;

  useEffect(() => {
    let tPath = '';
    if (path) {
      tPath = path;
    } else if (serverPath) {
      tPath = `${serverPath.miniPath}?url=${encodeURIComponent(
        `${location.origin}${serverPath.urlPath}`
      )}`;
    }

    if (APPBridge.judgeIsInMiniP()) {
      APPBridge.setShareInfo2MiniP({
        title,
        imageUrl,
        path: tPath,
      });
    }
  }, []);
  return <></>;
};

export default MiniPShare;
