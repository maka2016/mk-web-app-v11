import { getIsFlatPages } from '@mk/services';
import { WorksPage } from '@mk/works-store/types';
import cls from 'classnames';
import React, { CSSProperties } from 'react';
import { RenderElemItem, RenderElemItemsTree } from './types';

interface ViewerRendererProps extends React.HTMLAttributes<HTMLDivElement> {
  elemItemsTree: RenderElemItemsTree;
  width: any;
  height: any;
  scale: number;
  itemRenderer: (compConfig: RenderElemItem, totalWidget: number) => any;
  contentChild?: React.ReactNode;
  readonly?: boolean;
  pageInfo: WorksPage & {
    pageIndex: number;
  };
}

const ViewerRenderer: React.FC<ViewerRendererProps> = props => {
  const {
    width,
    height,
    scale,
    children,
    contentChild,
    className,
    readonly,
    pageInfo,
    id,
    elemItemsTree,
    itemRenderer,
    ...other
  } = props;

  const contentStyle = (): CSSProperties => {
    const result = {
      // width: `${width}px`,
      // height: "auto",
      width: '100%',
      // height: 'fit-content',
      // transform: `scale(${scale})`,
      // transformOrigin: `0 0`,
      // transformStyle: pageInfo.dethOfFieldAnimation ? "preserve-3d" : undefined,
    } as CSSProperties;
    if (readonly) {
      result.transformOrigin = '50% 50%';
    }
    return result;
  };

  const renderCanvasItems = () => {
    return elemItemsTree.map(com => {
      return itemRenderer(com, elemItemsTree.length);
    });
  };

  return (
    <div
      {...other}
      // style={!readonly ? contentBoxStyle : undefined}
      style={contentStyle()}
      className={cls([
        'page_content',
        className,
        getIsFlatPages() && 'reaction',
      ])}
      id={`page_content_${pageInfo.pageIndex}`}
      data-page-id={id}
    >
      {contentChild}
      {renderCanvasItems()}
    </div>
  );
};

export default ViewerRenderer;
