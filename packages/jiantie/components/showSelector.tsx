import { cdnApi } from '@mk/services';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import LibPictureV2 from './LibPicture';
import { useTranslations } from 'next-intl';
import { getLocale } from '@/services';
import { canUseRnChoosePic, showRnChoosePic } from '@/utils/rnChoosePic';

interface OnSelectedParams {
  ossPath: string;
  url: string;
  videoWatchUrl?: string;
  width?: number;
  height?: number;
  type: string;
}

interface ShowSelectorParams {
  type: 'upload' | 'picture';
  onSelected?: (params: OnSelectedParams) => void;
  worksId: string;
  preUpload?: boolean;
}

export const showSelector = async (params: ShowSelectorParams) => {
  console.log('showSelectorparams', params);
  const locale = getLocale();
  switch (params.type) {
    // case "upload":
    //   handleFileSelect().then((res) => {
    //     const closeModal = ShowModal({
    //       title: "Uploading...",
    //       width: 400,
    //       style: { maxWidth: "100%" },
    //       children: () => {
    //         return <DownloadProgress onCancel={() => {}} />;
    //       },
    //     });
    //     const timer = setTimeout(() => {
    //       closeModal();
    //       toast("上传超时，请重试");
    //     }, 10000);
    //     if (res) {
    //       // console.log('res', res)
    //       uploadFile(res).then(([uploadRes]) => {
    //         params.onSelected?.({
    //           ossPath: uploadRes.url,
    //           url: uploadRes.url,
    //           videoWatchUrl: uploadRes.videoWatchUrl,
    //           width: uploadRes.width,
    //           height: uploadRes.height,
    //           type: "picture",
    //         });
    //         // toast('上传成功')
    //         closeModal();
    //         clearTimeout(timer);
    //       });
    //     }
    //   });
    //   break;
    case 'picture':
      console.log('picture');

      if (await canUseRnChoosePic()) {
        showRnChoosePic((url?: string) => {
          if (url) {
            params.onSelected?.({
              ossPath: url,
              url: cdnApi(url),
              type: 'picture',
            });
          }
        });
        return;
      }

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
              worksId={params.worksId}
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
