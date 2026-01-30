import type { SerializedWorksEntity } from '@/server';
import { HTMLAttributes } from 'react';

/**
 * @description: 字节跳动图标库，Web component声明：https://bytedance.feishu.cn/wiki/wikcnJZV45hM71QgI60iwkzvXob
 */
interface IconParkIcon extends HTMLAttributes {
  /** 图标自定义标志 */
  name?: string;
  /** 渲染的SVG图宽高，默认1em */
  size?: string;
  /** SVG图宽度，默认1em */
  width?: string;
  /** SVG图高度，默认1em */
  height?: string;
  /** 是否让SVG图标镜像渲染， 默认false */
  rtl?: boolean;
  /** 是否让SVG图标旋转， 默认false */
  spin?: boolean;
  /** 图标颜色 */
  color?: string;
  /** 描边颜色 */
  stroke?: string;
  /** 填充颜色 */
  fill?: string;
  /** SVG元素外层的class类名 */
  class?: string;
  /** SVG元素外层的样式 */
  style?: string | unknown;
  /** iconpark图标ID */
  // icon-id?: string;
  /** ...其它html元素原生支持的属性 */
}

declare global {
  interface HTMLElementTagNameMap {
    'iconpark-icon': IconParkIcon;
  }
  // when you use React with typescript
  namespace JSX {
    interface IntrinsicElements {
      /** 字节跳动图标 */
      'iconpark-icon': IconParkIcon;
    }
  }
  interface Window {
    /** 作品详情数据 */
    __worksDetail?: SerializedWorksEntity;
  }
}
