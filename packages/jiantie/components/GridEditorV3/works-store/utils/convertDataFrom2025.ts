import { GridProps, GridRow } from '../../utils';
import {
  IWorksData,
  LayerElemItem,
  LayerElemItemMap,
  PositionAttrs,
} from '../types/interface';
import { AnimateQueue2, AnimationState } from '../types/animate2';
import type {
  IWorksData2025,
  IPositionLink,
  LayerElemItem as LayerElemItem2025,
  WorksBackground,
  WorksPage,
} from '../type2025/interface_old';
import type { AnimationMeta } from '../type2025/animation';
import type { MkPictureData, TextProps } from '../type2025/type';
import type { PictureData } from '../../components/Picture/types';

// 缩放比例常量
const SCALE_RATIO = 375 / 1080; // 约 0.3472

/**
 * 将 AnimationMeta[] 转换为 AnimateQueue2
 * @param animations AnimationMeta 数组
 * @returns AnimateQueue2 对象
 */
function convertAnimationMetaToAnimateQueue2(
  animations?: AnimationMeta[]
): AnimateQueue2 | undefined {
  if (!animations || animations.length === 0) {
    return undefined;
  }

  const result: AnimateQueue2 = {
    entrance: [],
    emphasis: [],
    exit: [],
  };

  for (let i = 0; i < animations.length; i++) {
    const meta = animations[i];
    const animationState: AnimationState = {
      id: `${meta.animationRef}_${i}`,
      name: meta.label,
      type: meta.animationRef,
      delay: meta.delay,
      parameters: {
        duration: meta.duration,
        timingFunction: meta.timingFunction,
        direction: meta.direction,
        fillMode: meta.fillMode,
        iterationCount: meta.iterationCount,
        order: meta.order,
        groupOrder: meta.groupOrder,
        fadeIn: meta.fadeIn,
      },
    };

    // 根据 bizType 分组
    if (meta.bizType === 'enter') {
      if (!result.entrance) {
        result.entrance = [];
      }
      result.entrance.push(animationState);
    } else if (meta.bizType === 'action') {
      if (!result.emphasis) {
        result.emphasis = [];
      }
      result.emphasis.push(animationState);
    } else if (meta.bizType === 'out') {
      if (!result.exit) {
        result.exit = [];
      }
      result.exit.push(animationState);
    }
  }

  // 如果某个数组为空，则删除该属性
  if (result.entrance?.length === 0) {
    delete result.entrance;
  }
  if (result.emphasis?.length === 0) {
    delete result.emphasis;
  }
  if (result.exit?.length === 0) {
    delete result.exit;
  }

  // 如果所有数组都为空，返回 undefined
  if (!result.entrance && !result.emphasis && !result.exit) {
    return undefined;
  }

  return result;
}

/**
 * 缩放单个数值
 * @param value 原始数值
 * @returns 缩放后的数值
 */
function scaleValue(value: number): number {
  return value * SCALE_RATIO;
}

/**
 * 缩放对象中指定键的数值
 * @param obj 对象
 * @param keys 需要缩放的键数组
 * @returns 缩放后的对象
 */
function scaleObjectValues<T extends Record<string, any>>(
  obj: T,
  keys: string[]
): T {
  const result = { ...obj } as T;
  for (const key of keys) {
    if (key in result && typeof result[key] === 'number') {
      (result as any)[key] = scaleValue(result[key] as number);
    }
  }
  return result;
}

/**
 * 将 positionLink 的位置信息转换为 PositionAttrs
 * @param linkInfo positionLink 信息
 * @param parentLinkInfo 父级 positionLink 信息（当元素在组合内时使用）
 * @returns PositionAttrs 对象
 */
