import appBridge from '@mk/app-bridge';
import { isMakaAppClient } from '@mk/utils';
import { useEffect, useState } from 'react';
import PicturePanel from '../PicturePanel';
import NativePhotoCollection from './PhoneAlbum';

interface Props {
  preUpload?: boolean;
  multiple?: boolean;
  onSelectItem: (url: string) => void;
}

const PhoneAlbum = (props: Props) => {
  const { multiple = false, preUpload = true, onSelectItem } = props;

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
      onSelectItem={onSelectItem}
      multiple={multiple}
      t={undefined}
      preUpload={preUpload}
    />
  ) : (
    <PicturePanel onSelectItem={onSelectItem} />
  );
};

export default PhoneAlbum;
