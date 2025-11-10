import { getPermissionData } from '@mk/services';
import { LoadWidget, mergeDeep, queryToObj } from '@mk/utils';
import MkBulletScreen from '@mk/widgets/MkBulletScreen_v2/comp';
import MkHuiZhi from '@mk/widgets/MkHuiZhi/comp';
import MkImageGroup from '@mk/widgets/MkImageGroup_v2/comp';
import MkMapComp from '@mk/widgets/MkMapV4/comp';
import { EditorSDK, IPositionLink, LayerElemItem } from '@mk/works-store/types';
import clas from 'classnames';
import React, { useRef, useState } from 'react';
import { GridProps, GridState } from '../shared';
import {
  bgImageChangeToWebp,
  blockStyleFilter,
  takeXFromMarginOrPadding,
} from '../shared/utils';
import AbsoluteElemContainer from './components/AbsoluteElemContainerV1';
import ImgLiteComp from './components/ImgLiteComp';
import TextEditor from './components/TextEditor';
import ContainerWithBg from './ContainerWithBg';
import { useAppAnimate } from './hooks/useAnimate';
import { useAppAnimate2 } from './hooks/useAnimate2';
import './index.scss';
import LayoutWrapper from './layoutWrapper';
import './lib/animate.css';
import { useGridContext } from './provider';
import { clearUndefinedKey } from './utils';

interface WidgetItemRendererProps {
  readyToPlayAnimation?: boolean;
  editable?: boolean;
  isActive?: boolean;
  isAbsoluteElem?: boolean;
  elemId: string;
  layer: LayerElemItem;
  layerLink?: IPositionLink;
  canvaInfo?: any;
  pageInfo?: any;
  readonly: boolean;
  viewerSDK?: any;
  containerInfo?: any;
  editorSDK?: EditorSDK<GridProps, GridState>;
  onElemClick?: (
    e: React.MouseEvent<HTMLDivElement>,
    { targetElemId }: { targetElemId: string }
  ) => void;
  didLoaded?: (compId: string) => void;
}

export const takeLayoutWrapperStyle = (style: React.CSSProperties = {}) => {
  return {
    width: style.width,
    height: style.height,
    zIndex: style.zIndex,
    placeContent: style.placeContent,
    placeItems: style.placeItems,
    placeSelf: style.placeSelf,
    justifyContent: style.justifyContent,
    justifyItems: style.justifyItems,
    justifySelf: style.justifySelf,
    alignContent: style.alignContent,
    alignItems: style.alignItems,
    alignSelf: style.alignSelf,
    gridTemplateColumns: style.gridTemplateColumns,
    opacity: style.opacity,
    gap: style.gap,
    rowGap: style.rowGap,
    columnGap: style.columnGap,
  };
};

export const takeInnerStyle = (style: React.CSSProperties = {}) => {
  const _style = {
    aspectRatio: style.aspectRatio,
    transform: style.transform,
    margin: style.margin,
    padding: style.padding,
    border: style.border,
    borderWidth: style.borderWidth,
    borderColor: style.borderColor,
    borderStyle: style.borderStyle,
    borderImage: style.borderImage,
    borderRadius: style.borderRadius,
    borderImageSource: style.borderImageSource,
    borderImageSlice: style.borderImageSlice,
    borderImageWidth: style.borderImageWidth,
    borderImageOutset: style.borderImageOutset,
    borderImageRepeat: style.borderImageRepeat,
    maskImage: bgImageChangeToWebp(style.maskImage) || undefined,
    WebkitMaskImage: bgImageChangeToWebp(style.maskImage) || undefined,
    WebkitMaskSize: style.maskSize || undefined,
    WebkitMaskPosition: style.maskPosition || undefined,
    WebkitMaskRepeat: style.maskRepeat || undefined,
    // minWidth: style.minWidth,
    maxWidth: style.maxWidth,
    minHeight: style.minHeight,
    maxHeight: style.maxHeight,
    filter: style.filter,
    mixBlendMode: style.mixBlendMode,
    WebkitMixBlendMode: style.mixBlendMode,
  };
  return clearUndefinedKey(_style);
};

export const takeBgAttrs = (style: React.CSSProperties = {}) => {
  const background = String(style.background || '');
  const isBgImg = /url\((.*?)\)/.test(background);
  const attrs = {
    background: style.background,
    writingMode: style.writingMode,
    backgroundImage: isBgImg ? background : style.backgroundImage,
    backgroundSize: style.backgroundSize,
    backgroundPosition: style.backgroundPosition,
    backgroundRepeat: style.backgroundRepeat,
    backgroundAttachment: style.backgroundAttachment,
  };
  return clearUndefinedKey(attrs);
};

