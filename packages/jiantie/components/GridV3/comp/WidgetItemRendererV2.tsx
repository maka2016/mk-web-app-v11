import { getPermissionData } from '@mk/services';
import { deepClone, LoadWidget, mergeDeep, queryToObj } from '@mk/utils';
import MkBulletScreen from '@mk/widgets/MkBulletScreen_v2/comp';
import MkCalendarV3 from '@mk/widgets/MkCalendarV3/comp';
import MkGift from '@mk/widgets/MkGift/comp';
import MkHuiZhi from '@mk/widgets/MkHuiZhi/comp';
import MkImageGroup from '@mk/widgets/MkImageGroup_v2/comp';
import MkMapComp from '@mk/widgets/MkMapV4/comp';
import { IPositionLink, LayerElemItem } from '@mk/works-store/types';
import clas from 'classnames';
import React, { useRef, useState } from 'react';

import RSVPComp from '@/components/RSVP/comp';
import { GridProps } from '../shared';
import {
  bgImageChangeToWebp,
  blockStyleFilter,
  takeXFromMarginOrPadding,
} from '../shared/utils';
import ImgLiteCompV2 from './components/ImgLiteCompV2';
import TextEditor from './components/TextEditor';
import ContainerWithBgV2 from './ContainerWithBgV2';
import { useAppAnimate } from './hooks/useAnimate';
import { useAppAnimate2 } from './hooks/useAnimate2';
import { AbsoluteElemContainer, type PositionAttrs } from './hooks/useDragElem';
import './index.scss';
import LayoutWrapper from './layoutWrapper';
import './lib/animate.css';
import { useGridContext } from './provider';
import { clearUndefinedKey } from './utils';

interface WidgetItemRendererProps {
  rowDepth?: number[];
  readyToPlayAnimation?: boolean;
  editable?: boolean;
  isAbsoluteElem?: boolean;
  elemId: string;
  layer: LayerElemItem;
  layerLink?: IPositionLink;
  canvaInfo?: any;
  pageInfo?: any;
  readonly: boolean;
  containerInfo?: any;
  onElemClick?: (
    e: React.MouseEvent<HTMLDivElement>,
    { targetElemId }: { targetElemId: string }
  ) => void;
  didLoaded?: (compId: string) => void;
}

// 内部组件的 Props，包含从 context 提取的值
interface WidgetItemRendererInternalProps extends WidgetItemRendererProps {
  // 从 context 提取的关键值
  editingElemId?: string;
  playAnimationInEditor?: boolean;
  editorSDK: any;
  gridProps: any;
  editorCtx: any;
  worksDetail: any;
  viewerSDK: any;
  getStyleByTag2: any;
  fullStack: boolean;
  widgetStateV2: any; // 某些子组件需要完整的 widgetStateV2
}

export const takeLayoutWrapperStyle = (style: React.CSSProperties = {}) => {
  return clearUndefinedKey({
    // 移除所有self对齐方式
    // alignSelf: style.alignSelf,
    // justifySelf: style.justifySelf,
    // placeSelf: style.placeSelf,
    transform: style.transform,
    width: style.width,
    height: style.height,
    zIndex: style.zIndex,
    placeContent: style.placeContent,
    placeItems: style.placeItems,
    justifyContent: style.justifyContent,
    justifyItems: style.justifyItems,
    alignContent: style.alignContent,
    alignItems: style.alignItems,
    gridTemplateColumns: style.gridTemplateColumns,
    gap: style.gap,
    rowGap: style.rowGap,
    columnGap: style.columnGap,
    opacity: style.opacity,
    flex: style.flex,
  });
};

export const takeInnerStyle = (style: React.CSSProperties = {}) => {
  const _style = clearUndefinedKey({
    ...takeBgAttrs(style),
    aspectRatio: style.aspectRatio,
    // transform: style.transform,
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
  } as any);
  return clearUndefinedKey(_style);
};

export const takeTextStyle = (style: React.CSSProperties = {}) => {
  return clearUndefinedKey({
    fontSize: style.fontSize || 16,
    color: style.color,
    fontUrl: (style as any).fontUrl,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    textAlign: style.textAlign,
    textOverflow: style.textOverflow,
    textDecoration: style.textDecoration,
    textShadow: style.textShadow,
  } as any);
};

