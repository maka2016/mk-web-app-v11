import { cdnApi } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { getBlockCover } from '../../DesignerToolForEditor/ThemePackManager/services';

interface CoverManagerProps {
  coverUrl?: string;
  setCoverUrl: (url: string) => void;
  blockId?: string;
  editorCtx: any;
}

export const CoverManager = ({
  coverUrl,
  setCoverUrl,
  blockId,
  editorCtx,
}: CoverManagerProps) => {
  const [coverLoading, setCoverLoading] = useState(false);

  return (
    <div className='flex items-start gap-2'>
      {coverUrl ? (
        <img src={coverUrl} width={100} alt='cover' />
      ) : (
        <div className='w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden'>
          <ImageIcon name='image' size={32} className='text-gray-400' />
        </div>
      )}
      <div className='gap-2 flex flex-col'>
        <Button
          size='sm'
          variant={'outline'}
          disabled={coverLoading}
          onClick={async e => {
            e.stopPropagation();
            e.preventDefault();
            if (!blockId) {
              toast.error('请先选中一个模块');
              return;
            }
            setCoverLoading(true);
            const tempUrl = await getBlockCover(blockId);
            if (!tempUrl) {
              toast.error('生成封面失败，请重试');
              return;
            }
            setCoverUrl(tempUrl);
            setCoverLoading(false);
          }}
        >
          {coverLoading ? '生成封面中...' : '生成封面'}
        </Button>
        <Button
          size='sm'
          variant={'outline'}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            editorCtx.utils.showSelector({
              onSelected: async (params: any) => {
                console.log('params', params);
                setCoverUrl(cdnApi(params.ossPath));
              },
              payload: {},
              type: 'picture',
            });
          }}
        >
          本地上传
        </Button>
      </div>
    </div>
  );
};
