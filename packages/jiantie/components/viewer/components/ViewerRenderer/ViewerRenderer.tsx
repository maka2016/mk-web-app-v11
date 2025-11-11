import { WorksPage } from '@mk/works-store/types';
import clsn from 'classnames';
import React from 'react';

const LoadedWidgetCache = {
  MkCombination: true,
};

interface State {
  loadedWidgetCache: Record<string, any>;
}

interface CompConfig {
  idx: number;
  /** elementRef */
  type: string;
  /** attrs */
  attrs: any;
  /** id */
  id: string;
}

export interface ViewerRendererProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** 根结点的包装函数 */
  rootWrapper?: (child: any) => any;
  /** 组件列表 */
  elemItemsTree: CompConfig[];
  /** 画布宽 */
  width: string | number;
  /** 画布高 */
  height: string | number;
  // widgetRely: Record<string, any>
  /** 画布缩放比例 */
  scale: number;
  pageData: WorksPage;
  pageIndex: number;
  itemRenderer: (compConfig: CompConfig) => any;
  /** 给到画布容器内部的 child */
  contentChild?: React.ReactNode;
  /** 是否加载表单组件 */
  loadForm?: boolean;
  /** 所有组件都加载完成后执行的回调 */
  /** 元素截图 */
  isCompScreenshot?: boolean;
  useZoomForIOS?: boolean;
  contentStyle?: React.CSSProperties;
}

export default class ViewerRenderer extends React.Component<
  ViewerRendererProps,
  State
> {
  /** 组件数量 */
  // widgetCount = 2

  /** 组件 didLoaded 的数量 */
  // widgetDidLoadedCount = 0

  contentRef = React.createRef<HTMLDivElement>();

  constructor(props: ViewerRendererProps) {
    super(props);
    this.state = {
      loadedWidgetCache: LoadedWidgetCache,
    };
  }

  get contentStyle(): React.CSSProperties {
    const {
      pageData,
      width,
      height,
      scale = 1,
      useZoomForIOS = true,
      contentStyle = {},
    } = this.props;
    const result = {
      ...contentStyle,
      // width: `${+width}px`,
      // height: `${+height}px`,
      // transformOrigin: `0 0`,
      // transform: `scale(var(--canvas-scale))`,
      // zoom: useZoomForIOS && isIOS() ? scale : 1,
      // transform:
      //   scale === 1
      //     ? undefined
      //     : `scale(${useZoomForIOS && isIOS() ? 1 : scale})`,
      // transformStyle: pageData.dethOfFieldAnimation ? "preserve-3d" : undefined,
    } as React.CSSProperties;
    return result;
  }

  renderNormalCanvasItems = () => {
    const { elemItemsTree, itemRenderer } = this.props;

    return elemItemsTree.map(com => {
      return itemRenderer(com);
    });
  };

  renderContent = () => {
    const {
      pageData,
      children,
      contentChild,
      className,
      style,
      elemItemsTree,
      pageIndex,
      width,
      height,
      loadForm,
      itemRenderer,
      ...otherProps
    } = this.props;
    return (
      <div
        {...otherProps}
        className={clsn(className, 'canvas_content_box')}
        style={Object.assign(
          {},
          style,
          pageData.dethOfFieldAnimation
            ? {
                perspective: `${pageData.dethOfFieldAnimation.perspective}px`,
              }
            : {}
        )}
      >
        {children}
        <div
          className='canvas_content'
          style={this.contentStyle}
          ref={this.contentRef}
        >
          {contentChild}
          {this.renderNormalCanvasItems()}

          {/* <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              zIndex: 100,
            }}
            className='flex justify-center items-center gap-2 text-[11px] font-medium uppercase tracking-[0.32em] text-white/80'
          >
            <img
              src='https://res.maka.im/assets/jiantie/Frame%201321318475.png'
              alt='logo'
              className='w-full  '
            />
          </div> */}
        </div>
      </div>
    );
  };

  render() {
    const { rootWrapper } = this.props;
    return rootWrapper
      ? rootWrapper(this.renderContent())
      : this.renderContent();
  }
}
