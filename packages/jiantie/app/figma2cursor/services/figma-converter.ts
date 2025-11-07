import { FigmaService } from './figma';

interface TailwindClasses {
  classes: string[];
  customStyles?: Record<string, string | number>;
}

interface ComponentData {
  component: string;
  props?: Record<string, any>;
  tailwindClasses: string[];
  customStyles?: Record<string, string | number>;
  children?: ComponentData[];
  text?: string;
  name?: string;
}

interface FigmaNode {
  type: string;
  name?: string;
  absoluteBoundingBox?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  fills?: any[];
  strokes?: any[];
  cornerRadius?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  itemSpacing?: number;
  children?: any[];
  characters?: string;
  style?: any;
  effects?: any[];
  imageRef?: string;
}

export class FigmaConverter {
  private figmaService: FigmaService;

  constructor(figmaService: FigmaService) {
    this.figmaService = figmaService;
  }

  private convertColor(color: any): string {
    if (!color) return 'transparent';
    const { r, g, b, a } = color;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a || 1})`;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private getTailwindColor(color: any): string | null {
    if (!color) return null;
    const hex = this.rgbToHex(color.r, color.g, color.b);

    // 常见颜色映射到 Tailwind
    const colorMap: Record<string, string> = {
      '#ffffff': 'white',
      '#000000': 'black',
      '#f3f4f6': 'gray-100',
      '#e5e7eb': 'gray-200',
      '#d1d5db': 'gray-300',
      '#9ca3af': 'gray-400',
      '#6b7280': 'gray-500',
      '#3b82f6': 'blue-500',
      '#ef4444': 'red-500',
      '#10b981': 'green-500',
      '#f59e0b': 'yellow-500',
    };

    return colorMap[hex.toLowerCase()] || null;
  }

  private detectLayout(node: FigmaNode): TailwindClasses {
    const classes: string[] = [];
    const customStyles: Record<string, string | number> = {};

    // 检测布局模式
    if (node.layoutMode === 'HORIZONTAL') {
      classes.push('flex', 'flex-row');

      // 对齐方式
      if (node.counterAxisAlignItems === 'CENTER') {
        classes.push('items-center');
      } else if (node.counterAxisAlignItems === 'FLEX_START') {
        classes.push('items-start');
      } else if (node.counterAxisAlignItems === 'FLEX_END') {
        classes.push('items-end');
      }

      if (node.primaryAxisAlignItems === 'CENTER') {
        classes.push('justify-center');
      } else if (node.primaryAxisAlignItems === 'FLEX_START') {
        classes.push('justify-start');
      } else if (node.primaryAxisAlignItems === 'FLEX_END') {
        classes.push('justify-end');
      } else if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
        classes.push('justify-between');
      }

      // 间距
      if (node.itemSpacing) {
        const spacing = Math.round(node.itemSpacing / 4);
        classes.push(`gap-${spacing}`);
      }
    } else if (node.layoutMode === 'VERTICAL') {
      classes.push('flex', 'flex-col');

      if (node.counterAxisAlignItems === 'CENTER') {
        classes.push('items-center');
      } else if (node.counterAxisAlignItems === 'FLEX_START') {
        classes.push('items-start');
      } else if (node.counterAxisAlignItems === 'FLEX_END') {
        classes.push('items-end');
      }

      if (node.primaryAxisAlignItems === 'CENTER') {
        classes.push('justify-center');
      } else if (node.primaryAxisAlignItems === 'FLEX_START') {
        classes.push('justify-start');
      } else if (node.primaryAxisAlignItems === 'FLEX_END') {
        classes.push('justify-end');
      } else if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
        classes.push('justify-between');
      }

      if (node.itemSpacing) {
        const spacing = Math.round(node.itemSpacing / 4);
        classes.push(`gap-${spacing}`);
      }
    }

    // 尺寸
    if (node.absoluteBoundingBox) {
      const { width, height } = node.absoluteBoundingBox;

      // 常见尺寸映射
      if (width === height) {
        if (width <= 64) {
          classes.push(
            `w-${Math.round(width / 4)}`,
            `h-${Math.round(height / 4)}`
          );
        } else {
          customStyles.width = `${width}px`;
          customStyles.height = `${height}px`;
        }
      } else {
        if (width <= 384) {
          classes.push(`w-${Math.round(width / 4)}`);
        } else if (width >= 1024) {
          classes.push('w-full');
        } else {
          customStyles.width = `${width}px`;
        }

        if (height <= 384) {
          classes.push(`h-${Math.round(height / 4)}`);
        } else {
          customStyles.height = `${height}px`;
        }
      }
    }

    // 背景色
    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const tailwindColor = this.getTailwindColor(fill.color);
        if (tailwindColor) {
          classes.push(`bg-${tailwindColor}`);
        } else {
          customStyles.backgroundColor = this.convertColor(fill.color);
        }
      }
    }

    // 边框
    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];
      if (stroke.visible !== false) {
        const tailwindColor = this.getTailwindColor(stroke.color);
        classes.push('border');
        if (tailwindColor) {
          classes.push(`border-${tailwindColor}`);
        } else {
          customStyles.borderColor = this.convertColor(stroke.color);
        }
      }
    }

    // 圆角
    if (node.cornerRadius) {
      if (node.cornerRadius <= 24) {
        const rounded = Math.round(node.cornerRadius / 4);
        classes.push(
          rounded === 0
            ? 'rounded-none'
            : `rounded-${rounded === 1 ? '' : rounded === 6 ? 'full' : rounded}`
        );
      } else {
        customStyles.borderRadius = `${node.cornerRadius}px`;
      }
    }

    // 内边距
    const padding = {
      left: node.paddingLeft || 0,
      right: node.paddingRight || 0,
      top: node.paddingTop || 0,
      bottom: node.paddingBottom || 0,
    };

    if (padding.left === padding.right && padding.top === padding.bottom) {
      if (padding.left === padding.top && padding.left > 0) {
        const p = Math.round(padding.left / 4);
        classes.push(`p-${p}`);
      } else {
        if (padding.left > 0) {
          const px = Math.round(padding.left / 4);
          classes.push(`px-${px}`);
        }
        if (padding.top > 0) {
          const py = Math.round(padding.top / 4);
          classes.push(`py-${py}`);
        }
      }
    } else {
      if (padding.top > 0) classes.push(`pt-${Math.round(padding.top / 4)}`);
      if (padding.bottom > 0)
        classes.push(`pb-${Math.round(padding.bottom / 4)}`);
      if (padding.left > 0) classes.push(`pl-${Math.round(padding.left / 4)}`);
      if (padding.right > 0)
        classes.push(`pr-${Math.round(padding.right / 4)}`);
    }

    // 阴影效果
    if (node.effects && node.effects.length > 0) {
      const shadow = node.effects.find(
        (e: any) => e.type === 'DROP_SHADOW' && e.visible !== false
      );
      if (shadow) {
        classes.push('shadow');
      }
    }

    return {
      classes,
      customStyles:
        Object.keys(customStyles).length > 0 ? customStyles : undefined,
    };
  }

  private convertText(node: FigmaNode): ComponentData {
    const { classes, customStyles } = this.detectLayout(node);

    if (node.style) {
      // 字体大小
      const fontSize = node.style.fontSize;
      if (fontSize) {
        const sizeMap: Record<number, string> = {
          12: 'text-xs',
          14: 'text-sm',
          16: 'text-base',
          18: 'text-lg',
          20: 'text-xl',
          24: 'text-2xl',
          30: 'text-3xl',
          36: 'text-4xl',
          48: 'text-5xl',
        };
        classes.push(sizeMap[fontSize] || 'text-base');
      }

      // 字重
      const fontWeight = node.style.fontWeight;
      if (fontWeight) {
        const weightMap: Record<number, string> = {
          300: 'font-light',
          400: 'font-normal',
          500: 'font-medium',
          600: 'font-semibold',
          700: 'font-bold',
          800: 'font-extrabold',
        };
        classes.push(weightMap[fontWeight] || 'font-normal');
      }

      // 文本对齐
      const align = node.style.textAlignHorizontal?.toLowerCase();
      if (align === 'center') classes.push('text-center');
      else if (align === 'right') classes.push('text-right');
      else if (align === 'left') classes.push('text-left');

      // 文本颜色
      if (node.fills && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID') {
          const tailwindColor = this.getTailwindColor(fill.color);
          if (tailwindColor) {
            classes.push(`text-${tailwindColor}`);
          } else if (customStyles) {
            customStyles.color = this.convertColor(fill.color);
          }
        }
      }
    }

    return {
      component: 'div',
      tailwindClasses: classes,
      customStyles,
      text: node.characters,
      name: node.name,
    };
  }

  private convertImage(node: FigmaNode): ComponentData {
    const { classes, customStyles } = this.detectLayout(node);
    classes.push('object-cover');

    return {
      component: 'img',
      props: {
        src: node.imageRef || '/placeholder.png',
        alt: node.name || 'Image',
      },
      tailwindClasses: classes,
      customStyles,
      name: node.name,
    };
  }

  private convertContainer(node: FigmaNode): ComponentData {
    const { classes, customStyles } = this.detectLayout(node);
    const children =
      node.children?.map((child: any) => this.convertNode(child)) || [];

    return {
      component: 'div',
      tailwindClasses: classes,
      customStyles,
      children,
      name: node.name,
    };
  }

  private convertNode(node: FigmaNode): ComponentData {
    switch (node.type) {
      case 'TEXT':
        return this.convertText(node);
      case 'IMAGE':
      case 'RECTANGLE':
        if (node.fills && node.fills.some((f: any) => f.type === 'IMAGE')) {
          return this.convertImage(node);
        }
        return this.convertContainer(node);
      case 'FRAME':
      case 'GROUP':
      case 'COMPONENT':
      case 'INSTANCE':
        return this.convertContainer(node);
      default:
        return this.convertContainer(node);
    }
  }

  async convertToReactComponent(
    fileKey: string,
    nodeId: string
  ): Promise<ComponentData> {
    const response = await this.figmaService.getNode(fileKey, nodeId);
    const nodeData = response.nodes[nodeId];

    if (!nodeData || !nodeData.document) {
      throw new Error('Node not found');
    }

    return this.convertNode(nodeData.document);
  }

  generateReactCode(componentData: ComponentData, indent = 0): string {
    const indentStr = '  '.repeat(indent);
    const { component, tailwindClasses, customStyles, children, text, props } =
      componentData;

    // 构建类名
    const className =
      tailwindClasses.length > 0 ? tailwindClasses.join(' ') : undefined;

    // 构建属性
    const attributes: string[] = [];
    if (className) {
      attributes.push(`className="${className}"`);
    }

    if (customStyles && Object.keys(customStyles).length > 0) {
      const styleStr = Object.entries(customStyles)
        .map(
          ([key, value]) =>
            `${key}: ${typeof value === 'string' ? `'${value}'` : value}`
        )
        .join(', ');
      attributes.push(`style={{ ${styleStr} }}`);
    }

    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        attributes.push(`${key}="${value}"`);
      });
    }

    const attrsStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

    // 处理子元素
    if (text) {
      return `${indentStr}<${component}${attrsStr}>\n${indentStr}  ${text}\n${indentStr}</${component}>`;
    }

    if (children && children.length > 0) {
      const childrenStr = children
        .map(child => this.generateReactCode(child, indent + 1))
        .join('\n');
      return `${indentStr}<${component}${attrsStr}>\n${childrenStr}\n${indentStr}</${component}>`;
    }

    // 自闭合标签
    if (component === 'img') {
      return `${indentStr}<${component}${attrsStr} />`;
    }

    return `${indentStr}<${component}${attrsStr}></${component}>`;
  }

  generateFullComponent(
    componentData: ComponentData,
    componentName: string = 'FigmaComponent'
  ): string {
    const reactCode = this.generateReactCode(componentData);

    const code = `'use client';

import React from 'react';

export default function ${componentName}() {
  return (
${reactCode}
  );
}`;

    return code;
  }

  /**
   * 生成包含优化建议的完整代码
   */
  generateOptimizedComponent(
    componentData: ComponentData,
    componentName: string = 'FigmaComponent',
    options?: {
      addComments?: boolean;
      optimizePerformance?: boolean;
    }
  ): string {
    const reactCode = this.generateReactCode(componentData);

    let code = `'use client';

import React from 'react';

export default function ${componentName}() {
  return (
${reactCode}
  );
}`;

    if (options?.addComments) {
      code =
        `/**
 * ${componentName}
 *
 * 此组件由 Figma 设计稿自动生成
 * 生成时间: ${new Date().toLocaleString('zh-CN')}
 *
 * 注意事项:
 * - 使用 Tailwind CSS 进行样式设置
 * - 响应式设计已考虑移动端适配
 * - 可根据实际需求进行调整和优化
 */

` + code;
    }

    return code;
  }
}
