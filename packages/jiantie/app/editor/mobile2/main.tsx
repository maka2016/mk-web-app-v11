'use client';
import { observer } from 'mobx-react';
import CanvasAutoLayout from '../SimpleEditor/CanvasAutoLayout';
import { useWorksStore } from '../useStore';
import Watermark from './Watermark';

interface Props {
  worksId: string;
  onCreate: (nextWorksId: string) => void;
}

const MobileEditor2 = (props: Props) => {
  const { worksId } = props;
  const worksStore = useWorksStore();
  const isPoster =
    worksStore.worksDetail.specInfo.export_format?.includes('image');

  if (!worksStore) {
    return <div className=''>loading...</div>;
  }

  return (
    <div
      className='relative h-full w-full overflow-hidden flex flex-col'
      id='editor_container'
    >
      <div
        className='overflow-y-auto overflow-x-hidden relative z-10 flex flex-col h-full pt-12 pb-24'
        id='designer_scroll_container'
      >
        <div
          className='flex flex-col flex-1 justify-center items-center relative'
          id='designer_canvas_container'
        >
          <div
            className='h-full w-full flex'
            id='designer_canvas_container_inner'
          >
            <CanvasAutoLayout readonly={false} />
          </div>
        </div>
      </div>
      {isPoster && <Watermark worksId={worksId} />}
    </div>
  );
};

export default observer(MobileEditor2);
