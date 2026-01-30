import { getAppId } from '@/services';
import PicturePanel from './PicturePanel';
import PicturePanelLegacy from './PicturePanelLegacy';

interface Props {
  preUpload?: boolean;
  multiple?: boolean;
  onSelectItem: (url: string) => void;
}

const PhoneAlbum = (props: Props) => {
  const { multiple = false, preUpload = true, onSelectItem } = props;

  const currentAppId = getAppId();
  const isMaka = currentAppId === 'maka';

  // 当 appid=maka 时，只显示 PicturePanelLegacy（PicturePanel 作为第一个文件夹分类）
  if (isMaka) {
    return <PicturePanelLegacy onSelectItem={onSelectItem} />;
  } else {
    return <PicturePanel onSelectItem={onSelectItem} />;
  }
};

export default PhoneAlbum;