/**
 * V1 版本，2025年8月17日已归档，不再修改
 * @deprecated 使用 WidgetItemRendererV2 替代
 */
export const WidgetItemRenderer = (props: WidgetItemRendererProps) => {
  const {
    readyToPlayAnimation = true,
    editable = true,
    isActive = false,
    isAbsoluteElem = false,
    elemId,
    layer,
    layerLink,
    editorSDK,
    canvaInfo = {},
    pageInfo = {},
    containerInfo = {},
    readonly,
    viewerSDK,
    didLoaded,
    onElemClick,
  } = props;
  const {
    gridProps,
    editorCtx,
    widgetState,
    getStyleByTag2,
    worksDetail,
    fullStack,
  } = useGridContext();
  const [screenshotBlock] = useState(queryToObj().screenshot_block);
  const { editingElemId, playAnimationInEditor = false } = widgetState;
  // const { cellsMap } = controledValues;
  // 因为 viewer 没有 editorSDK，所以需要手动获取 layer6
  const hasHyperLink = !!layerLink?.action?.actionAttrs?.link;
  const isActiveElem = elemId === editingElemId;
  const animateQueue = layerLink?.animateQueue || layer.attrs?.animateQueue;
  const animateQueue2 = layerLink?.animateQueue2;
  const [loaded, setLoaded] = useState(false);

  const containerRef = useRef<any>(null);

  /** 主题的默认样式 */
  const styleFromTheme = getStyleByTag2(layerLink?.tag || ('' as any));

  const { isVisible, animationClassName, animationStyle, dataVisible } =
    useAppAnimate({
      animateQueue,
      autoPlay: !screenshotBlock && readyToPlayAnimation && !!viewerSDK,
      onAnimationComplete: () => {},
      containerRef,
    });

  useAppAnimate2({
    elemId,
    animateQueue: animateQueue2,
    autoPlay:
      !screenshotBlock &&
      readyToPlayAnimation &&
      (!!viewerSDK || !!playAnimationInEditor),
    containerRef,
    hasPlayedOnce: !!viewerSDK && !worksDetail?.specInfo?.is_flip_page,
  });

  let compEntity: any = null;
  if (!layer || !layer.elementRef) {
    console.log('layer or layer.elementRef is not exist', layer);
    return compEntity;
  }

  const { elementRef, attrs: currAttr } = layer;
  if (!currAttr) {
    console.log('attrs is not exist', layer);
    return compEntity;
  }

  const getEditorSDKForComp = (_layer: LayerElemItem) => {
    return editorSDK
      ? {
          ...editorSDK,
          getLayer: () => _layer,
          onFormValueChange: (nextAttrs: GridProps) => {
            editorSDK?.changeCompAttr(elemId, nextAttrs);
          },
        }
      : undefined;
  };

  const editorSDKForComp = getEditorSDKForComp(layer);

  if (/container/gi.test(elementRef)) {
    return null;
  } else if (/picture/gi.test(elementRef)) {
    compEntity = (
      <ImgLiteComp
        isAbsoluteElem={isAbsoluteElem}
        attrs={currAttr as any}
        layerLink={layerLink}
        editorSDK={editorSDKForComp as any}
        active={isActiveElem}
        viewerSDK={viewerSDK}
        editorCtx={editorCtx}
        canvaInfo={canvaInfo}
        elemId={layer.elemId}
        didLoaded={() => {
          setLoaded(true);
          didLoaded?.(elemId);
        }}
      />
    );
  } else if (/text/gi.test(elementRef)) {
    const textEditable = !readonly && isActiveElem;
    /** 为了兼容旧的样式设置，实际上需要通过数据清洗来处理 */
    const textAttrs = {
      lineHeight:
        currAttr.lineHeight || currAttr.layoutStyle?.lineHeight || 'inherit',
      writingMode:
        currAttr.writingMode || currAttr.layoutStyle?.writingMode || 'inherit',
      letterSpacing:
        currAttr.letterSpacing ||
        currAttr.layoutStyle?.letterSpacing ||
        'inherit',
      fontFamily:
        currAttr.fontFamily ||
        currAttr.layoutStyle?.fontFamily ||
        styleFromTheme.fontFamily ||
        'inherit',
      fontUrl:
        currAttr.fontUrl ||
        currAttr.layoutStyle?.fontUrl ||
        styleFromTheme.fontUrl ||
        '',
      color:
        currAttr.color ||
        currAttr.layoutStyle?.color ||
        styleFromTheme.color ||
        '',
      fontSize:
        currAttr.fontSize ||
        currAttr.layoutStyle?.fontSize ||
        styleFromTheme.fontSize ||
        '',
    };
    compEntity = (
      <>
        <TextEditor
          elemId={layer.elemId}
          layerLink={layerLink}
          viewerSDK={viewerSDK}
          isActive={isActive}
          layerAttrs={
            blockStyleFilter({
              ...currAttr,
              ...textAttrs,
            }) as any
          }
          didLoaded={() => {
            setLoaded(true);

            didLoaded?.(elemId);
          }}
          readonly={!textEditable}
          editorSDK={editorSDK}
        ></TextEditor>
      </>
    );
  } else {
    const marginX = takeXFromMarginOrPadding(layer.attrs?.layoutStyle?.margin);
    const paddingX = takeXFromMarginOrPadding(
      layer.attrs?.layoutStyle?.padding
    );
    const gridPaddingX = takeXFromMarginOrPadding(
      String(gridProps.style?.padding) || '0'
    );

    const containerW = containerInfo.width
      ? containerInfo.width - marginX - paddingX - gridPaddingX
      : 'auto';

    if (/MkMapV4/gi.test(elementRef)) {
      compEntity = (
        <MkMapComp
          id={layer.elemId}
          editorCtx={editorCtx}
          isActive={isActive}
          widgetState={widgetState}
          editorSDK={editorSDKForComp as any}
          canvaInfo={canvaInfo}
          viewerSDK={viewerSDK}
          containerInfo={
            {
              width: containerW,
              height: 'auto',
            } as any
          }
          getWorksData={{} as any}
          controledValues={currAttr as any}
          pageInfo={pageInfo}
          lifecycle={{
            didMount: (data: any) => editorSDKForComp?.didMount?.(elemId, data),
            didLoaded: () => {
              setLoaded(true);

              didLoaded?.(elemId);
            },
          }}
        />
      );
    } else if (/MkImageGroup_v2/gi.test(elementRef)) {
      compEntity = (
        <MkImageGroup
          id={layer.elemId}
          editorCtx={editorCtx}
          widgetState={widgetState}
          // editorSDK={editorSDKForComp}
          canvaInfo={canvaInfo}
          viewerSDK={viewerSDK}
          containerInfo={
            {
              width: containerW,
              height: 'auto',
            } as any
          }
          getWorksData={{} as any}
          controledValues={currAttr as any}
          pageInfo={pageInfo}
          lifecycle={{
            didMount: (data: any) => editorSDKForComp?.didMount?.(elemId, data),
            didLoaded: () => {
              setLoaded(true);
              didLoaded?.(elemId);
            },
          }}
        />
      );
    } else if (/MkHuiZhi/gi.test(elementRef)) {
      compEntity = (
        <MkHuiZhi
          id={layer.elemId}
          editorCtx={editorCtx}
          widgetState={widgetState}
          // editorSDK={editorSDKForComp}
          canvaInfo={canvaInfo}
          viewerSDK={viewerSDK}
          containerInfo={
            {
              width: containerW,
              height: 'auto',
            } as any
          }
          getWorksData={{} as any}
          controledValues={currAttr as any}
          pageInfo={pageInfo}
          lifecycle={{
            didMount: (data: any) => editorSDKForComp?.didMount?.(elemId, data),
            didLoaded: () => {
              setLoaded(true);
              didLoaded?.(elemId);
            },
          }}
        />
      );
    } else {
      let Comp;
      if (/MkBulletScreen_v2/gi.test(elementRef)) {
        Comp = MkBulletScreen;
      } else {
        Comp = LoadWidget(layer.elementRef);
      }
      if (!Comp) {
        console.log('组件加载失败', layer.elementRef);
        return <></>;
      }

      compEntity = (
        <Comp
          id={layer.elemId}
          editorCtx={editorCtx}
          editorSDK={editorSDKForComp}
          canvaInfo={canvaInfo}
          active={isActiveElem}
          viewerSDK={viewerSDK}
          containerInfo={{
            width: containerW,
            height: 'auto',
          }}
          controledValues={currAttr as any}
          pageInfo={pageInfo}
          lifecycle={{
            didMount: (data: any) => editorSDKForComp?.didMount?.(elemId, data),
            didLoaded: () => {
              setLoaded(true);
              // console.log('Comp', layer, `pageIndex_${pageIndex}`, childCount.current)
              didLoaded?.(elemId);
            },
          }}
        />
      );
    }
  }

  /**
   * attrs.layoutStyle 是统一设置的元素的布局样式属性，
   */
  const layoutStyleForWrapper = clearUndefinedKey(
    mergeDeep(
      {
        justifySelf: 'center',
        alignSelf: 'center',
        margin: 0,
        padding: 0,
      },
      currAttr.layoutStyle,
      currAttr.layoutStyle?.transformObject
        ? {
            transform: `rotate(${currAttr.layoutStyle?.transformObject?.rotate}deg)`,
          }
        : {}
    ) as React.CSSProperties
  );
  if (elemId === 'MmeGBaWdbK') {
    // console.log("layoutStyleForWrapper", layoutStyleForWrapper);
  }

  const backgroundGroup =
    currAttr.backgroundGroup || (layoutStyleForWrapper as any)?.backgroundGroup;
  const stackBg = (currAttr?.layoutStyle as any)?.type === 'stack';
  /** 背景样式，如果是层叠，则使用背景组件渲染，否则使用innerElem渲染 */
  const bgAttrs = {
    ...takeBgAttrs(layoutStyleForWrapper),
    backgroundGroup,
  } as any;

  const hideComponents = ['MkMapV3'];
  if (layer?.elementRef === 'MkHuiZhi' && !layer.attrs.inLayout) {
    return null;
  }
  if (
    (layer.attrs.show === false ||
      layer.attrs.showType === 0 ||
      hideComponents.includes(layer?.elementRef)) &&
    !getPermissionData().materialProduct
  ) {
    return null;
  }

  /** 用于组件响应自身布局的样式 */
  const wrapperStyle = blockStyleFilter({
    ...takeLayoutWrapperStyle({ ...styleFromTheme, ...layoutStyleForWrapper }),
    position: 'relative',
    width: layoutStyleForWrapper.width || currAttr.width,
    height: layoutStyleForWrapper.height || currAttr.height,
    // writingMode: currAttr.writingMode || layoutStyleForWrapper.writingMode,
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    padding: 0.1,
    ...animationStyle,
  }) as React.CSSProperties;

  /** 用于组件外观样式 */
  const innerStyle = {
    ...(!stackBg ? bgAttrs : {}),
    ...takeInnerStyle({ ...styleFromTheme, ...layoutStyleForWrapper }),
    writingMode: 'unset',
    position: 'relative',
    zIndex: 2,
    pointerEvents: editable || isActiveElem ? 'auto' : 'none',
    // pointerEvents: isActiveElem ? "auto" : "none",
  } as React.CSSProperties;

  const child = (
    <>
      <ContainerWithBg
        parallelBg={true}
        bgStyle={
          stackBg ? blockStyleFilter(bgAttrs) : ({ backgroundGroup } as any)
        }
        style={blockStyleFilter(innerStyle)}
        elemTag={layerLink?.tag}
        id={`layer_root_${layer.elemId}`}
        data-elem-id={layer.elemId}
        className={clas(
          'Elem innerElem',
          'hover_elem',
          isActiveElem && 'active',
          !editorSDK && hasHyperLink && 'hyper_link',
          `layer_${layer.elemId}`
        )}
      >
        {compEntity}
      </ContainerWithBg>
      {!fullStack && editable && <div className='blink_modal'></div>}
    </>
  );

  if (isAbsoluteElem) {
    return (
      <LayoutWrapper
        component={AbsoluteElemContainer}
        data-editable={editable}
        componentProps={{
          editable,
          widgetState,
          editorSDK,
          layer,
          needResize: true,
        }}
        ref={containerRef}
        key={`${layer.elemId}_${JSON.stringify(animateQueue)}_${layer.attrs._v}`}
        data-hover-title='元素'
        data-hover-domid={`#layer_root_${layer.elemId}`}
        data-actived={isActiveElem}
        style={wrapperStyle}
        id={`elem_wrapper_${layer.elemId}`}
        onClick={e => {
          if (!editorSDK) {
            const actionLink = layerLink?.action?.actionAttrs?.link;
            if (actionLink) {
              window.open(layerLink?.action?.actionAttrs?.link);
            }
            return;
          }
          onElemClick?.(e, { targetElemId: elemId });
        }}
        className={clas(
          animationClassName,
          'ElemWrapper',
          isActiveElem && 'active'
        )}
      >
        {child}
      </LayoutWrapper>
    );
  }
  return (
    <LayoutWrapper
      ref={containerRef}
      key={`${layer.elemId}_${JSON.stringify(animateQueue)}_${layer.attrs._v}`}
      data-hover-title='元素'
      data-hover-domid={`#layer_root_${layer.elemId}`}
      data-actived={isActiveElem}
      style={wrapperStyle}
      id={`elem_wrapper_${layer.elemId}`}
      onClick={e => {
        if (!editorSDK) {
          const actionLink = layerLink?.action?.actionAttrs?.link;
          if (actionLink) {
            window.open(layerLink?.action?.actionAttrs?.link);
          }
          return;
        }
        onElemClick?.(e, { targetElemId: elemId });
      }}
      className={clas(
        animationClassName,
        'ElemWrapper',
        isActiveElem && 'active'
      )}
    >
      {child}
    </LayoutWrapper>
  );
};
