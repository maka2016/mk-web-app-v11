import { DebounceClass } from '@mk/utils';
import clas from 'classnames';
import React from 'react';
import { CompLoader } from '../../components/CompLoader';
import ViewerRenderer from '../../components/ViewerRenderer';
import { getViewerDataHelper } from '../../utils/getViewerRenderData';
// import Background from "@/components/Background"
import { getWorksDetailStatic } from '@mk/services';
import { IWorksData } from '@mk/works-store/types';
import { getCanvasScale } from '../../utils/scale';
import { handleWidgetDidLoaded } from '../../utils/widget-loaded-manager';

// import { ViewerSDKProps } from '@mk/widgets-bridge-sdk/types'

const debounce = new DebounceClass();

interface H5ViewerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  isActivePage: boolean;
  /** 是否当前展示页面 */
  isShowPage: boolean;
  useAnimate: boolean;
  worksData: IWorksData;
  pageIndex: number;
  // visible: boolean
  /** 页面完成加载 */
  onPageLoaded: (pageIndex: number) => void;
  // onPageVisibleChange?: () => void
}

class H5Viewer extends React.Component<H5ViewerProps> {
  viewerRef = React.createRef<ViewerRenderer>();

  state = {
    loaded: false,
  };

  get viewerDataHelper() {
    const { worksData, pageIndex } = this.props;
    return getViewerDataHelper(worksData, pageIndex);
  }

  pageLoaded = () => {
    this.setState({ loaded: true });
  };

  widgetDidLoaded = (compId: string, mark = '') => {
    const { pageIndex } = this.props;
    const { widgetRelyInfo, compArr } = this.viewerDataHelper;
    const elemLayer = compArr.find(item => item.id === compId);
    if (elemLayer && /grid/gi.test(elemLayer.type)) {
      // console.log('MkGridV2', compId, elemLayer)
      handleWidgetDidLoaded({
        pageIndex,
        compId: compId,
        shouldLoadedCount: 1,
        onAllWidgetLoaded: () => {
          console.log('onGridModeAllWidgetLoaded, page', pageIndex);
          this.pageLoaded();
          this.props.onPageLoaded?.(pageIndex);

          debounce.cancel();
        },
      });
    }
    return;
  };
  renderCanvasItem = (compConfig: any) => {
    const { id, idx, type, attrs, body } = compConfig;
    const {
      pageIndex,
      useAnimate = true,
      isActivePage,
      worksData,
      isShowPage,
    } = this.props;
    const { getContainerInfo, canvaInfo } = this.viewerDataHelper;
    const pageInfo = worksData.canvasData.content.pages[pageIndex];
    const containerInfo = getContainerInfo(id) || {};

    return (
      <CompLoader
        key={compConfig.id}
        pageInfo={{
          ...(pageInfo || {}),
          pageIndex,
        }}
        isActivePage={isActivePage}
        isShowPage={isShowPage}
        wrapper={child => child}
        lifecycle={
          {
            didLoaded: (_id = id) => {
              this.widgetDidLoaded(_id, `${type}`);
              // // 防止重复加载
              // if (!this.compLoadedList[_id]) {
              //   this.compLoadedList[_id] = true
              // } else {
              //   // console.log(_id)
              // }
            },
            didMount: () => {},
          } as any
        }
        id={id}
        elementRef={type}
        contentProps={attrs}
        getContainerInfo={getContainerInfo}
        body={attrs?.body || body}
        canvaInfo={canvaInfo}
      />
    );
  };
  render() {
    const { pageIndex, worksData, isActivePage } = this.props;
    const { canvaInfo, compArr, getBgData, width, height } =
      this.viewerDataHelper;
    const pageInfo = worksData.canvasData.content.pages[pageIndex];
    const pageLength = worksData.canvasData.content.pages.length;
    const worksDetail = getWorksDetailStatic() as any;
    const isGridMode =
      worksDetail.specInfo?.is_flat_page || worksDetail.flatPage;
    const contentBoxStyle = {
      width: '100%',
      height: isGridMode ? 'auto' : '100%',
      zIndex: isActivePage ? pageLength + 10 : pageIndex + 1,
    };

    return (
      <ViewerRenderer
        ref={this.viewerRef}
        elemItemsTree={compArr}
        pageData={pageInfo}
        pageIndex={pageIndex}
        className={clas('viewer_canvas_content')}
        width={'100%'}
        height={'auto'}
        loadForm={false}
        style={contentBoxStyle}
        itemRenderer={this.renderCanvasItem}
        scale={getCanvasScale()}
      ></ViewerRenderer>
    );
  }
}
export default H5Viewer;
