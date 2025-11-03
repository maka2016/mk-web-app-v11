import { getIsFlatPages } from '@mk/services';
import { toJS } from 'mobx';
import React, { useCallback } from 'react';
import { useWorksStore } from '../../useStore';
import CanvasItem from './CanvasItem';
import ViewerRenderer from './ViewerRenderer';
import { RenderElemItemsTree } from './ViewerRenderer/types';

interface Props {
  /** 缩放 */
  scale?: number;
  /** 是否只读模式 */
  readonly?: boolean;
  navigationIndex: number;
  onCanvasReady?: () => void;
}

const PageCanvas: React.FC<Props> = ({ scale, readonly, navigationIndex }) => {
  const worksStore = useWorksStore();
  const pageIndex = navigationIndex;

  const getElemItemsTree = useCallback(() => {
    const withFixLayer =
      !readonly && (!getIsFlatPages() || (getIsFlatPages() && pageIndex === 0));
    const layers = worksStore.getPageLayers(pageIndex, withFixLayer as any);
    return layers.map((item, idx) => ({
      idx,
      id: item.elemId,
      type: item.elementRef,
      attrs: toJS(item.attrs),
    }));
  }, [readonly, pageIndex, worksStore]);

  const elemItemsTree: RenderElemItemsTree = getElemItemsTree();

  const onCanvaItemDidLoaded = () => {
    // this.widgetDidLoaded(id)
  };

  const renderCanvasItem = (com: {
    id: string;
    type: string;
    attrs: any;
    idx: number;
  }) => {
    const { id, type, attrs, idx } = com;
    // const isReady = !!worksStore.widgetLoadState[type];
    // if (!isReady) return <div data-tip="loading..." key={id}></div>;
    const dict = worksStore.worksData.positionLink[id];
    if (dict != null) {
      return (
        <CanvasItem
          key={id}
          idx={idx}
          comId={id}
          name={type}
          contentProps={attrs}
          readonly={readonly}
          didLoaded={onCanvaItemDidLoaded}
          navigationIndex={navigationIndex}
        />
      );
    }
    return <span data-tip='error' data-error-elem-id={id} key={id}></span>;
  };

  const isActivePage = worksStore.pageIndex === navigationIndex;

  const pageInfo = {
    ...worksStore.getPage(pageIndex),
    pageIndex,
  };
  toJS(worksStore.worksData.style);
  toJS(worksStore.widgetLoadState);
  const { width, height } = pageInfo;

  return (
    <ViewerRenderer
      key={JSON.stringify(worksStore.widgetLoadState)}
      scale={scale || worksStore.scale}
      width={width}
      height={'fit-content'}
      id={pageInfo.id}
      onClick={() => worksStore.setPageIndex(navigationIndex)}
      pageInfo={pageInfo}
      elemItemsTree={elemItemsTree}
      itemRenderer={renderCanvasItem}
      readonly={readonly}
      className={isActivePage ? 'active' : ''}
    ></ViewerRenderer>
  );
};

export default PageCanvas;
