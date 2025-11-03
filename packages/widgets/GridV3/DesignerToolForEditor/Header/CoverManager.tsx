import { Button } from '@workspace/ui/components/button';
import { useState } from 'react';
import { deepClone } from '@mk/utils';
import { updateTemplateCover } from './services';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';

const CoverManager = () => {
  const { editorSDK } = useGridContext();
  const worksStore = editorSDK?.fullSDK;
  const [loading, setLoading] = useState(false);
  const cover = worksStore?.worksDetail.cover;
  console.log('cover', deepClone(worksStore?.worksDetail));

  if (!worksStore?.worksDetail.id) {
    return null;
  }

  return (
    <div className='p-4'>
      {cover ? (
        <img src={cover} alt='' />
      ) : (
        <div>
          <p>暂无封面</p>
        </div>
      )}

      <Button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          await updateTemplateCover(
            worksStore?.worksDetail.id,
            worksStore?.worksDetail.uid?.toString() || ''
          );
          setLoading(false);
          toast.success('封面重新生成成功，重新刷新页面可以看到最新的封面');
        }}
      >
        {!loading ? '重新生成封面' : '重新生成封面中...'}
      </Button>
    </div>
  );
};

export default CoverManager;