function convertPositionLinkToPositionAttrs(
  linkInfo: IPositionLink,
  parentLinkInfo?: IPositionLink
): PositionAttrs | undefined {
  if (linkInfo.x === undefined && linkInfo.y === undefined) {
    return undefined;
  }

  const position: PositionAttrs = {};

  // 计算最终的 x, y 坐标：如果有父级坐标，需要累加
  let finalX = linkInfo.x;
  let finalY = linkInfo.y;

  if (parentLinkInfo) {
    // 如果父级有 x 坐标，累加到子元素的 x
    if (parentLinkInfo.x !== undefined && finalX !== undefined) {
      finalX = finalX + parentLinkInfo.x;
    } else if (parentLinkInfo.x !== undefined) {
      finalX = parentLinkInfo.x;
    }
    // 如果父级有 y 坐标，累加到子元素的 y
    if (parentLinkInfo.y !== undefined && finalY !== undefined) {
      finalY = finalY + parentLinkInfo.y;
    } else if (parentLinkInfo.y !== undefined) {
      finalY = parentLinkInfo.y;
    }
  }

  if (finalX !== undefined) {
    position.left = scaleValue(finalX);
  }
  if (finalY !== undefined) {
    position.top = scaleValue(finalY);
  }
  // width 和 height 需要存储在 layoutStyle 中，而不是 position 中
  // 但这里我们先记录它们，后续会在 attrs 中处理

  // 如果有 constraints，转换为 constraint
  if (linkInfo.constraints) {
    const constraintMap: Record<string, PositionAttrs['constraint']> = {
      LT: 'left-top',
      RT: 'right-top',
      LB: 'left-bottom',
      RB: 'right-bottom',
    };
    position.constraint = constraintMap[linkInfo.constraints];
  }

  return position;
}

/**
 * 将 MkPictureData 转换为 PictureData
 * @param mkPictureData 旧的 MkPictureData
 * @param linkInfo positionLink 信息
 * @param parentLinkInfo 父级 positionLink 信息（当元素在组合内时使用）
 * @returns PictureData 格式的 attrs
 */
function convertMkPictureToPictureData(
  mkPictureData: MkPictureData,
  linkInfo?: IPositionLink,
  parentLinkInfo?: IPositionLink
): PictureData & { absoluteElem?: boolean; position?: PositionAttrs } {
  // 缩放所有数值属性
  const scaledData = scaleObjectValues(mkPictureData, [
    'orgHeight',
    'orgWidth',
    'baseW',
    'baseH',
    'borderRadius',
  ]);

  // cropData 在 PictureData 中通过 crop 字段表示，这里暂时不处理
  // 如果需要，可以在后续版本中添加

  // 构建 PictureData
  const pictureData: PictureData & {
    absoluteElem?: boolean;
    position?: PositionAttrs;
  } = {
    version: mkPictureData.version,
    type: 'image', // 默认类型
    ossPath: mkPictureData.ossPath,
    originBaseH: scaledData.baseH,
    originBaseW: scaledData.baseW,
    flipVertical: mkPictureData.flipVertical,
    flipHorizontal: mkPictureData.flipHorizontal,
    description: '', // 默认空字符串
    objectPosition: {
      x: 50, // 默认居中
      y: 50, // 默认居中
      size: 'cover', // 默认值
    },
  };

  // 处理 mask
  if (mkPictureData.mask) {
    pictureData.mask = {
      content: mkPictureData.mask.content,
      name: mkPictureData.mask.name,
    };
  }

  // 处理 shadow
  if (mkPictureData.shadow) {
    pictureData.shadow = {
      enable: mkPictureData.shadow.enable,
      blur: scaleValue(mkPictureData.shadow.blur),
      direction: mkPictureData.shadow.direction, // 方向不需要缩放
      color: mkPictureData.shadow.color,
    };
  }

  // 处理位置信息
  if (linkInfo) {
    const position = convertPositionLinkToPositionAttrs(
      linkInfo,
      parentLinkInfo
    );
    if (position) {
      pictureData.absoluteElem = true;
      pictureData.position = position;
    }
  }

  return pictureData;
}

/**
 * 将 TextProps 转换为 TextAttrs
 * @param textProps 旧的 TextProps
 * @param linkInfo positionLink 信息
 * @param parentLinkInfo 父级 positionLink 信息（当元素在组合内时使用）
 * @returns TextAttrs 格式的 attrs
 */
