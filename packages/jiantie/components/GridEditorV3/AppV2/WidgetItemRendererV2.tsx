import MkCalendarV3 from '@/components/GridEditorV3/components/CalendarV3';
import MkMapComp from '@/components/GridEditorV3/components/MapV4';
import {
  LayerElemItem,
  PositionAttrs,
} from '@/components/GridEditorV3/works-store/types';
import { deepClone, queryToObj } from '@/utils';
import { cn } from '@workspace/ui/lib/utils';
import { Variable } from 'lucide-react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import React, { memo, useEffect, useState } from 'react';
import RelayComp from '../../Relay/comp';
import RSVPComp from '../../RSVP/comp';
import LayoutWrapper from '../components/layoutWrapper';
import ImgLiteCompV2 from '../components/Picture/ImgLiteCompV2';
import TextComp from '../components/Text/TextComp';
import { useAppAnimate } from '../hooks/useAnimate';
import { useAppAnimate2 } from '../hooks/useAnimate2';
import { useDragElem } from '../hooks/useDragElem';
import {
  SYSTEM_VARIABLES,
  SystemVariableKey,
} from '../provider/system-provider';
import { mergeDeep2 } from '../provider/utils';
import { bgImageChangeToWebp, blockStyleFilter } from '../utils/utils1';
import { useWorksStore } from '../works-store/store/hook';
import ContainerWithBgV2 from './ContainerWithBgV2';
import './index.scss';
import './lib/animate.css';
import { clearUndefinedKey } from './utils';

interface WidgetItemRendererProps {
  rowDepth?: number[];
  readyToPlayAnimation?: boolean;
  editable?: boolean;
  isAbsoluteElem?: boolean;
  layer: LayerElemItem;
  readonly: boolean;
  onElemClick?: (
    e: React.MouseEvent<HTMLDivElement>,
    { targetElemId }: { targetElemId: string }
  ) => void;
}

export const takeLayoutWrapperStyle = (style: React.CSSProperties = {}) => {
  return clearUndefinedKey({
    willChange: 'transform',
    transform: style.transform || 'translate3d(0, 0, 0)',
    mixBlendMode: style.mixBlendMode,
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
    maskSize: style.maskSize || undefined,
    WebkitMaskSize: style.maskSize || undefined,
    maskPosition: style.maskPosition || undefined,
    WebkitMaskPosition: style.maskPosition || undefined,
    maskRepeat: style.maskRepeat || undefined,
    WebkitMaskRepeat: style.maskRepeat || undefined,
    // minWidth: style.minWidth,
    maxWidth: style.maxWidth,
    minHeight: style.minHeight,
    maxHeight: style.maxHeight,
    filter: style.filter,
    // 混合模式不在这里应用，而是在内容包装器上应用，以避免 Safari 黑色底问题
  } as any);
  return clearUndefinedKey(_style);
};

export const takePictureAttrs = (style: React.CSSProperties = {}) => {
  return clearUndefinedKey({
    aspectRatio: style.aspectRatio,
    maskImage: style.maskImage,
    WebkitMaskImage: style.WebkitMaskImage,
    WebkitMaskPosition: style.WebkitMaskPosition,
    WebkitMaskRepeat: style.WebkitMaskRepeat,
    WebkitMaskSize: style.WebkitMaskSize,
  } as any);
};

