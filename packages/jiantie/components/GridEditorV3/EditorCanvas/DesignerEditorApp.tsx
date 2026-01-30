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

  return (
    <div
      className='h-dvh root_editor_container flex flex-col'
      id='designer_canvas_container_layout'
    >
      <CanvasAutoLayout readonly={false} worksId={worksId} />
    </div>
  );
};

export default observer(EditorApp);
