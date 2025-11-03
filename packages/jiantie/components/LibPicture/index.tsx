import React, { useEffect, useState } from 'react';
import appBridge from '@mk/app-bridge';
import { isMakaAppClient } from '@mk/utils';
import PicturePanel from '../PicturePanel';
import NativePhotoCollection from './PhoneAlbum';

interface Props {
  preUpload?: boolean;
  multiple?: boolean;
  worksId: string;
  onSelectItem: (url: string) => void;
}

const PhoneAlbum = (props: Props) => {
  const { worksId, multiple = false, preUpload = true, onSelectItem } = props;

  const [ready, setReady] = useState(false);
  const [loadLocalImageAvaliable, setLoadLocalImageAvaliable] = useState(false);

  useEffect(() => {
    if (isMakaAppClient()) {
      appBridge.appCall(
        {
          type: 'MKTypeCheck',
          params: {
            check_type: 'MKAlbumList',
          },
          jsCbFnName: 'appBridgeOnAppTypeCheckCb',
        },
        cbParams => {
          if (cbParams && cbParams?.enable) {
            setLoadLocalImageAvaliable(cbParams?.enable === '1');
            setReady(true);
          }
        },
        60000
      );
    } else {
      setReady(true);
    }
  }, []);

  return loadLocalImageAvaliable ? (
    <NativePhotoCollection
      worksId={worksId}
      onSelectItem={onSelectItem}
      multiple={multiple}
      t={undefined}
      preUpload={preUpload}
    />
  ) : (
    <PicturePanel worksId={worksId} onSelectItem={onSelectItem} />
  );
};

export default PhoneAlbum;
