import GridV3Comp from '@/components/GridEditorV3/AppV2';
import React from 'react';

interface Props {
  /** 是否只读模式 */
  readonly?: boolean;
  worksId: string;
}

const CanvasAutoLayout: React.FC<Props> = (props: Props) => {
  return (
    <div
      id={'id-canvas'}
      className={`canva_operator_area canvas_box auto_layout_canvas flex justify-center z-10 flex-1`}
    >
      <GridV3Comp readonly={props.readonly || false} worksId={props.worksId} />
    </div>
  );
};

export default CanvasAutoLayout;
