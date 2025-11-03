import { queryToObj } from '@mk/utils';
import {
  CanvaInfo,
  ContainerInfo,
  PlatformCompProps,
} from '@mk/widgets-bridge-sdk/types';
import GridV3Comp from '@/components/GridV3/comp';
import { LayerElemItem, WorksPage } from '@mk/works-store/types';
import classnames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { LoadWidget } from '../../utils/helper';
import { getViewerSDK } from '../../utils/viewerSDK';
import { getWidgetMetaColl } from '../../utils/widget-metadata';

interface CompLoaderProps {
  wrapper?: (children: any) => any;
  elementRef: string;
  contentProps: any;
  lifecycle: PlatformCompProps['lifecycle'];
  id: string;
  body?: LayerElemItem[];
  canvaInfo: CanvaInfo;
  pageInfo: WorksPage & { pageIndex: number };
  getContainerInfo: (params: any) => ContainerInfo;
  containerInfo?: ContainerInfo;
  isActivePage?: boolean;
  isShowPage?: boolean;
}

interface PlatformCompPropsExtend extends PlatformCompProps {
  body?: LayerElemItem[];
  getContainerInfo: (params: any) => ContainerInfo;
  widgetMeta: any;
}

/**
 * 编辑器与组件之间的对接的组件
 */
export const CompLoader: React.FC<CompLoaderProps> = ({
  getContainerInfo,
  wrapper,
  elementRef,
  contentProps,
  containerInfo,
  lifecycle,
  id,
  body,
  canvaInfo,
  pageInfo,
  isActivePage,
  isShowPage,
}) => {
  const [debugMode, setDebugMode] = useState(false);
  const isScreenshot = queryToObj().screenshot === 'true';

  /** 组件是否加载完成过 */
  const _containerInfo = (containerInfo || getContainerInfo(id)) as
    | ContainerInfo
    | undefined;
  const {
    visibility,
    disabled = false,
    maskImage,
  } = _containerInfo || ({} as any);

  const _canvaInfo = {
    ...canvaInfo,
    scaleRate: 1,
  };

  const widgetMeta = getWidgetMetaColl(elementRef);
  const viewerApply = widgetMeta?.componentMeta?.viewerApply;
  const WidgetPlugin = LoadWidget<PlatformCompPropsExtend>(elementRef);
  const compLoaderRef = useRef<HTMLDivElement>(null);

  const renderable = !!elementRef && visibility && !disabled;

  useEffect(() => {
    if (!renderable) {
      lifecycle.didLoaded();
    }
    const isDebugMode = queryToObj().hasOwnProperty('dev_dll');
    if (isDebugMode) {
      setDebugMode(true);
    }
  }, [renderable]);

  const viewewSdkFC = getViewerSDK();

  if (/GridV3/.test(elementRef)) {
    return (
      <GridV3Comp
        id={id}
        widgetState={{}}
        viewerSDK={viewewSdkFC as any}
        controledValues={contentProps}
        canvaInfo={canvaInfo}
        containerInfo={_containerInfo || ({} as any)}
        pageInfo={pageInfo}
        lifecycle={lifecycle}
        readonly={true}
        getWorksData={viewewSdkFC.getWorksData}
        isActivePage={isActivePage}
        isShowPage={isShowPage}
      />
    );
  }

  let resChild = null;

  const hideElement = [
    'MkBaoMingV2',
    'MkPinTuan',
    'MkHuiZhi',
    'MkGift',
    'MkBulletScreen_v2',
  ];

  if (!hideElement.includes(elementRef)) {
    if (isScreenshot) {
      return null;
    }
    resChild =
      isActivePage && renderable && !!WidgetPlugin && !!_containerInfo ? (
        <WidgetPlugin
          id={id}
          key={id}
          pageInfo={pageInfo}
          widgetState={{}}
          getWorksData={viewewSdkFC.getWorksData}
          body={body}
          widgetMeta={widgetMeta}
          canvaInfo={_canvaInfo}
          containerInfo={_containerInfo}
          getContainerInfo={getContainerInfo}
          controledValues={contentProps}
          viewerSDK={viewewSdkFC as any}
          lifecycle={lifecycle}
          isActivePage={isActivePage}
          isShowPage={isShowPage}
        ></WidgetPlugin>
      ) : null;
  }

  return (
    <div
      ref={compLoaderRef}
      data-name={elementRef}
      className={classnames([
        'canvas_item',
        viewerApply?.interaction && 'interaction',
        viewerApply?.scrollable && 'scrollable',
      ])}
      id={id}
      style={{
        // 组件是否可交互，通过组件 meta 的 viewerApply.interaction 判断
        pointerEvents:
          debugMode ||
          !!viewerApply?.interaction ||
          !!_containerInfo?.action?.enable
            ? 'all'
            : 'none',
        maskImage: maskImage ? maskImage : undefined,
        WebkitMaskImage: maskImage ? maskImage : undefined,
      }}
    >
      {wrapper ? wrapper(resChild) : resChild}
    </div>
  );
};
