import GridV3Comp from '@/components/GridEditorV3/AppV2';
import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import React from 'react';
import { SerializedWorksEntity } from '../../utils';

interface Props {
  worksData: IWorksData;
  worksDetail: SerializedWorksEntity;
}

const CanvasAutoLayoutForViewer: React.FC<Props> = ({
  worksData,
  worksDetail,
}: Props) => {
  return (
    <div className='viewer_canvas_content h-full w-full'>
      <GridV3Comp
        readonly={true}
        worksDetail={worksDetail}
        worksData={worksData}
        worksId={worksDetail.id}
      />
    </div>
  );
};

export default CanvasAutoLayoutForViewer;
