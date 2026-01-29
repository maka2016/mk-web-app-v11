import { isPc, queryToObj } from '@/utils';
import { colorValueParser } from '../components/ColorPicker/utils';
import { getCanvaInfo2 } from '../provider/utils';

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
  return /editor|ai-gen-works|ai-vectors/.test(window.location.href);
};

export const getScaleRate = () => {
  const canvaInfo = getCanvaInfo2();
  const isScreenshot = queryToObj()?.screenshot === 'true';
  const { canvaScale, isWebsite } = canvaInfo;
  if (isPc()) {
    if ((!isScreenshot && isWebsite) || isEditor()) {
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

const safeToSetStyle = (
  targetStyle: React.CSSProperties,
  key: keyof React.CSSProperties,
  sourceStyle: React.CSSProperties
) => {
  const getThemeConfig = (window as any).getThemeConfig;
  const themeConfig = getThemeConfig?.();
  const themeColors = themeConfig?.themeColors || [];

  if (sourceStyle[key]) {
    targetStyle[key] = colorValueParser(sourceStyle[key] as any, themeColors) as any;
  }
};

export const blockStyleFilter = (style: React.CSSProperties, scale?: number): React.CSSProperties => {
  const { backgroundGroup, rowGap, columnGap, ..._style } = style as any;
  const _borderWidth =
    _style.borderWidth ||
    [_style.borderTopWidth, _style.borderRightWidth, _style.borderBottomWidth, _style.borderLeftWidth]
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

  // 注意：混合模式不再在这里处理，而是在 WidgetItemRendererV2 中通过 takeBlendModeStyle 单独处理
  // 这样可以避免 Safari 黑色底问题，因为混合模式应用到内容层而不是容器层

  return {
    ..._style,
    fontSize: calcLayoutStyleVal(style?.fontSize, scale),
    padding: calcLayoutStyleVal(style?.padding, scale),
    margin: calcLayoutStyleVal(style?.margin, scale),
    top: calcLayoutStyleVal(style?.top, scale),
    left: calcLayoutStyleVal(style?.left, scale),
    bottom: calcLayoutStyleVal(style?.bottom, scale),
    right: calcLayoutStyleVal(style?.right, scale),
    gap: calcLayoutStyleVal(
      style?.gap ?? (rowGap && columnGap ? `${rowGap} ${columnGap}` : (rowGap ?? columnGap)),
      scale
    ),
    transform: calcTransform(style?.transform),
    minWidth: calcLayoutStyleVal(style?.minWidth, scale),
    width: calcLayoutStyleVal(style?.width, scale),
    height: calcLayoutStyleVal(style?.height, scale),
    minHeight: calcLayoutStyleVal(style?.minHeight, scale),
    borderRadius: calcLayoutStyleVal(style?.borderRadius, scale),
    borderWidth: calcLayoutStyleVal(_borderWidth, scale),
    outlineWidth: calcLayoutStyleVal(style?.outlineWidth, scale),
  };
};