function convertMkTextToTextAttrs(
  textProps: TextProps,
  linkInfo?: IPositionLink,
  parentLinkInfo?: IPositionLink
): {
  color: string;
  text: string;
  textDecoration: string;
  attrs: any;
  fontFamily: string;
  fontUrl: string;
  isList?: boolean;
  listStyle?: string;
  fontSize?: number;
  lineHeight?: number;
  writingMode?: string;
  paragraphSpacing?: number;
  absoluteElem?: boolean;
  position?: PositionAttrs;
} {
  // 判断是否为列表
  const isList = !!textProps.listStyle && textProps.listStyle !== 'none';

  // 构建 TextAttrs
  // lineHeight 如果是相对值（小于等于 2），则保持原值；如果是像素值（大于 2），则需要缩放
  const lineHeightValue =
    textProps.lineHeight <= 2
      ? textProps.lineHeight
      : scaleValue(textProps.lineHeight);

  const textAttrs: {
    color: string;
    text: string;
    textDecoration: string;
    attrs: any;
    fontFamily: string;
    fontUrl: string;
    isList?: boolean;
    listStyle?: string;
    fontSize?: number;
    lineHeight?: number;
    writingMode?: string;
    paragraphSpacing?: number;
    absoluteElem?: boolean;
    position?: PositionAttrs;
  } = {
    color: textProps.color,
    text: textProps.planText || textProps.text || '',
    textDecoration: textProps.textDecoration,
    attrs: {
      ...textProps,
      // 缩放 originBoxInfo
      originBoxInfo: textProps.originBoxInfo
        ? {
            width: scaleValue(textProps.originBoxInfo.width),
            height: scaleValue(textProps.originBoxInfo.height),
          }
        : textProps.originBoxInfo,
      // 缩放 letterSpacing
      letterSpacing: scaleValue(textProps.letterSpacing),
    },
    fontFamily: textProps.fontFamily,
    fontUrl: textProps.fontUrl,
    isList,
    listStyle: textProps.listStyle,
    fontSize: scaleValue(textProps.fontSize),
    lineHeight: lineHeightValue,
    writingMode: textProps.writingMode,
  };

  // 处理位置信息
  if (linkInfo) {
    const position = convertPositionLinkToPositionAttrs(
      linkInfo,
      parentLinkInfo
    );
    if (position) {
      textAttrs.absoluteElem = true;
      textAttrs.position = position;
    }
  }

  return textAttrs;
}

/**
 * 将 WorksBackground 转换为 React.CSSProperties 中的背景样式
 * @param background WorksBackground 对象
 * @returns React.CSSProperties 对象
 */
function convertWorksBackgroundToStyle(
  background?: WorksBackground
): React.CSSProperties {
  if (!background) {
    return {};
  }

  const style: React.CSSProperties = {};

  // 处理背景颜色
  if (background.bgcolor) {
    style.backgroundColor = background.bgcolor;
  } else if (background.colorRgb) {
    // 将 RGB 转换为 CSS 颜色字符串
    const { r, g, b, a } = background.colorRgb;
    if (a !== undefined && a < 1) {
      style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
    } else {
      style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }
  } else if (background.colors && background.colors.points) {
    // 处理渐变色：将 Colors 转换为 CSS linear-gradient
    const { degress, points } = background.colors;
    if (points.length > 0) {
      const colorStops = points
        .map(
          point =>
            `rgba(${point.rgb.r}, ${point.rgb.g}, ${point.rgb.b}, ${
              point.rgb.a ?? 1
            }) ${point.position}%`
        )
        .join(', ');
      style.backgroundImage = `linear-gradient(${degress}deg, ${colorStops})`;
    }
  }

  // 处理背景图片
  if (background.bgpic) {
    style.backgroundImage = `url(${background.bgpic})`;
    style.backgroundRepeat = 'no-repeat';
    style.backgroundPosition = 'center center';

    // 处理背景图片位置
    if (
      background.bgpicleft !== undefined ||
      background.bgpictop !== undefined
    ) {
      const left =
        background.bgpicleft !== undefined
          ? scaleValue(background.bgpicleft)
          : 'center';
      const top =
        background.bgpictop !== undefined
          ? scaleValue(background.bgpictop)
          : 'center';
      style.backgroundPosition = `${left}px ${top}px`;
    }

    // 处理背景图片类型（影响 backgroundSize）
    if (background.bgpictype) {
      switch (background.bgpictype) {
        case 'cover':
          style.backgroundSize = 'cover';
          break;
        case 'contain':
          style.backgroundSize = 'contain';
          break;
        case 'repeat':
          style.backgroundRepeat = 'repeat';
          style.backgroundSize = 'auto';
          break;
        case 'stretch':
        case '100%':
          style.backgroundSize = '100% 100%';
          break;
        default:
          // 如果有缩放比例，使用缩放后的尺寸
          if (
            background.bgpicscalerate !== undefined &&
            background.bgpicwidth !== undefined &&
            background.bgpicheight !== undefined
          ) {
            const scaledWidth = scaleValue(
              background.bgpicwidth * background.bgpicscalerate
            );
            const scaledHeight = scaleValue(
              background.bgpicheight * background.bgpicscalerate
            );
            style.backgroundSize = `${scaledWidth}px ${scaledHeight}px`;
          } else if (
            background.bgpicwidth !== undefined &&
            background.bgpicheight !== undefined
          ) {
            const scaledWidth = scaleValue(background.bgpicwidth);
            const scaledHeight = scaleValue(background.bgpicheight);
            style.backgroundSize = `${scaledWidth}px ${scaledHeight}px`;
          } else {
            style.backgroundSize = 'cover';
          }
      }
    } else {
      // 默认使用 cover
      style.backgroundSize = 'cover';
    }
  }

  // 处理透明度
  if (background.opacity !== undefined) {
    style.opacity = background.opacity;
  }

  // 处理翻转（通过 transform 实现）
  if (background.flipHorizontal || background.flipVertical) {
    const transforms: string[] = [];
    if (background.flipHorizontal) {
      transforms.push('scaleX(-1)');
    }
    if (background.flipVertical) {
      transforms.push('scaleY(-1)');
    }
    if (transforms.length > 0) {
      style.transform = transforms.join(' ');
    }
  }

  // 注意：clipBgSetting（切片模式背景）比较复杂，暂时不处理
  // 如果需要支持，需要创建特殊的背景组件

  return style;
}

