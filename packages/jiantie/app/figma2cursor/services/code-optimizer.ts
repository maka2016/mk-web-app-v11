/**
 * 代码优化器
 * 负责优化生成的代码，提高可读性和性能
 */
export class CodeOptimizer {
  /**
   * 优化 Tailwind 类名
   * 移除重复、合并相似的类
   */
  static optimizeTailwindClasses(classes: string[]): string[] {
    const classSet = new Set<string>();
    const priorities: Record<string, number> = {};

    classes.forEach(cls => {
      // 处理冲突的类（后者覆盖前者）
      const category = this.getClassCategory(cls);
      if (priorities[category] !== undefined) {
        // 移除旧的同类别类
        classSet.forEach(existingCls => {
          if (this.getClassCategory(existingCls) === category) {
            classSet.delete(existingCls);
          }
        });
      }
      classSet.add(cls);
      priorities[category] = 1;
    });

    return Array.from(classSet);
  }

  /**
   * 获取类的类别（用于检测冲突）
   */
  private static getClassCategory(cls: string): string {
    if (cls.startsWith('w-')) return 'width';
    if (cls.startsWith('h-')) return 'height';
    if (cls.startsWith('text-')) {
      if (cls.includes('xs') || cls.includes('sm') || cls.includes('lg')) {
        return 'font-size';
      }
      return 'text-color';
    }
    if (cls.startsWith('bg-')) return 'background';
    if (cls.startsWith('p-') || cls.startsWith('px-') || cls.startsWith('py-')) {
      return 'padding';
    }
    if (cls.startsWith('m-') || cls.startsWith('mx-') || cls.startsWith('my-')) {
      return 'margin';
    }
    if (cls.startsWith('flex')) return 'flex';
    if (cls.startsWith('grid')) return 'grid';
    return cls;
  }

  /**
   * 添加响应式类
   * 根据尺寸自动添加响应式断点
   */
  static addResponsiveClasses(
    classes: string[],
    width?: number
  ): string[] {
    const responsive = [...classes];

    // 如果宽度很大，添加响应式类
    if (width && width > 768) {
      // 在移动端使用更小的尺寸
      responsive.push('md:w-auto');
    }

    return responsive;
  }

  /**
   * 优化组件结构
   * 识别可以提取的子组件
   */
  static identifySubcomponents(componentData: any): any[] {
    const subcomponents: any[] = [];

    const traverse = (node: any, depth: number) => {
      // 如果节点有名称且深度大于2，考虑提取为子组件
      if (node.name && depth > 2 && node.children && node.children.length > 0) {
        subcomponents.push({
          name: node.name,
          data: node,
        });
      }

      if (node.children) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };

    traverse(componentData, 0);
    return subcomponents;
  }

  /**
   * 美化代码格式
   */
  static formatCode(code: string): string {
    // 移除多余的空行
    let formatted = code.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 确保属性之间有适当的间距
    formatted = formatted.replace(/>\s*</g, '>\n<');

    return formatted.trim();
  }

  /**
   * 添加注释
   */
  static addComments(code: string, componentName: string): string {
    const header = `/**
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

`;

    return header + code;
  }

  /**
   * 检测并优化性能
   */
  static optimizePerformance(code: string): string {
    // 为图片添加 loading="lazy"
    let optimized = code.replace(
      /<img([^>]*?)>/g,
      '<img$1 loading="lazy">'
    );

    // 移除重复的 loading 属性
    optimized = optimized.replace(
      /loading="lazy"\s+loading="lazy"/g,
      'loading="lazy"'
    );

    return optimized;
  }

  /**
   * 完整优化流程
   */
  static optimize(
    code: string,
    componentName: string,
    options?: {
      addComments?: boolean;
      optimizePerformance?: boolean;
      format?: boolean;
    }
  ): string {
    let optimized = code;

    if (options?.format !== false) {
      optimized = this.formatCode(optimized);
    }

    if (options?.optimizePerformance !== false) {
      optimized = this.optimizePerformance(optimized);
    }

    if (options?.addComments) {
      optimized = this.addComments(optimized, componentName);
    }

    return optimized;
  }
}