export const takeTextStyle = (style: React.CSSProperties = {}) => {
  return clearUndefinedKey({
    fontSize: style.fontSize,
    color: style.color,
    fontUrl: (style as any).fontUrl,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    textAlign: style.textAlign,
    textOverflow: style.textOverflow,
    listStyle: style.listStyle,
    textDecoration: style.textDecoration,
    textShadow: style.textShadow,
    isList: (style as any).isList,
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

// 内部组件的 Props，包含从 context 提取的值
interface WidgetItemRendererInternalProps extends WidgetItemRendererProps {
  inEditor?: boolean;
  isActive?: boolean;
  playAnimationInEditor?: boolean;
  worksDetail: any;
  getStyleByTag2: any;
  fullStack: boolean;
  inViewer?: boolean;
  onChange: (operatorId: string, data: any) => void;
}

// 内部组件：真正的渲染逻辑，从 props 接收所有值（包括 context 值）
const WidgetItemRendererV2InternalComponent = (
  props: WidgetItemRendererInternalProps
) => {
  const {
    rowDepth = [],
    readyToPlayAnimation = true,
    editable = true,
    isAbsoluteElem = false,
    layer,
    readonly,
    onElemClick,
    isActive = false,
    inEditor = false,
    // 从 context 传入的值
    playAnimationInEditor = false,
    worksDetail,
    getStyleByTag2,
    fullStack,
    inViewer,
    onChange,
  } = props;

  const elemId = layer.elemId;
  const [screenshotBlock] = useState(queryToObj().screenshot_block);
  const [screenshotMode] = useState(!!queryToObj().screenshot);
  const animateQueue = layer?.animateQueue || layer.attrs?.animateQueue;
  const positionSetting = layer.attrs.position || {};
  const animateQueue2 = layer?.animateQueue2;
  // const containerRef = useRef<HTMLDivElement>(null);

  /** 主题的默认样式 */
  const styleFromTheme = getStyleByTag2(layer?.tag || ('' as any));
  const autoPlayAnimation =
    !screenshotMode &&
    !screenshotBlock &&
    readyToPlayAnimation &&
    (!!inViewer || !!playAnimationInEditor);

  // useAppAnimate2 现在通过 elemId 自动查找 DOM 元素（id: elem_wrapper_${elemId}）
  // 不再需要手动传递 ref，hook 内部会监听 DOM 挂载并自动初始化动画
  const { containerRef } = useAppAnimate2({
    elemId,
    animateQueue: animateQueue2,
    autoPlay: autoPlayAnimation,
    hasPlayedOnce: !!inViewer && !worksDetail?.specInfo?.is_flip_page,
  });

  const { animationClassName, animationStyle } = useAppAnimate({
    animateQueue,
    autoPlay: !screenshotBlock && readyToPlayAnimation && !!inViewer,
    onAnimationComplete: () => { },
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
  });

  const { setContainerRef } = useDragElem({
    elemId,
    rowDepth,
    needResize: true,
    isSelected: isActive,
    isAbsoluteElem,
    onMoveEnd: (nextPosition, operatorId) => {
      onChange(operatorId, {
        position: {
          ...nextPosition,
          constraint: layer.attrs.position?.constraint || 'left-top',
          relativeTo: layer.attrs.position?.relativeTo || 'block',
        },
      });
    },
  });

  useEffect(() => {
    // 自由元素
    if (!isAbsoluteElem) return;
    // 没有约束关系时，给默认left top
    const position = layer.attrs.position;
    setContainerRef(containerRef.current, position as PositionAttrs);
    if (position) {
      const defaultAtBot = typeof position.bottom !== 'undefined';
      const newPosition = defaultAtBot
        ? {
          left: position.left,
          bottom: position.bottom,
          constraint: 'left-bottom',
        }
        : {
          left: position.left,
          top: position.top,
          constraint: 'left-top',
        };
      if (newPosition.constraint === position.constraint) {
        return;
      }
      onChange(elemId, newPosition as PositionAttrs);
    }
  }, [isAbsoluteElem]);

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

  /**
   * attrs.layoutStyle 是统一设置的元素的布局样式属性
   */
  const layoutStyleForWrapper = clearUndefinedKey(
    mergeDeep2(
      {},
      styleFromTheme.layoutStyle || {},
      currAttr.layoutStyle || {},
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
        elemId={layer.elemId}
        isAbsoluteElem={isAbsoluteElem}
        containerInfo={{
          width: wrapperStyle.width,
          height: wrapperStyle.height,
          padding: innerStyle.padding,
          aspectRatio: innerStyle.aspectRatio,
        }}
        style={styleForImg}
        readonly={readonly}
        attrs={currAttr as any}
        editable={editable}
        layer={layer}
        active={isActive}
      />
    );
  } else if (/text/gi.test(elementRef)) {
    const textEditable = !readonly && isActive;
    /** 为了兼容旧的样式设置，实际上需要通过数据清洗来处理 */
    const textAttrs = {
      ...takeTextStyle(styleFromTheme),
      ...takeTextStyle(currAttr as any),
    };
    if (textAttrs.fontSize === undefined) {
      textAttrs.fontSize = 16;
    }
    compEntity = (
      <>
        <TextComp
          worksDetail={worksDetail}
          elemId={layer.elemId}
          layer={layer}
          isActive={isActive}
          layerAttrs={
            blockStyleFilter({
              ...textAttrs,
              ...currAttr,
            } as any) as any
          }
          readonly={!textEditable}
        />
      </>
    );
  } else if (/MkHuiZhi|RSVP1/gi.test(elementRef)) {
    compEntity = (
      <RSVPComp
        worksId={worksDetail.id}
        canCreate={!readonly}
        theme={(currAttr as any)?.theme}
        displayMode={'inline'}
      />
    );
  } else if (/Relay/gi.test(elementRef)) {
    compEntity = (
      <RelayComp
        worksId={worksDetail.id}
        canCreate={!readonly}
        theme={(currAttr as any)?.theme}
        displayMode={'inline'}
        attrs={currAttr as any}
        worksDetail={{
          title: worksDetail.title,
          cover: worksDetail.cover || undefined,
        }}
      />
    );
  } else if (/MkMapV4/gi.test(elementRef)) {
    compEntity = <MkMapComp layer={layer} isActive={isActive} />;
  } else if (/MkCalendarV3/gi.test(elementRef)) {
    compEntity = <MkCalendarV3 layer={layer} isActive={isActive} />;
  }

  const hideComponents = ['MkMapV3'];
  if (layer?.elementRef === 'MkHuiZhi' && !layer.attrs.inLayout) {
    return null;
  }
  if (
    (layer.attrs.show === false ||
      layer.attrs.showType === 0 ||
      hideComponents.includes(layer?.elementRef)) &&
    !fullStack
  ) {
    return null;
  }
  // 检查是否使用系统变量容器模式
  const systemVariableConfig = layer.attrs?.systemVariable;
  const showSystemVarTip =
    inEditor && systemVariableConfig?.enabled && systemVariableConfig?.key;

  // 获取系统变量的标签
  const systemVariableLabel = showSystemVarTip
    ? SYSTEM_VARIABLES[systemVariableConfig.key as SystemVariableKey]?.label
    : '';

  return (
    <LayoutWrapper
      ref={containerRef}
      key={`${layer.elemId}`}
      data-absolute-elem={isAbsoluteElem}
      id={`elem_wrapper_${layer.elemId}`}
      data-actived={isActive}
      data-elem-id={layer.elemId}
      data-row-depth={JSON.stringify(rowDepth)}
      style={wrapperStyle}
      onClick={e => {
        onElemClick?.(e, { targetElemId: elemId });
      }}
      className={cn(
        animationClassName,
        'ElemWrapper hover_elem',
        isActive && 'active',
        editable && 'editable',
        showSystemVarTip && 'show_system_var_tip'
      )}
    >
      <ContainerWithBgV2
        style={blockStyleFilter(innerStyle)}
        id={`layer_root_${layer.elemId}`}
        data-tag={layer?.tag}
        className={cn(
          'Elem innerElem',
          // 'hover_elem',
          isActive && 'active'
        )}
      >
        {compEntity}
      </ContainerWithBgV2>

      {/* 系统变量提示 */}
      {showSystemVarTip && (
        <div
          className='system_var_tip'
        // onClick={() => {
        //   document
        //     .querySelector<HTMLDivElement>('#showInviteeManagerTrigger')
        //     ?.click();
        // }}
        >
          <Variable size={12} />
          <span className='system_var_tip_text'>{systemVariableLabel}</span>
        </div>
      )}

      {!fullStack && editable && <div className='blink_modal'></div>}
    </LayoutWrapper>
  );
};

// 配置需要比较的 keys
const COMPARE_KEYS = {
  // 简单属性比较（直接比较值）
  simple: [
    'tag',
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

  // 需要 JSON.stringify 比较的复杂对象
  layerLinkComplex: ['animateQueue', 'animateQueue2'] as const,
};

// 自定义比较函数：只有当关键 props 变化时才重新渲染
const areInternalPropsEqual = (
  prevProps: WidgetItemRendererInternalProps,
  nextProps: WidgetItemRendererInternalProps
) => {
  // return false;
  // 1. 检查激活状态（最重要，因为会影响UI显示）
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }

  // 2. 检查简单属性
  if (
    prevProps.editable !== nextProps.editable ||
    prevProps.readonly !== nextProps.readonly ||
    prevProps.isAbsoluteElem !== nextProps.isAbsoluteElem ||
    prevProps.readyToPlayAnimation !== nextProps.readyToPlayAnimation ||
    prevProps.playAnimationInEditor !== nextProps.playAnimationInEditor
  ) {
    return false;
  }

  // 3. 检查 layer.elemId（如果elemId变了，肯定是不同的元素）
  if (prevProps.layer?.elemId !== nextProps.layer?.elemId) {
    return false;
  }

  // 4. 检查 layer.attrs 的关键属性（使用版本号_v作为主要判断）
  const prevV = prevProps.layer?.attrs?._v;
  const nextV = nextProps.layer?.attrs?._v;
  if (prevV !== nextV) {
    return false;
  }

  // 5. 检查其他关键属性
  for (const key of COMPARE_KEYS.layerAttrs) {
    const prevValue = prevProps.layer?.attrs?.[key];
    const nextValue = nextProps.layer?.attrs?.[key];
    if (prevValue !== nextValue) {
      return false;
    }
  }

  // 6. 检查复杂对象（animateQueue等）
  for (const key of COMPARE_KEYS.layerLinkComplex) {
    const prevValue = prevProps.layer?.[key];
    const nextValue = nextProps.layer?.[key];
    if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
      return false;
    }
  }

  // 所有关键属性都相同，可以跳过渲染
  return true;
};

// 使用 React.memo 优化性能，避免不必要的重渲染
export const WidgetItemRendererV2Internal = memo(
  WidgetItemRendererV2InternalComponent,
  areInternalPropsEqual
);

// Wrapper 组件：从 context 获取值并传递给内部组件
const WidgetItemRendererV2 = (props: WidgetItemRendererProps) => {
  const { layer } = props;
  const worksStore = useWorksStore();
  const { getStyleByTag2 } = worksStore;
  const inViewer = worksStore.inViewer;
  const fullStack = worksStore.fullStack;
  const {
    widgetStateV2,
    worksDetail,
    config: { readonly },
  } = worksStore;
  const { editingElemId, playAnimationInEditor = false } = widgetStateV2;
  const isActive = layer?.elemId === editingElemId;
  // toJS(worksData.layersMap[layer.elemId]);

  if (!layer) {
    return <span title='元素不存在'></span>;
  }

  return (
    <WidgetItemRendererV2Internal
      {...props}
      inViewer={inViewer}
      layer={toJS(layer)}
      isActive={isActive}
      playAnimationInEditor={playAnimationInEditor}
      worksDetail={worksDetail}
      readonly={readonly}
      getStyleByTag2={getStyleByTag2}
      fullStack={fullStack}
      onChange={(operatorId: string, data: any) => {
        worksStore.changeCompAttr(operatorId, data);
      }}
    />
  );
};

export default observer(WidgetItemRendererV2);
