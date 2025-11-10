import { observer } from 'mobx-react';
import React, { useRef } from 'react';
import { useWorksStore } from '../../useStore';
import './canvas.scss';
import PageCanvas from './pageCanvas';
interface Props {
  /** 缩放 */
  scale?: number;
  /** 是否只读模式 */
  readonly?: boolean;
  navigationIndex?: number;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const CanvasAutoLayout: React.FC<Props> = (props: Props) => {
  const worksStore = useWorksStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    props.onMouseDown?.(e);
  };

  // const renderWrapper = (child: any) => {
  //   return (
  //     <div
  //       ref={containerRef}
  //       onClick={props.onClick}
  //       onMouseDown={onMouseDown}
  //       id={props.navigationIndex == null ? "id-canvas" : ""}
  //       className={`canva_operator_area canvas_box auto_layout_canvas overflow-hidden flex-1`}
  //     >
  //       <div id="id-canvas-scroll">
  //         <div className="canvas_mask_content">
  //           <div className="relative canvas_content_box" ref={contentRef}>
  //             <div className="canvas_content_parent">{child}</div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // };

  const renderChild = () => {
    const { scale, readonly, navigationIndex } = props;
    const data = worksStore.worksData;
    const { pages } = data.canvasData.content;

    // 长页平铺页面
    return (
      <>
        {pages.map((page, index) => (
          <PageCanvas
            key={`${page.id}`}
            navigationIndex={index}
            scale={scale}
            readonly={readonly}
          />
        ))}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      onClick={props.onClick}
      onMouseDown={onMouseDown}
      id={props.navigationIndex == null ? 'id-canvas' : ''}
      className={`canva_operator_area canvas_box auto_layout_canvas flex-1`}
    >
      {/* <div id="id-canvas-scroll">{renderChild()}</div> */}
      {renderChild()}
    </div>
  );

  // return <>{renderWrapper(renderChild())}</>;
};

export default observer(CanvasAutoLayout);
