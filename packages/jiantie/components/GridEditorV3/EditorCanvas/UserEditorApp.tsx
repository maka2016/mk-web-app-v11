'use client';

import { Loading } from '@workspace/ui/components/loading';
import { observer } from 'mobx-react';
import { useSearchParams } from 'next/navigation';
import CanvasAutoLayout from './CanvasAutoLayout';

const EditorApp = () => {
  const searchParams = useSearchParams();
  const worksId = searchParams.get('works_id');

  if (!worksId) {
    return (
      <div className='flex items-center justify-center p-4'>
        <Loading />
      </div>
    );
  }

  return <CanvasAutoLayout readonly={false} worksId={worksId} />;
};

export default observer(EditorApp);