/**
 * 递归处理 IWorksData2025 的 LayerElemItem（包含 body 字段）
 * @param layers 图层数组
 * @param callback 回调函数
 */
function deepLayers2025(
  layers: LayerElemItem2025[],
  callback: (layer: LayerElemItem2025) => void
) {
  if (!layers) {
    return;
  }

  for (const layer of layers) {
    callback(layer);

    // 递归处理 body 字段
    if (layer.body && layer.body.length > 0) {
      deepLayers2025(layer.body, callback);
    }
  }
}

/**
 * 类型守卫：判断数据是否为 IWorksData2025 格式
 * @param data 待判断的数据
 * @returns 是否为 IWorksData2025 格式
 */
export function is2025Data(
  data: IWorksData | IWorksData2025
): data is IWorksData2025 {
  // 检查是否存在 canvasData 且不存在 isGridMode
  return 'canvasData' in data && !('isGridMode' in data);
}

/**
 * 将 IWorksData2025 转换为 IWorksData
 * @param data2025 IWorksData2025 数据
 * @returns IWorksData 数据
 */
export function convert2025ToNew(data2025: IWorksData2025): IWorksData {
  // 1. 构建 layersMap：从所有页面提取图层，并合并 positionLink 信息
  const layersMap: LayerElemItemMap = {};
  const rawPages = data2025.canvasData.content.pages;
  // 处理 pages 可能是对象或数组的情况
  const pages: WorksPage[] = Array.isArray(rawPages)
    ? rawPages
    : (Object.values(rawPages || {}) as WorksPage[]);
  // positionLink 可能不存在，需要处理
  const positionLink = data2025.positionLink || data2025.linkDict || {};

  // 构建 elemId -> LayerElemItem2025 映射表，用于快速查找父级元素
  const layerMapById: Record<string, LayerElemItem2025> = {};
  for (const page of pages) {
    if (!page.layers) continue;
    deepLayers2025(page.layers, (layer: LayerElemItem2025) => {
      if (layer.elemId) {
        layerMapById[layer.elemId] = layer;
      }
    });
  }

  // 遍历所有页面的图层
  for (const page of pages) {
    if (!page.layers) continue;

    deepLayers2025(page.layers, (layer: LayerElemItem2025) => {
      const { elemId } = layer;
      if (!elemId) {
        return;
      }

      // 合并 positionLink 信息到 layer
      const linkInfo = positionLink[elemId];

      // 先创建一个不包含 body 的 layer 副本
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { body, ...layerWithoutBody } = layer as any;

      // 只处理 MkPicture 和 MkText 的转换，其他element直接放弃
      if (layer.elementRef !== 'MkPicture' && layer.elementRef !== 'MkText') {
        return;
      }

      // 检查是否有父级元素，且父级是 MkCombination
      let parentLinkInfo: IPositionLink | undefined;
      if (linkInfo?.parentId) {
        const parentLayer = layerMapById[linkInfo.parentId];
        if (parentLayer && parentLayer.elementRef === 'MkCombination') {
          // 获取父级的位置信息
          const parentLink = positionLink[linkInfo.parentId];
          if (parentLink) {
            parentLinkInfo = parentLink;
          }
        }
      }

      // 处理 MkPicture 和 MkText 的特殊转换
      let convertedAttrs = layerWithoutBody.attrs;
      let absoluteElem: boolean | undefined;
      let position: PositionAttrs | undefined;

      if (layer.elementRef === 'MkPicture' && layer.attrs) {
        const pictureData = convertMkPictureToPictureData(
          layer.attrs as MkPictureData,
          linkInfo,
          parentLinkInfo
        );
        convertedAttrs = pictureData;
        absoluteElem = pictureData.absoluteElem;
        position = pictureData.position;
        // 删除临时添加的属性
        delete (convertedAttrs as any).absoluteElem;
        delete (convertedAttrs as any).position;
      } else if (layer.elementRef === 'MkText' && layer.attrs) {
        const textAttrs = convertMkTextToTextAttrs(
          layer.attrs as TextProps,
          linkInfo,
          parentLinkInfo
        );
        convertedAttrs = textAttrs;
        absoluteElem = textAttrs.absoluteElem;
        position = textAttrs.position;
        // 删除临时添加的属性
        delete (convertedAttrs as any).absoluteElem;
        delete (convertedAttrs as any).position;
      }

      // 处理 linkInfo 的 width、height 和 zIndex（需要存储到 layoutStyle）
      let layoutStyle: React.CSSProperties | undefined;
      if (
        linkInfo &&
        (linkInfo.width !== undefined ||
          linkInfo.height !== undefined ||
          linkInfo.zIndex !== undefined)
      ) {
        layoutStyle = {
          ...(convertedAttrs?.layoutStyle || {}),
          ...(linkInfo.width !== undefined && {
            width: scaleValue(linkInfo.width),
          }),
          ...(linkInfo.height !== undefined && {
            height: scaleValue(linkInfo.height),
          }),
          ...(linkInfo.zIndex !== undefined && {
            zIndex: linkInfo.zIndex, // zIndex 不需要缩放，直接使用
          }),
        };
      } else if (convertedAttrs?.layoutStyle) {
        layoutStyle = convertedAttrs.layoutStyle;
      }

      // 构建合并后的 layer
      const mergedLayer: LayerElemItem = {
        ...layerWithoutBody,
        attrs: {
          ...convertedAttrs,
          ...(absoluteElem !== undefined && { absoluteElem }),
          ...(position && { position }),
          ...(layoutStyle && { layoutStyle }),
        },
        // 如果 positionLink 中存在该元素的信息，则合并
        ...(linkInfo && {
          name: linkInfo.name,
          tag: linkInfo.tag,
          action: linkInfo.action,
          // 转换动画数据
          ...(linkInfo.animation && {
            animateQueue2: convertAnimationMetaToAnimateQueue2(
              linkInfo.animation
            ),
          }),
        }),
      };

      layersMap[elemId] = mergedLayer;
    });
  }

  // 2. 构建 gridProps：从 pages 构建全新的 gridProps
  // 从 pages 构建默认的 gridsData
  // 每个 page 对应一个 block（GridRow），tag 为 'block'
  const gridsData: GridRow[] = pages.map((page, index) => {
    // 收集该页面所有图层的 elemId 作为 childrenIds（只收集 MkPicture 和 MkText）
    const childrenIds: string[] = [];
    if (page.layers) {
      const collectElemIds = (layers: LayerElemItem2025[]) => {
        for (const layer of layers) {
          // 只收集 MkPicture 和 MkText 的 elemId
          if (
            layer.elemId &&
            (layer.elementRef === 'MkPicture' || layer.elementRef === 'MkText')
          ) {
            childrenIds.push(layer.elemId);
          }
          // 递归处理 body 字段
          if (layer.body && layer.body.length > 0) {
            collectElemIds(layer.body);
          }
        }
      };
      collectElemIds(page.layers);
    }

    // 转换背景样式
    const backgroundStyle = convertWorksBackgroundToStyle(page.background);

    return {
      id: page.id || `page_${index}`,
      tag: 'block',
      style: {
        width: '100%',
        height: scaleValue(page.height || data2025.canvasData.height),
        minHeight: scaleValue(page.height || data2025.canvasData.height),
        ...backgroundStyle,
      },
      childrenIds,
      children: [], // 空的 children，因为元素都在 layersMap 中
    } as GridRow;
  });

  // 创建全新的 gridProps
  const gridProps: GridProps = {
    id: 'default_grid_' + Date.now(),
    gridsData,
    version: 'v2.1',
    // style: {
    //   width: data2025.canvasData.width,
    //   height: data2025.canvasData.visualHeight || data2025.canvasData.height,
    // },
  } as GridProps;

  // 3. 处理 music
  const music = data2025.canvasData.music || {};

  // 4. 构建新版数据
  const newData: IWorksData = {
    isGridMode: true, // 转换即表示是网格模式
    gridProps,
    layersMap,
    music,
    _version: data2025._version,
  };

  return newData;
}
