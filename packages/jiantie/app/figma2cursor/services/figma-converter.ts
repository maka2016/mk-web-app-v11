import { FigmaService } from './figma';

interface Style {
  [key: string]: string | number;
}

interface ComponentData {
  component: string;
  styles: Style;
  children?: ComponentData[];
}

export class FigmaConverter {
  private figmaService: FigmaService;

  constructor(figmaService: FigmaService) {
    this.figmaService = figmaService;
  }

  private convertColor(color: any): string {
    if (!color) return 'transparent';
    const { r, g, b, a } = color;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  private convertLayout(node: any): Style {
    const style: Style = {
      position: 'relative',
      width: node.absoluteBoundingBox?.width || 'auto',
      height: node.absoluteBoundingBox?.height || 'auto',
      left: node.absoluteBoundingBox?.x || 0,
      top: node.absoluteBoundingBox?.y || 0,
    };

    if (node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID') {
        style.backgroundColor = this.convertColor(fill.color);
      }
    }

    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];
      style.border = `${stroke.weight}px solid ${this.convertColor(stroke.color)}`;
    }

    if (node.cornerRadius) {
      style.borderRadius = `${node.cornerRadius}px`;
    }

    if (node.paddingLeft) style.paddingLeft = `${node.paddingLeft}px`;
    if (node.paddingRight) style.paddingRight = `${node.paddingRight}px`;
    if (node.paddingTop) style.paddingTop = `${node.paddingTop}px`;
    if (node.paddingBottom) style.paddingBottom = `${node.paddingBottom}px`;

    return style;
  }

  private convertText(node: any): ComponentData {
    const style = this.convertLayout(node);
    style.fontSize = `${node.style.fontSize}px`;
    style.fontFamily = node.style.fontFamily;
    style.fontWeight = node.style.fontWeight;
    style.lineHeight = node.style.lineHeightPx
      ? `${node.style.lineHeightPx}px`
      : 'normal';
    style.textAlign = node.style.textAlignHorizontal?.toLowerCase() || 'left';
    style.color = this.convertColor(node.fills?.[0]?.color);

    return {
      component: 'div',
      styles: style,
      children: [{ component: node.characters, styles: {} }],
    };
  }

  private convertImage(node: any): ComponentData {
    const style = this.convertLayout(node);
    return {
      component: 'img',
      styles: {
        ...style,
        objectFit: 'cover',
        src: node.imageRef || '',
      },
    };
  }

  private convertContainer(node: any): ComponentData {
    const style = this.convertLayout(node);
    const children =
      node.children?.map((child: any) => this.convertNode(child)) || [];

    return {
      component: 'div',
      styles: style,
      children,
    };
  }

  private convertNode(node: any): ComponentData {
    switch (node.type) {
      case 'TEXT':
        return this.convertText(node);
      case 'IMAGE':
        return this.convertImage(node);
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
    const node = await this.figmaService.getNode(fileKey, nodeId);
    return this.convertNode(node);
  }

  generateReactCode(componentData: ComponentData): string {
    const styleString = Object.entries(componentData.styles)
      .map(
        ([key, value]) =>
          `${key}: ${typeof value === 'string' ? `'${value}'` : value}`
      )
      .join(',\n    ');

    const children = componentData.children
      ?.map(child => {
        if (typeof child.component === 'string' && !child.styles) {
          return child.component;
        }
        return this.generateReactCode(child);
      })
      .join('\n      ');

    return `
      <${componentData.component}
        style={{
          ${styleString}
        }}
      >
        ${children || ''}
      </${componentData.component}>
    `;
  }
}