export const takeBgAttrs = (style: React.CSSProperties = {}) => {
  const background = String(style.background || '');
  const isBgImg = /url\((.*?)\)/.test(background);
  const attrs = {
    background: style.background,
    writingMode: style.writingMode,
    backgroundImage: isBgImg ? background : style.backgroundImage,
    backgroundSize: style.backgroundSize,
    backgroundColor: style.backgroundColor,
    backgroundPosition: style.backgroundPosition,
    backgroundRepeat: style.backgroundRepeat,
    backgroundAttachment: style.backgroundAttachment,
    borderImage3: (style as any).borderImage3,
  };
  return clearUndefinedKey(attrs);
};

// 内部组件：真正的渲染逻辑，从 props 接收所有值（包括 context 值）
const WidgetItemRendererV2Internal = (
  props: WidgetItemRendererInternalProps
) => {
  const {
    rowDepth = [],
    readyToPlayAnimation = true,
    editable = true,
    isAbsoluteElem = false,
    elemId,
    layer,
    layerLink,
    canvaInfo = {},
    pageInfo = {},
    containerInfo = {},
    readonly,
    didLoaded,
    onElemClick,
    // 从 context 传入的值
    editingElemId,
    playAnimationInEditor = false,
    editorSDK,
    gridProps,
    editorCtx,
    worksDetail,
    viewerSDK,
    getStyleByTag2,
    fullStack,
    widgetStateV2,
  } = props;

  const [screenshotBlock] = useState(queryToObj().screenshot_block);
  // const { cellsMap } = controledValues;
  // 因为 viewer 没有 editorSDK，所以需要手动获取 layer6
  const hasHyperLink = !!layerLink?.action?.actionAttrs?.link;
  const isActive = elemId === editingElemId;
  const animateQueue = layerLink?.animateQueue || layer.attrs?.animateQueue;
  const positionSetting = (layer.attrs.position || {}) as PositionAttrs;
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
    onAnimationComplete: () => {},
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

  const { elementRef, attrs: currAttr1 } = layer;
  const currAttr = deepClone(currAttr1);
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

  /**
   * attrs.layoutStyle 是统一设置的元素的布局样式属性
   */
  const layoutStyleForWrapper = clearUndefinedKey(
    mergeDeep(
      currAttr.layoutStyle,
      currAttr.layoutStyle?.transformObject
        ? {
            transform: `rotate(${currAttr.layoutStyle?.transformObject?.rotate}deg)`,
          }
        : {}
    ) as React.CSSProperties
  );

  const positionConstraint =
    typeof positionSetting.bottom !== 'undefined'
      ? 'left-bottom'
      : positionSetting?.constraint || 'left-top';
  const wrapperStyleForPosition = isAbsoluteElem
    ? ({
        position: 'absolute',
        ...(positionConstraint === 'left-top'
          ? {
              left: positionSetting.left || 0,
              top: positionSetting.top || 0,
            }
          : {
              left: positionSetting.left || 0,
              bottom: positionSetting.bottom || 0,
            }),
        // ...currAttr.position,
      } as any)
    : {
        position: 'relative',
      };

  const defaultZIndex =
    typeof layer.attrs?.layoutStyle?.zIndex === 'number'
      ? layer.attrs?.layoutStyle?.zIndex
      : 1;
  /** 用于组件响应自身布局的样式 */
  const wrapperStyle = blockStyleFilter({
    ...takeLayoutWrapperStyle({ ...styleFromTheme, ...layoutStyleForWrapper }),
    ...wrapperStyleForPosition,
    width: layoutStyleForWrapper.width || currAttr.width,
    minWidth: layoutStyleForWrapper.minWidth,
    height: layoutStyleForWrapper.height || currAttr.height,
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    // padding: 0.1,
    justifyContent: 'normal',
    alignItems: 'center',
    display: 'grid',
    pointerEvents: editable || isActive ? 'auto' : 'none',
    zIndex: defaultZIndex,
    ...animationStyle,
  }) as React.CSSProperties;

  /** 用于组件外观样式 */
  const innerStyle = {
    // ...(!stackBg ? bgAttrs : {}),
    ...takeInnerStyle({ ...styleFromTheme, ...layoutStyleForWrapper }),
    writingMode: 'unset',
    position: 'relative',
    zIndex: 2,
    pointerEvents: editable || isActive ? 'auto' : 'none',
    // maxHeight: "100%",
    // pointerEvents: isActive ? "auto" : "none",
  } as React.CSSProperties;

  if (/container/gi.test(elementRef)) {
    return null;
  } else if (/rsvp1/gi.test(elementRef)) {
    compEntity = (
      <RSVPComp
        attrs={currAttr as any}
        editorSDK={editorSDKForComp as any}
        layer={layer}
      />
    );
  } else if (/picture/gi.test(elementRef)) {
    const styleForImg = {
      maskImage: innerStyle.maskImage,
      WebkitMaskImage: innerStyle.WebkitMaskImage,
      WebkitMaskPosition: innerStyle.WebkitMaskPosition,
      WebkitMaskRepeat: innerStyle.WebkitMaskRepeat,
      WebkitMaskSize: innerStyle.WebkitMaskSize,
    };
    delete innerStyle.maskImage;
    delete innerStyle.WebkitMaskImage;
    delete innerStyle.WebkitMaskPosition;
    delete innerStyle.WebkitMaskRepeat;
    delete innerStyle.WebkitMaskSize;
    compEntity = (
      <ImgLiteCompV2
        isAbsoluteElem={isAbsoluteElem}
        containerInfo={{
          width: wrapperStyle.width,
          height: wrapperStyle.height,
          padding: innerStyle.padding,
          aspectRatio: innerStyle.aspectRatio,
        }}
        style={styleForImg}
        fullStack={fullStack}
        readonly={readonly}
        attrs={currAttr as any}
        editable={editable}
        layerLink={layerLink}
        editorSDK={editorSDKForComp as any}
        active={isActive}
        viewerSDK={viewerSDK}
        editorCtx={editorCtx}
        elemId={layer.elemId}
        didLoaded={() => {
          setLoaded(true);
          didLoaded?.(elemId);
        }}
      />
    );
  } else if (/text/gi.test(elementRef)) {
    const textEditable = !readonly && isActive;
    /** 为了兼容旧的样式设置，实际上需要通过数据清洗来处理 */
    const textAttrs = {
      ...takeTextStyle(styleFromTheme),
      ...takeTextStyle(currAttr),
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
        />
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
          widgetState={widgetStateV2}
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
          widgetState={widgetStateV2}
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
          widgetState={widgetStateV2}
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
    } else if (/MkCalendarV3/gi.test(elementRef)) {
      compEntity = (
        <MkCalendarV3
          id={layer.elemId}
          editorCtx={editorCtx}
          editorSDK={editorSDKForComp}
          widgetState={widgetStateV2}
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
    } else if (/MkGift/gi.test(elementRef)) {
      compEntity = (
        <MkGift
          id={layer.elemId}
          editorCtx={editorCtx}
          editorSDK={editorSDKForComp}
          widgetState={widgetStateV2}
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
      if (!Comp || !React.isValidElement(Comp)) {
        console.log('组件加载失败', layer.elementRef);
        return null;
      }
      return null;

      compEntity = (
        <Comp
          id={layer.elemId}
          editorCtx={editorCtx}
          editorSDK={editorSDKForComp}
          canvaInfo={canvaInfo}
          active={isActive}
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

  return (
    <LayoutWrapper
      ref={containerRef}
      component={isAbsoluteElem ? AbsoluteElemContainer : 'div'}
      componentProps={
        isAbsoluteElem
          ? {
              key: `${layer.elemId}_${layer.attrs._v}`,
              elemId,
              rowDepth,
              // 自由元素的props
              position: layer.attrs.position as PositionAttrs,
              onMouseDown2: (e: MouseEvent) => {
                // setWidgetStateV2({
                //   activeRowDepth: rowDepth,
                //   editingElemId: elemId,
                // });
              },
              onMouseMove2: (newPosition: PositionAttrs) => {
                // editorSDK?.changeCompAttr(elemId, {
                //   position: {
                //     ...newPosition,
                //     constraint: layer.attrs.position.constraint,
                //   },
                // });
              },
              onMoveEnd2: (nextPosition: PositionAttrs, operatorId: string) => {
                editorSDK?.changeCompAttr(operatorId, {
                  position: {
                    ...nextPosition,
                    constraint: layer.attrs.position.constraint || 'left-top',
                    relativeTo: layer.attrs.position.relativeTo || 'block',
                  },
                });
              },
              editable,
              needResize: true,
            }
          : {}
      }
      key={`${layer.elemId}`}
      data-absolute-elem={isAbsoluteElem}
      id={`elem_wrapper_${layer.elemId}`}
      data-actived={isActive}
      data-elem-id={layer.elemId}
      data-row-depth={JSON.stringify(rowDepth)}
      style={wrapperStyle}
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
        'ElemWrapper hover_elem',
        isActive && 'active',
        editable && 'editable'
      )}
    >
      <ContainerWithBgV2
        style={blockStyleFilter(innerStyle)}
        id={`layer_root_${layer.elemId}`}
        data-tag={layerLink?.tag}
        data-elem-id={layer.elemId}
        className={clas(
          'Elem innerElem',
          // 'hover_elem',
          isActive && 'active'
        )}
      >
        {compEntity}
      </ContainerWithBgV2>
      {!fullStack && editable && <div className='blink_modal'></div>}
    </LayoutWrapper>
  );
};

// 配置需要比较的 keys
const COMPARE_KEYS = {
  // 简单属性比较（直接比较值）
  simple: [
    'elemId',
    'editable',
    'readonly',
    'isAbsoluteElem',
    'readyToPlayAnimation',
    'playAnimationInEditor',
  ] as const,

  // layer.attrs 下的属性（需要深度比较）
  layerAttrs: [
    '_v', // 版本号 - 最关键
    'color', // 颜色
    'fontSize', // 字体大小
    'fontFamily', // 字体
    'textAlign', // 字体
    'fontWeight', // 字体
    'text', // 文字
    'aspectRatio', // 宽高比
    'width', // 宽度
    'height', // 高度
    'padding', // 内边距
    'margin', // 外边距
    'background', // 背景
    'borderRadius', // 圆角
    'opacity', // 透明度
    // 'ossPath', // 图片的地址
    // 可以根据需要继续添加
  ] as const,

  // layerLink 下的属性
  layerLink: ['tag'] as const,

  // 需要 JSON.stringify 比较的复杂对象
  layerLinkComplex: ['animateQueue', 'animateQueue2'] as const,
};

// 自定义比较函数：只有当关键 props 变化时才重新渲染
const areInternalPropsEqual = (
  prevProps: WidgetItemRendererInternalProps,
  nextProps: WidgetItemRendererInternalProps
) => {
  // 1. 比较简单属性
  for (const key of COMPARE_KEYS.simple) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  // 2. 比较 layer.attrs 下的属性
  for (const key of COMPARE_KEYS.layerAttrs) {
    const prevValue = prevProps.layer?.attrs?.[key];
    const nextValue = nextProps.layer?.attrs?.[key];
    if (prevValue !== nextValue) {
      return false;
    }
    const prevValue2 = prevProps.layer?.attrs?.layoutStyle?.[key];
    const nextValue2 = nextProps.layer?.attrs?.layoutStyle?.[key];
    if (prevValue2 !== nextValue2) {
      return false;
    }
  }

  // 3. 检查激活状态（特殊逻辑）
  const wasPrevActive = prevProps.elemId === prevProps.editingElemId;
  const isNextActive = nextProps.elemId === nextProps.editingElemId;
  if (wasPrevActive !== isNextActive) {
    return false;
  }

  // 4. 比较 layerLink 简单属性
  if (prevProps.layerLink?.tag !== nextProps.layerLink?.tag) {
    return false;
  }

  return true;
};

// Memo 化的内部组件
const WidgetItemRendererV2Memoized = React.memo(
  WidgetItemRendererV2Internal,
  areInternalPropsEqual
);

// Wrapper 组件：从 context 获取值并传递给内部组件
const WidgetItemRendererV2 = (props: WidgetItemRendererProps) => {
  const {
    editorSDK,
    gridProps,
    editorCtx,
    widgetStateV2,
    worksDetail,
    viewerSDK,
    getStyleByTag2,
    fullStack,
  } = useGridContext();

  const { editingElemId, playAnimationInEditor = false } = widgetStateV2;

  return (
    <WidgetItemRendererV2Memoized
      {...props}
      editingElemId={editingElemId}
      playAnimationInEditor={playAnimationInEditor}
      editorSDK={editorSDK}
      gridProps={gridProps}
      editorCtx={editorCtx}
      worksDetail={worksDetail}
      viewerSDK={viewerSDK}
      getStyleByTag2={getStyleByTag2}
      fullStack={fullStack}
      widgetStateV2={widgetStateV2}
    />
  );
};

export default WidgetItemRendererV2;
