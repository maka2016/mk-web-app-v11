import React from 'react';
import { ContentLibType } from './contentLibType';
import {
  DisableValues,
  GradientColors,
  WidgetCommonAttrs,
} from './widget-common-attrs';

export interface UIPluginProps {
  onChange: (changeValue: any) => void;
  value: any;
  /** 当前应用颜色面板的元素，目前主要用于在颜色面板上，如果是svg就过滤掉渐变色 */
  widgetType?: 'text' | 'pic' | 'svg' | 'shape';
  payload?: Record<string, any>;
}

interface ColorPickerProps {
  width?: number;
  needTitle?: boolean;
  disableCustom?: boolean;
  disableAlpha?: boolean;
  disableGradient?: boolean;
  replaceChild?: React.ReactElement | null;
  showRemoveButton?: boolean;
  removeButtonText?: string;
  onRemove?: () => void;
  onHide?: () => void;
  onShow?: () => void;
  type?: 'color' | 'picture' | 'gradient' | undefined;
  colors?: GradientColors | null;
}

export interface EffectFormProps {
  onChange: (value: WidgetCommonAttrs['effects']) => void;
  value: WidgetCommonAttrs['effects'];
  /** 特效组，例如对文字特效，图片特效 */
  effectGroup: 'text' | 'pic' | 'svg' | 'shape' | 'none';
  disableValues: DisableValues;
  /** 标题 */
  title?: string;
  defaultMode?: 'simple' | 'full' | 'hide' | 'none';
  textColor?: string;
  onTextColorChange?: (changeValue: any) => void;
  onCopyCode?: () => void;
}

export interface File {
  ossPath: string;
}

export interface PhoneAlbumProps {
  multiple?: boolean;
  onChange: (files: File[]) => void;
  onClose: () => void;
}

/**
 * 公用 UI 表单组件
 */
export interface PlatformCommonUIForm {
  /** 颜色选择器 */
  ColorPicker: React.ComponentType<UIPluginProps & ColorPickerProps>;
  ColorSelector: React.ComponentType<
    UIPluginProps & ColorPickerProps & { label?: string; arrow?: boolean }
  >;
  ColorInput: React.ComponentType<UIPluginProps & ColorPickerProps>;
  /** 字体选择器 */
  FontFamilySelector: React.ComponentType<
    UIPluginProps & {
      width?: number;
      theme?: 'light' | 'gray';
      onFontLoaded?: () => void;
    }
  >;
  /** 阴影表单 */
  ShadowForm: React.ComponentType<UIPluginProps>;
  /** 圆角表单 */
  BorderRadiusForm: React.ComponentType<UIPluginProps>;
  /** 特效 */
  EffectForm: React.ComponentType<EffectFormProps>;
  /** 二维码生成 */
  // QrcodeGenerator: React.ComponentType<UIPluginProps>;
  /** 蒙版 */
  MaskForm: React.ComponentType<UIPluginProps>;
  ContentForm: React.ComponentType<UIPluginProps>;
  PhoneAlbum?: React.ComponentType<PhoneAlbumProps>;
}

type SelectorTypes = keyof typeof ContentLibType;

export interface ShowSelectorParams {
  type: SelectorTypes;
  onSelected?: (value: any) => void;
  payload?: Record<string, any>;
}

export interface PlatformContextUtils {
  /**
   * 展示选择器，用途包括：
   * 1. 素材选择
   * 2. 颜色面板
   */
  showSelector: (selectorConfig: ShowSelectorParams) => void;
  /**
   * 让容器不响应 scale 操作
   */
  scaleToggle: (status: boolean) => boolean;
  /** 获取作品id */
  getWorksID: () => string;
  /** 锁定元素 */
  lockElem?: (lock: boolean) => void;
  deleteElem?: () => void;

  /** 获得该元素在画布上的坐标与旋转角 */
  saveImgToSystem?: (url: string) => void;
  getCanvasPosition?: (comId: string) => {
    x: number;
    y: number;
    rotate?: number;
  };
  /** 获取总页数 */
  getPagesLength?: () => number;
  /** 获取当前页数 */
  getCurrentPage?: () => number | string;
  navToPage?: (url: string) => void;
}

export interface PlatformContextConfig {
  ui: PlatformCommonUIForm;
  utils: PlatformContextUtils;
}

/**
 * 编辑器功能，包含内容库调用，编辑器提供的 UI 组件等
 */
export class EditorContext {
  /** 由编辑器实现的 UI 接口，都是 react 组件的引用 */
  ui!: PlatformCommonUIForm;

  /** 由编辑器提供的公用工具 */
  utils!: PlatformContextUtils;

  constructor(registerConfig: PlatformContextConfig) {
    this.setContext(registerConfig);
  }

  setContext = (config: PlatformContextConfig) => {
    const { ui, utils } = config;
    this.ui = ui;
    this.utils = utils;
  };
}
