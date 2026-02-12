import { cdnApi, getLocale } from '@/services';
import { canUseRnChoosePic, showRnChoosePic } from '@/utils/rnChoosePic';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import LibPictureV2 from './LibPicture';

interface OnSelectedParams {
  ossPath: string;
  url: string;
  name?: string;
  videoWatchUrl?: string;
  width?: number;
  height?: number;
  type: string;
}

interface ShowSelectorParams {
  type: 'upload' | 'picture';
  onSelected?: (params: OnSelectedParams) => void;
  preUpload?: boolean;
}

export const showSelector = async (params: ShowSelectorParams, t?: (key: string) => string) => {
  console.log('showSelectorparams', params);
  const locale = getLocale();
  switch (params.type) {
    case 'picture':
      console.log('picture');

      if (await canUseRnChoosePic()) {
        // RN 版本的系统相册功能
        showRnChoosePic((url?: string) => {
          if (url) {
            params.onSelected?.({
              ossPath: url,
              url: cdnApi(url),
              type: 'picture',
            });
          }
        }, t);
        return;
      }

      // web 或 maka app 的相册功能
      ShowDrawerV2({
        title: '更换图片',
        className: 'md:max-w-[800px] w-full',
        handleOnly: true,
        contentProps: {
          style: {
            willChange: 'auto',
          },
        },
        children: ({ close }) => {
          return (
            <LibPictureV2
              preUpload={params.preUpload}
              onSelectItem={url => {
                params.onSelected?.({
                  ossPath: url,
                  url: cdnApi(url),
                  type: 'picture',
                });
                close();
              }}
            />
          );
        },
      });
      break;

    default:
      break;
  }
};
