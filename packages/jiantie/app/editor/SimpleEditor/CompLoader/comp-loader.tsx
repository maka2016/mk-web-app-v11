import { getWidgetMeta } from '@mk/services';
import { LoadWidget } from '@mk/utils';
import { CommonFormProps, PlatformCompProps } from '@mk/widgets-bridge-sdk';
import GridV3Comp from '@/components/GridV3/comp';
import { LayerElemItem } from '@mk/works-store/types';
import clas from 'classnames';
import React from 'react';
import { useWorksStore } from '../../useStore';
import { editorContext } from '../editor-ctx';

interface CompLoaderProps {
  readonly?: boolean;
  elementRef: string;
  widgetState: any;
  contentProps: any;
  lifecycle: PlatformCompProps['lifecycle'];
  id: string;
  body?: LayerElemItem[];
  canvaInfo: CommonFormProps['canvaInfo'];
  containerInfo: CommonFormProps['containerInfo'];
  pageInfo: PlatformCompProps['pageInfo'];
}

interface PlatformCompPropsExtend {
  body?: LayerElemItem[];
  readonly?: boolean;
}

/**
 * 编辑器与组件之间的对接的组件
 */
export const CompLoader: React.FC<CompLoaderProps> = ({
  elementRef,
  readonly = false,
  contentProps,
  lifecycle,
  id,
  body,
  canvaInfo,
  containerInfo,
  widgetState,
  pageInfo,
}) => {
  const store = useWorksStore();
  const metadata = getWidgetMeta(elementRef);

  if (!metadata) {
    console.error('找不到 metadata', metadata, elementRef);
    return null;
  }

  const { canvasInteraction } = metadata.editorApply;

  const editorSDK = store.getEditorSDK(id);

  if (!editorSDK) {
    throw new Error('请传入 editorSDK');
  }

  const { maskImage } = containerInfo as any;
  if (elementRef === 'GridV3') {
    return (
      <GridV3Comp
        id={id}
        widgetState={widgetState}
        controledValues={contentProps}
        canvaInfo={canvaInfo}
        containerInfo={containerInfo}
        pageInfo={pageInfo}
        lifecycle={lifecycle}
        readonly={readonly}
        editorCtx={editorContext}
        editorSDK={editorSDK}
        getWorksData={() => store.worksData}
      />
    );
  }

  const hideElement = [
    'MkBaoMingV2',
    'MkPinTuan',
    'MkHuiZhi',
    'MkGift',
    'Text',
    'Picture',
    'MkBulletScreen_v2',
  ];

  if (hideElement.includes(elementRef)) {
    return <></>;
  }

  const WidgetPlugin = LoadWidget<PlatformCompProps & PlatformCompPropsExtend>(
    elementRef
  );
  return WidgetPlugin ? (
    <div
      style={Object.assign(
        { width: '100%', height: '100%', overflow: 'hidden' },
        maskImage ? { maskImage, WebkitMaskImage: maskImage } : {}
      )}
      className={clas(
        'canvas_item_normal',
        !canvasInteraction && 'no_editing_form'
      )}
    >
      <WidgetPlugin
        id={id}
        widgetState={widgetState}
        body={body}
        getWorksData={() => store.worksData}
        readonly={readonly}
        editorCtx={editorContext}
        editorSDK={editorSDK}
        canvaInfo={canvaInfo}
        containerInfo={containerInfo}
        controledValues={contentProps}
        lifecycle={lifecycle}
        pageInfo={pageInfo}
      />
    </div>
  ) : (
    <></>
  );
};
