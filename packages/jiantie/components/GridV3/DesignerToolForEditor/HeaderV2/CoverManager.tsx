import { cdnApi, getAppId } from '@mk/services';
import { deepClone } from '@mk/utils';
import { Button } from '@workspace/ui/components/button';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { onScreenShot } from '../../shared';
import { genTemplateCover } from './services';

const CoverManager = ({
  onCoverChange,
  isTemplate,
}: {
  onCoverChange?: (cover: string | undefined) => void;
  isTemplate?: boolean;
}) => {
  const { editorSDK, editorCtx } = useGridContext();
  const worksStore = editorSDK?.fullSDK;
  const [loading, setLoading] = useState(false);
  const [cover, setCover] = useState(worksStore?.worksDetail.cover);
  console.log('cover', deepClone(worksStore?.worksDetail));

  if (!worksStore?.worksDetail.id) {
    return null;
  }

  return (
    <div className='p-4'>
      <div className='mb-4 flex justify-center'>
        {cover ? (
          <img src={cover} alt='' width={200} />
        ) : (
          <div>
            <p>暂无封面</p>
          </div>
        )}
      </div>
      <div className='flex items-center gap-2'>
        <Button
          disabled={loading}
          size='sm'
          variant={'outline'}
          onClick={async () => {
            setLoading(true);
            if (isTemplate) {
              // html, video规格需要是gif
              const isVideo =
                worksStore.worksDetail.specInfo.export_format?.includes(
                  'video'
                );
              const coverUrl = await genTemplateCover(
                worksStore?.worksDetail.id,
                worksStore?.worksDetail.uid?.toString() || '',
                isVideo ? '动态' : '静态'
              );
              setCover(coverUrl);
            } else {
              const coverUrl = await onScreenShot({
                id: worksStore?.worksDetail.id,
                width: 540,
                height: 960,
                appid: getAppId(),
              });
              setCover(coverUrl[0]);
            }
            setLoading(false);
            toast.success('封面重新生成成功');
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
            editorCtx?.utils.showSelector({
              onSelected: async (params: any) => {
                console.log('params', params);
                setCover(cdnApi(params.ossPath));
              },
              payload: {},
              type: 'picture',
            });
          }}
        >
          本地上传
        </Button>
        <span className='flex-1'></span>
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
