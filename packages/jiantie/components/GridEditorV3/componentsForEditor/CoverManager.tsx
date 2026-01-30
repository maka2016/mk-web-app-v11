import { cdnApi, getAppId, getUid } from '@/services';
import { SerializedWorksEntity } from '@/utils';
import { Button } from '@workspace/ui/components/button';
import axios from 'axios';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { getShareUrl } from '../../../store';
import { showSelector } from '../../showSelector';

const originDefault =
  process.env.ENV === 'prod'
    ? 'https://jiantieapp.com'
    : 'https://staging-jiantie-web.maka.im';

export const genTemplateCover = async (
  worksId: string,
  designer_uid: string,
  coverType: '动态' | '静态' = '动态'
) => {
  // 根据 worksId 是否以 T_ 开头判断是否是模板
  const isTemplate = worksId.startsWith('T_');

  let viewerUrl: string;
  if (isTemplate) {
    viewerUrl = `https://www.jiantieapp.com/mobile/template?id=${worksId}&screenshot=true`;
  } else {
    const queryForViewer = {
      appid: getAppId(),
      screenshot: 'true',
    };
    viewerUrl = getShareUrl(worksId, queryForViewer, originDefault);
  }

  const apiUrl =
    coverType === '动态'
      ? 'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync'
      : 'https://www.maka.im/mk-gif-generator/screenshot/v2/export';

  const urlParams = isTemplate
    ? {
      url: viewerUrl,
      width: '540',
      height: '960',
      works_id: worksId,
      uid: designer_uid,
      mode: 'template',
      watermark: '0',
      setpts: '0.5',
      pageCount: '1',
    }
    : {
      works_id: worksId,
      uid: getUid() || '',
      format: 'png',
      type: 'longH5',
      pageCount: '1',
      url: viewerUrl,
      width: '540',
      height: '960',
      appid: getAppId(),
    };

  const apiUrlFinal = `${apiUrl}?${new URLSearchParams(urlParams as any).toString()}${isTemplate ? '' : `&surfix=${Date.now()}`}`;

  const coverRes = await axios.get(apiUrlFinal, {
    timeout: 60000,
  });

  const coverUrl = coverType === '动态' ? coverRes.data.fullUrls[0] : coverRes.data?.data?.fullUrls?.[0];

  return coverUrl;
};


const CoverManager = ({
  onCoverChange,
  worksDetail,
  useDynamicCover,
}: {
  onCoverChange?: (cover: string | undefined) => void;
  worksDetail: SerializedWorksEntity;
  useDynamicCover?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  const [cover, setCover] = useState((worksDetail as any).coverV3?.url || worksDetail.cover);

  if (!worksDetail.id) {
    return null;
  }

  return (
    <div className='p-4 flex gap-2'>
      <div className='mb-4 flex justify-center max-h-[50vh]'>
        {cover ? (
          <img src={cover} alt='' width={200} />
        ) : (
          <div>
            <p>暂无封面</p>
          </div>
        )}
      </div>
      <div className='flex flex-col gap-2'>
        <Button
          disabled={loading}
          size='sm'
          variant={'outline'}
          onClick={async () => {
            setLoading(true);
            try {
              const coverUrl = await genTemplateCover(
                worksDetail.id,
                worksDetail.uid?.toString() || '',
                useDynamicCover ? '动态' : '静态'
              );
              setCover(coverUrl);
              toast.success('封面重新生成成功');
            } catch (error: any) {
              console.error('生成封面失败:', error);
              toast.error(error?.message || '生成封面失败，请重试');
            } finally {
              setLoading(false);
            }
          }}
        >
          {!loading ? '重新生成封面' : '重新生成封面中...'}
        </Button>
        <Button
          size='sm'
          variant={'outline'}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            showSelector({
              onSelected: async (params: any) => {
                console.log('params', params);
                setCover(cdnApi(params.ossPath));
              },
              type: 'picture',
            });
          }}
        >
          本地上传
        </Button>
        <Button
          size='sm'
          variant={'outline'}
          disabled={!cover}
          onClick={async () => {
            if (!cover) {
              return;
            }
            onCoverChange?.(cover);
          }}
        >
          确定修改
        </Button>
      </div>
    </div>
  );
};

export default CoverManager;
