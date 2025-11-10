import { isPc } from '@mk/utils';
import { getCanvaInfo2 } from '../comp/provider/utils';
import { ThemeColorType } from './ColorPicker/types';
import { colorValueParser } from './ColorPicker/utils';

/** 获取移动设备屏幕宽度 */
export const getMobileWidth = () => {
  return (
    document.querySelector('.viewer_page_root')?.clientWidth ||
    document.querySelector('#designer_canvas_container_inner')?.clientWidth ||
    document.documentElement.clientWidth
  );
};

const isDesignerEditor = () => {
  return /editor-designer/.test(window.location.href);
};

export const isEditor = () => {
  return /editor/.test(window.location.href);
};

export const getScaleRate = () => {
  const canvaInfo = getCanvaInfo2();
  const { canvaScale, isWebsite } = canvaInfo;
  if (isPc()) {
    if (isWebsite || isEditor()) {
      // pc预览网页时，总是不缩放
      return 1;
    } else {
      // pc预览其他规格时，按照viewer的缩放比例
      return canvaScale;
    }
  }
  if (isDesignerEditor()) {
    // 设计师编辑器时，总是不缩放
    return 1;
  }
  return canvaScale;
};

/**
 * 支持 transform 字符串的缩放，例如：
 *   - "translate(100px, -356px)"
 *   - "scale(1.2)"
 *   - "rotate(30deg)"
 *   - "translateX(100px)"
 *   - "translateY(50px)"
 * 只会缩放 px 单位的数值
 */
export const calcTransform = (str?: string) => {
  if (!str) return;
  // 只缩放 px 单位，其他单位直接返回
  if (/auto|%|rem|em/.test(str)) {
    return str;
  }
  // rotate 不需要处理，直接返回原始字符串
  if (/rotate\(/i.test(str)) {
    return str;
  }
  const scaleRate = getScaleRate();
  // 匹配所有 px 单位的数值
  // 例如 translate(100px, -356px) => 匹配 100px, -356px
  // 只处理 px 单位
  const result = String(str).replace(/(-?\d+(\.\d+)?)px/gi, (match, num) => {
    const scaled = (parseFloat(num) * scaleRate).toFixed(2);
    return `${scaled}px`;
  });
  return result;
};

export const calcLayoutStyleVal = (str?: any, scale?: number) => {
  if (!str) return str;
  if (/auto|%|rem|em/.test(str)) {
    return str;
  }
  const scaleRate = scale || getScaleRate();
  const padding = String(str || '');
  const paddingList = padding?.split(' ') || [];
  /** 根据屏幕宽度和375的比例缩放 */
  const calcVal = (val: string) => {
    return `${(+val * scaleRate).toFixed(2)}px`;
  };
  paddingList.forEach((item, index) => {
    paddingList[index] = calcVal(item.replace(/px/gi, ''));
  });
  return paddingList.join(' ');
};

// export const calcLayoutStyleVal = (str?: any) => {
//   if (!str) return;
//   if (str === "auto") return str;

//   const scaleRate = getScaleRate();
//   const padding = String(str || "");
//   const paddingList = padding?.split(" ") || [];

//   /** 根据屏幕宽度和375的比例缩放 */
//   const calcVal = (val: string) => {
//     // 匹配数值和单位，支持 %、rem、em、px 或无单位
//     const match = val.match(/^([\d.]+)(%|rem|em|px)?$/i);
//     if (!match) return val;

//     const [, numStr, unit = "px"] = match;
//     const numVal = parseFloat(numStr) * scaleRate;
//     return `${Math.round(numVal)}${unit}`;
//   };

//   paddingList.forEach((item, index) => {
//     paddingList[index] = calcVal(item.trim());
//   });

//   return paddingList.join(" ");
// };

export const setSystemThemeColor = (themeColors: ThemeColorType[]) => {
  Object.assign(window as any, { themeColors });
};

const safeToSetStyle = (
  targetStyle: React.CSSProperties,
  key: keyof React.CSSProperties,
  sourceStyle: React.CSSProperties
) => {
  const themeColors = (window as any).themeColors;

  if (sourceStyle[key]) {
    targetStyle[key] = colorValueParser(
      sourceStyle[key] as any,
      themeColors
    ) as any;
  }
};

export const blockStyleFilter = (
  style: React.CSSProperties,
  scale?: number
): React.CSSProperties => {
  const { backgroundGroup, rowGap, columnGap, ..._style } = style as any;
  const _borderWidth =
    _style.borderWidth ||
    [
      _style.borderTopWidth,
      _style.borderRightWidth,
      _style.borderBottomWidth,
      _style.borderLeftWidth,
    ]
      .filter(v => typeof v !== 'undefined')
      .join('px ')
      .concat('px');

  if (_style.borderImage && !/url/gi.test(String(_style.borderImage))) {
    _style.borderImage = `url(${_style.borderImage})`;
  }

  safeToSetStyle(_style, 'borderColor', style);
  safeToSetStyle(_style, 'color', style);
  safeToSetStyle(_style, 'backgroundColor', style);
  safeToSetStyle(_style, 'background', style);

  // 处理混合模式，确保 WebKit 前缀也被包含（兼容 iOS Safari）
  const mixBlendMode = style.mixBlendMode;
  const processedMixBlendMode: any = {};
  if (mixBlendMode) {
    processedMixBlendMode.mixBlendMode = mixBlendMode;
    processedMixBlendMode.WebkitMixBlendMode = mixBlendMode;
  }

  // 计算 transform，如果存在混合模式但 transform 未设置，则启用硬件加速（iOS Safari 兼容性）
  let processedTransform = calcTransform(style?.transform);
  // 如果 transform 不存在（calcTransform 返回 undefined），且存在混合模式，则启用硬件加速
  if (mixBlendMode && processedTransform === undefined && !style?.transform) {
    // 启用硬件加速以改善 iOS Safari 的混合模式渲染
    processedTransform = 'translate3d(0, 0, 0)';
  }

  return {
    ..._style,
    ...processedMixBlendMode,
    fontSize: calcLayoutStyleVal(style?.fontSize, scale),
    padding: calcLayoutStyleVal(style?.padding, scale),
    margin: calcLayoutStyleVal(style?.margin, scale),
    top: calcLayoutStyleVal(style?.top, scale),
    left: calcLayoutStyleVal(style?.left, scale),
    bottom: calcLayoutStyleVal(style?.bottom, scale),
    right: calcLayoutStyleVal(style?.right, scale),
    gap: calcLayoutStyleVal(
      style?.gap ??
        (rowGap && columnGap
          ? `${rowGap} ${columnGap}`
          : (rowGap ?? columnGap)),
      scale
    ),
    transform: processedTransform,
    minWidth: calcLayoutStyleVal(style?.minWidth, scale),
    width: calcLayoutStyleVal(style?.width, scale),
    height: calcLayoutStyleVal(style?.height, scale),
    minHeight: calcLayoutStyleVal(style?.minHeight, scale),
    borderRadius: calcLayoutStyleVal(style?.borderRadius, scale),
    borderWidth: calcLayoutStyleVal(_borderWidth, scale),
    outlineWidth: calcLayoutStyleVal(style?.outlineWidth, scale),
  };
};
