import { getPlainTextValue } from '@/components/GridEditorV3/components/Text/textUtils';
import { ThemeConfigV2 } from '@/components/GridEditorV3/types';
import { GridRow } from '@/components/GridEditorV3/utils';
import { WorksStore } from '@/components/GridEditorV3/works-store/store';
import { random } from '@/utils';

import { IWorksData } from '../../components/GridEditorV3/works-store/types';

/**
 * AI生成的文案结构
 */
export interface AIGeneratedContent {
  pages: PageContent[];
}

/**
 * 页面内容
 */
export interface PageContent {
  elements: TextElement[];
}

/**
 * 文本元素
 */
export interface TextElement {
  tag: 'text_heading1' | 'text_heading2' | 'text_heading3' | 'text_body' | 'text_desc' | 'text_free';
  text: string;
  order?: number; // 元素在页面中的顺序，默认按数组顺序
}

/**
 * 模版文本元素（用于语义分析）
 */
export interface TemplateTextElement {
  elemId: string;
  tag: string;
  text: string;
  // 位置信息：元素所在的row深度路径
  rowDepth?: number[];
  // 位置信息：元素在childrenIds中的索引
  childrenIndex?: number;
  // 位置信息：元素所在的row的tag
  rowTag?: string;
}

/**
 * 模版分析结果
 */
export interface TemplateAnalysisResult {
  [elemId: string]: {
    elemId: string;
    tag: string;
    semantics: string; // AI分析的语义，如"促销主标题"
    text: string;
  };
}

/**
 * AI内容分析结果
 */
export interface AIAnalysisResult {
  [index: string]: {
    tag: string;
    semantics: string; // AI分析的语义，如"促销主标题"
    text: string;
  };
}

/**
 * AI Works SDK
 * 封装基于worksStore和gridPropsOperator的页面创建操作
 */
export class AIWorksSDK {
  /**
   * 从worksData中提取所有文本元素（按照gridsData的结构顺序）
   * @param worksData 作品数据
   * @returns 文本元素数组（按显示顺序）
   */
  static extractTemplateTextElements(worksData: IWorksData): TemplateTextElement[] {
    const textElements: TemplateTextElement[] = [];

    if (!worksData.layersMap || !worksData.gridProps?.gridsData) {
      return textElements;
    }

    const gridsData = worksData.gridProps.gridsData;
    const layersMap = worksData.layersMap;

    /**
     * 递归遍历gridsData，按照显示顺序收集文本元素
     * @param rows 当前层的rows
     * @param currentDepth 当前的深度路径
     */
    const traverseRows = (rows: GridRow[], currentDepth: number[] = []): void => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowDepth = [...currentDepth, i];

        // 收集当前row的childrenIds中的文本元素
        if (row.childrenIds && row.childrenIds.length > 0) {
          row.childrenIds.forEach((elemId, childrenIndex) => {
            const layer = layersMap[elemId];
            if (layer && layer.elementRef === 'Text' && layer.attrs) {
              const text = getPlainTextValue(layer.attrs.text || '');
              const tag = layer.tag || 'text_body';

              // 只提取有文本内容的元素
              if (text.trim()) {
                textElements.push({
                  elemId,
                  tag,
                  text,
                  rowDepth: [...rowDepth],
                  childrenIndex,
                  rowTag: row.tag,
                });
              }
            }
          });
        }

        // 递归处理子rows
        if (row.children && row.children.length > 0) {
          traverseRows(row.children, rowDepth);
        }
      }
    };

    // 从根节点开始遍历
    traverseRows(gridsData);

    return textElements;
  }

  /**
   * 根据elemId找到元素在gridsData中的位置
   * @param worksData 作品数据
   * @param elemId 元素ID
   * @returns 位置信息，包含rowDepth和childrenIndex
   */
  private static getElementPosition(
    worksData: IWorksData,
    elemId: string
  ): {
    rowDepth: number[];
    childrenIndex: number;
    rowTag?: string;
  } | null {
    if (!worksData.gridProps?.gridsData) {
      return null;
    }

    const gridsData = worksData.gridProps.gridsData;

    /**
     * 递归查找元素位置
     */
    const findElement = (
      rows: GridRow[],
      currentDepth: number[] = []
    ): {
      rowDepth: number[];
      childrenIndex: number;
      rowTag?: string;
    } | null => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowDepth = [...currentDepth, i];

        // 检查当前row的childrenIds
        if (row.childrenIds) {
          const childrenIndex = row.childrenIds.indexOf(elemId);
          if (childrenIndex !== -1) {
            return {
              rowDepth,
              childrenIndex,
              rowTag: row.tag,
            };
          }
        }

        // 递归查找子rows
        if (row.children && row.children.length > 0) {
          const found = findElement(row.children, rowDepth);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    return findElement(gridsData);
  }

  /**
   * 识别模版中的结束内容（联系方式或最后一批文案）
   * @param templateElements 模版文本元素数组（已按顺序）
   * @returns 结束内容的元素ID列表，如果没有找到则返回空数组
   */
  private static findEndContentElements(templateElements: TemplateTextElement[]): string[] {
    if (templateElements.length === 0) {
      return [];
    }

    // 联系方式关键词
    const contactKeywords = [
      '联系方式',
      '联系',
      '电话',
      '手机',
      '微信',
      'wechat',
      '邮箱',
      'email',
      '地址',
      '客服',
      '咨询',
      'qq',
      'QQ',
    ];

    // 策略1：通过语义识别联系方式
    const contactElements: string[] = [];
    for (const elem of templateElements) {
      const text = elem.text.toLowerCase();
      if (contactKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        contactElements.push(elem.elemId);
      }
    }

    if (contactElements.length > 0) {
      // 找到第一个联系方式元素，返回从该元素开始到末尾的所有元素
      const firstContactIndex = templateElements.findIndex(e => contactElements.includes(e.elemId));
      if (firstContactIndex !== -1) {
        return templateElements.slice(firstContactIndex).map(e => e.elemId);
      }
    }

    // 策略2：如果没有找到联系方式，则识别最后一批文案内容
    // 通常最后一批文案是最后一个block中的内容
    // 找到最后一个block的起始位置
    const lastBlockElements: string[] = [];
    let lastBlockTag: string | undefined;

    // 从后往前找，找到最后一个block的tag
    for (let i = templateElements.length - 1; i >= 0; i--) {
      const elem = templateElements[i];
      if (elem.rowTag === 'block') {
        lastBlockTag = elem.rowTag;
        break;
      }
    }

    // 如果找到了最后一个block，收集该block的所有元素
    if (lastBlockTag) {
      let inLastBlock = false;
      for (let i = templateElements.length - 1; i >= 0; i--) {
        const elem = templateElements[i];
        if (elem.rowTag === 'block') {
          inLastBlock = true;
        }
        if (inLastBlock) {
          lastBlockElements.unshift(elem.elemId);
        }
      }
    }

    // 如果找到了最后一批文案，返回这些元素
    if (lastBlockElements.length > 0) {
      return lastBlockElements;
    }

    // 策略3：如果都没有找到，返回最后几个元素（至少3个，最多10个）
    const lastCount = Math.min(5, templateElements.length);
    return templateElements.slice(-lastCount).map(e => e.elemId);
  }

  /**
   * 在最后元素之后插入新元素
   * @param worksStore WorksStore实例
   * @param unmatchedElements 未匹配的AI生成元素
   * @param lastElement 最后一个模版元素
   * @param themeConfig 主题配置
   * @returns 成功插入的元素ID列表
   */
  private static insertElementsAfterLastElement(
    worksStore: WorksStore,
    unmatchedElements: TextElement[],
    lastElement: TemplateTextElement,
    themeConfig: ThemeConfigV2
  ): string[] {
    if (unmatchedElements.length === 0 || !lastElement.rowDepth) {
      return [];
    }

    const { gridPropsOperator } = worksStore;
    const targetRowDepth = lastElement.rowDepth;

    // 找到父级row（通常是block或grid_root）
    // rowDepth的父级是去掉最后一个元素的路径
    const parentRowDepth = targetRowDepth.length > 1 ? targetRowDepth.slice(0, -1) : targetRowDepth;
    const parentRow = gridPropsOperator.getRowByDepth(parentRowDepth);

    if (!parentRow) {
      console.warn('[AIWorksSDK] 无法找到父级row');
      return [];
    }

    // 设置widgetState，指向父级row
    worksStore.setWidgetStateV2({
      activeRowDepth: parentRowDepth,
    });

    // 创建一个新的grid容器（flex-column）用于包裹新增的文案内容
    const gridRow: GridRow = {
      id: random(),
      tag: 'grid_root',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 'auto',
      },
      childrenIds: [],
    };

    // 在父级row的末尾插入grid容器
    const gridRowDepth = gridPropsOperator.addRowToRowChildV2(gridRow, {
      ...worksStore.widgetStateV2,
      activeRowDepth: parentRowDepth,
    });

    if (!gridRowDepth || gridRowDepth.length === 0) {
      console.warn('[AIWorksSDK] 创建grid容器失败');
      return [];
    }

    // 更新widgetState，指向新创建的grid容器
    worksStore.setWidgetStateV2({
      activeRowDepth: gridRowDepth,
    });

    // 按照order排序未匹配的元素
    const sortedElements = unmatchedElements.sort((a, b) => (a.order || 0) - (b.order || 0));

    const insertedElementIds: string[] = [];

    // 在grid容器中添加元素
    sortedElements.forEach((element, index) => {
      try {
        // 验证元素数据
        if (!element.text || !element.text.trim()) {
          console.warn(`[AIWorksSDK] 跳过空文本元素，tag: ${element.tag}, order: ${element.order}`);
          return;
        }

        // 验证tag是否有效
        const validTags = ['text_heading1', 'text_heading2', 'text_heading3', 'text_body', 'text_desc', 'text_free'];
        if (!validTags.includes(element.tag)) {
          console.warn(`[AIWorksSDK] 无效的tag: ${element.tag}，使用默认tag: text_body`);
          element.tag = 'text_body';
        }

        // 从themeConfig获取样式
        const themeStyle = themeConfig[element.tag] || {};

        // 创建文本组件，添加到grid容器中
        const widgetState = {
          ...worksStore.widgetStateV2,
          activeRowDepth: gridRowDepth,
        };

        const compId = gridPropsOperator.addComponentV2(
          {
            layer: {
              elementRef: 'Text',
              attrs: {
                text: element.text.trim(),
                lineHeight: themeStyle.lineHeight || 1.5,
                fontSize: themeStyle.fontSize,
                color: themeStyle.color,
                fontFamily: themeStyle.fontFamily,
                textAlign: themeStyle.textAlign,
                ...themeStyle,
                position: undefined,
              },
              tag: element.tag,
            },
          },
          widgetState
        );

        if (compId) {
          insertedElementIds.push(compId);
        } else {
          console.warn(`[AIWorksSDK] 创建文本组件失败，tag: ${element.tag}, text: ${element.text.substring(0, 20)}...`);
        }
      } catch (error) {
        console.error(`[AIWorksSDK] 插入元素 ${index} 时出错:`, error);
      }
    });

    return insertedElementIds;
  }

  /**
   * 降级处理：创建新页面
   * @param unmatchedElements 未匹配的元素
   * @param worksStore WorksStore实例
   * @param themeConfig 主题配置
   * @param createdPageDepths 已创建的页面深度数组（用于记录）
   */
  private static fallbackToCreatePages(
    unmatchedElements: TextElement[],
    worksStore: WorksStore,
    themeConfig: ThemeConfigV2,
    createdPageDepths: number[][]
  ): void {
    // 将未匹配的元素组织成页面结构
    const unmatchedPages: PageContent[] = [{ elements: unmatchedElements }];

    unmatchedPages.forEach((pageContent, index) => {
      try {
        const result = this.createSinglePage(pageContent, worksStore, themeConfig);
        if (result) {
          createdPageDepths.push(result.pageDepth);
          console.log(
            `[AIWorksSDK] 降级模式：成功创建新页面 ${index + 1}/${unmatchedPages.length}，包含 ${result.elementIds.length} 个元素`
          );
        }
      } catch (error) {
        console.error(`[AIWorksSDK] 降级模式：创建新页面 ${index + 1} 失败:`, error);
      }
    });
  }

  /**
   * 在结束内容之前插入新元素
   * @param worksStore WorksStore实例
   * @param unmatchedElements 未匹配的AI生成元素
   * @param endContentElemIds 结束内容的元素ID列表
   * @param templateElements 模版元素数组（用于查找位置）
   * @param themeConfig 主题配置
   * @returns 成功插入的元素ID列表
   */
  private static insertElementsBeforeEndContent(
    worksStore: WorksStore,
    unmatchedElements: TextElement[],
    endContentElemIds: string[],
    templateElements: TemplateTextElement[],
    themeConfig: ThemeConfigV2
  ): string[] {
    if (unmatchedElements.length === 0 || endContentElemIds.length === 0) {
      return [];
    }

    // 找到结束内容的第一个元素的位置
    const firstEndElemId = endContentElemIds[0];
    const firstEndElem = templateElements.find(e => e.elemId === firstEndElemId);

    if (!firstEndElem || !firstEndElem.rowDepth) {
      console.warn('[AIWorksSDK] 无法找到结束内容的位置，降级到创建新页面');
      return [];
    }

    const { gridPropsOperator } = worksStore;
    const targetRowDepth = firstEndElem.rowDepth;

    // 找到父级row（通常是block或grid_root）
    // rowDepth的父级是去掉最后一个元素的路径
    const parentRowDepth = targetRowDepth.length > 1 ? targetRowDepth.slice(0, -1) : targetRowDepth;
    const parentRow = gridPropsOperator.getRowByDepth(parentRowDepth);

    if (!parentRow) {
      console.warn('[AIWorksSDK] 无法找到父级row，降级到创建新页面');
      return [];
    }

    // 计算插入位置：在结束内容元素所在的row之前插入
    // 需要找到结束内容元素所在的row在父级children中的索引
    const targetRowIndex = targetRowDepth[targetRowDepth.length - 1];
    const insertRowIndex = targetRowIndex;

    // 设置widgetState，指向父级row
    worksStore.setWidgetStateV2({
      activeRowDepth: parentRowDepth,
    });

    // 创建一个新的grid容器（flex-column）用于包裹新增的文案内容
    const gridRow: GridRow = {
      id: random(),
      tag: 'grid_root',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 'auto',
      },
      childrenIds: [],
    };

    // 在父级row的指定位置插入grid容器
    // 注意：addRowToRowChildV2 会将row添加到末尾，我们需要手动调整位置
    const gridRowDepth = gridPropsOperator.addRowToRowChildV2(gridRow, {
      ...worksStore.widgetStateV2,
      activeRowDepth: parentRowDepth,
    });

    if (!gridRowDepth || gridRowDepth.length === 0) {
      console.warn('[AIWorksSDK] 创建grid容器失败，降级到创建新页面');
      return [];
    }

    // 调整grid容器的位置：移动到结束内容之前
    // 获取最新的gridsData
    const gridsData = gridPropsOperator.getGridsData();
    const currentGridRow = gridPropsOperator.getRowByDepth(gridRowDepth);
    const updatedParentRow = gridPropsOperator.getRowByDepth(parentRowDepth);

    if (currentGridRow && updatedParentRow?.children) {
      const currentIndex = updatedParentRow.children.findIndex(r => r.id === currentGridRow.id);
      if (currentIndex !== -1 && currentIndex > insertRowIndex) {
        // 需要移动到正确位置
        const rowToMove = updatedParentRow.children.splice(currentIndex, 1)[0];
        updatedParentRow.children.splice(insertRowIndex, 0, rowToMove);
        gridPropsOperator.commitChangeV2(gridsData);
        // 更新gridRowDepth，因为位置改变了
        const newDepth = [...parentRowDepth, insertRowIndex];
        worksStore.setWidgetStateV2({
          activeRowDepth: newDepth,
        });
      }
    }

    // 更新widgetState，指向新创建的grid容器
    worksStore.setWidgetStateV2({
      activeRowDepth: gridRowDepth,
    });

    // 按照order排序未匹配的元素
    const sortedElements = unmatchedElements.sort((a, b) => (a.order || 0) - (b.order || 0));

    const insertedElementIds: string[] = [];

    // 在grid容器中添加元素
    sortedElements.forEach((element, index) => {
      try {
        // 验证元素数据
        if (!element.text || !element.text.trim()) {
          console.warn(`[AIWorksSDK] 跳过空文本元素，tag: ${element.tag}, order: ${element.order}`);
          return;
        }

        // 验证tag是否有效
        const validTags = ['text_heading1', 'text_heading2', 'text_heading3', 'text_body', 'text_desc', 'text_free'];
        if (!validTags.includes(element.tag)) {
          console.warn(`[AIWorksSDK] 无效的tag: ${element.tag}，使用默认tag: text_body`);
          element.tag = 'text_body';
        }

        // 从themeConfig获取样式
        const themeStyle = themeConfig[element.tag] || {};

        // 创建文本组件，添加到grid容器中
        const widgetState = {
          ...worksStore.widgetStateV2,
          activeRowDepth: gridRowDepth,
        };

        const compId = gridPropsOperator.addComponentV2(
          {
            layer: {
              elementRef: 'Text',
              attrs: {
                text: element.text.trim(),
                lineHeight: themeStyle.lineHeight || 1.5,
                fontSize: themeStyle.fontSize,
                color: themeStyle.color,
                fontFamily: themeStyle.fontFamily,
                textAlign: themeStyle.textAlign,
                ...themeStyle,
                position: undefined,
              },
              tag: element.tag,
            },
          },
          widgetState
        );

        if (compId) {
          insertedElementIds.push(compId);
        } else {
          console.warn(`[AIWorksSDK] 创建文本组件失败，tag: ${element.tag}, text: ${element.text.substring(0, 20)}...`);
        }
      } catch (error) {
        console.error(`[AIWorksSDK] 插入元素 ${index} 时出错:`, error);
      }
    });

    return insertedElementIds;
  }

  /**
   * 调用联合语义分析API，同时分析模版和AI内容并返回匹配结果
   * @param templateElements 模版文本元素数组
   * @param aiElements AI生成元素数组
   * @returns 匹配结果数组
   */
  private static async analyzeAndMatch(
    templateElements: TemplateTextElement[],
    aiElements: Array<{ index: string; tag: string; text: string }>
  ): Promise<Array<{
    templateElemId: string;
    aiIndex: string;
    semantics: string;
    aiText: string;
  }> | null> {
    try {
      const response = await fetch('/api/ai-generate/analyze-semantics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateElements,
          aiElements,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.warn('[AIWorksSDK] 联合语义分析失败:', result.message);
        return null;
      }

      return result.matches || [];
    } catch (error) {
      console.error('[AIWorksSDK] 联合语义分析API调用失败:', error);
      return null;
    }
  }

  /**
   * 根据AI生成的文案创建页面和内容（支持语义匹配替换）
   * @param content AI生成的文案结构
   * @param worksStore WorksStore实例（可选，如果不提供则创建新的）
   * @returns WorksStore实例
   */
  static async createPagesWithContent(content: AIGeneratedContent, worksStore?: WorksStore): Promise<WorksStore> {
    // 如果没有提供worksStore，创建新的
    if (!worksStore) {
      throw new Error('worksStore is required');
    }

    const themeConfig = worksStore.worksData.gridProps.themeConfig2 || ({} as ThemeConfigV2);
    const createdPageDepths: number[][] = [];

    // 验证输入数据
    if (!content || !Array.isArray(content.pages) || content.pages.length === 0) {
      throw new Error('无效的内容数据：pages数组为空或不存在');
    }

    try {
      // 步骤1：提取模版文本元素
      const templateElements = this.extractTemplateTextElements(worksStore.worksData);

      // 步骤2：提取AI生成元素
      const aiElements: TextElement[] = [];
      content.pages.forEach(page => {
        page.elements.forEach((element, elementIndex) => {
          aiElements.push({
            ...element,
            order: element.order ?? elementIndex,
          });
        });
      });

      // 步骤3：联合语义分析和匹配
      let matches: Array<{
        templateElemId: string;
        aiIndex: string;
        semantics: string;
        aiText: string;
      }> | null = null;
      let matchedCount = 0;
      const matchedAiIndices = new Set<number>();

      if (templateElements.length > 0 && aiElements.length > 0) {
        console.log(
          `[AIWorksSDK] 提取到 ${templateElements.length} 个模版元素和 ${aiElements.length} 个AI元素，开始联合语义分析...`
        );

        // 为AI元素添加index用于分析
        const aiElementsForAnalysis = aiElements.map((elem, idx) => ({
          index: `ai_elem_${idx}`,
          tag: elem.tag,
          text: elem.text,
        }));

        matches = await this.analyzeAndMatch(templateElements, aiElementsForAnalysis);

        if (matches && matches.length > 0) {
          console.log(`[AIWorksSDK] 联合语义分析完成，找到 ${matches.length} 个匹配项`);

          // 执行替换
          for (const match of matches) {
            try {
              worksStore.changeCompAttr(match.templateElemId, {
                text: match.aiText,
              });
              matchedCount++;

              // 记录已匹配的AI元素索引
              const aiIndex = parseInt(match.aiIndex.replace('ai_elem_', ''));
              if (!isNaN(aiIndex)) {
                matchedAiIndices.add(aiIndex);
              }

              console.log(`[AIWorksSDK] 替换元素 ${match.templateElemId}，语义: ${match.semantics}`);
            } catch (error) {
              console.error(`[AIWorksSDK] 替换元素 ${match.templateElemId} 失败:`, error);
            }
          }
        } else {
          console.warn('[AIWorksSDK] 未找到匹配项，将使用新增模式');
        }
      } else {
        if (templateElements.length === 0) {
          console.log('[AIWorksSDK] 模版中没有文本元素，将使用新增模式');
        }
        if (aiElements.length === 0) {
          console.warn('[AIWorksSDK] AI生成内容为空');
        }
      }

      // 步骤4：处理未匹配的元素（插入到结束内容之前）
      // 收集所有未匹配的元素
      const unmatchedElements: TextElement[] = [];
      content.pages.forEach((page, pageIndex) => {
        page.elements.forEach((element, elementIndex) => {
          // 计算该元素在aiElements中的索引
          let globalIndex = 0;
          for (let p = 0; p < pageIndex; p++) {
            globalIndex += content.pages[p].elements.length;
          }
          globalIndex += elementIndex;

          // 如果该元素未被匹配，则添加到未匹配列表
          if (!matchedAiIndices.has(globalIndex)) {
            unmatchedElements.push(element);
          }
        });
      });

      // 如果有未匹配的元素，尝试插入到结束内容之前
      if (unmatchedElements.length > 0) {
        console.log(`[AIWorksSDK] 处理 ${unmatchedElements.length} 个未匹配元素，尝试插入到结束内容之前`);

        try {
          // 识别结束内容
          const endContentElemIds = this.findEndContentElements(templateElements);

          if (endContentElemIds.length > 0) {
            console.log(`[AIWorksSDK] 找到结束内容，包含 ${endContentElemIds.length} 个元素`);

            // 在结束内容之前插入未匹配的元素
            const insertedElementIds = this.insertElementsBeforeEndContent(
              worksStore,
              unmatchedElements,
              endContentElemIds,
              templateElements,
              themeConfig
            );

            if (insertedElementIds.length > 0) {
              console.log(`[AIWorksSDK] 成功插入 ${insertedElementIds.length} 个元素到结束内容之前`);
            } else {
              console.warn('[AIWorksSDK] 插入失败，降级到创建新页面模式');
              // 降级：创建新页面
              this.fallbackToCreatePages(unmatchedElements, worksStore, themeConfig, createdPageDepths);
            }
          } else {
            console.log('[AIWorksSDK] 未找到结束内容，将插入到最后的元素之后');

            // 如果没有结束内容，插入到最后的元素之后
            const lastElement = templateElements[templateElements.length - 1];
            if (lastElement && lastElement.rowDepth) {
              const insertedElementIds = this.insertElementsAfterLastElement(
                worksStore,
                unmatchedElements,
                lastElement,
                themeConfig
              );

              if (insertedElementIds.length === 0) {
                console.warn('[AIWorksSDK] 插入失败，降级到创建新页面模式');
                // 降级：创建新页面
                this.fallbackToCreatePages(unmatchedElements, worksStore, themeConfig, createdPageDepths);
              }
            } else {
              console.warn('[AIWorksSDK] 无法找到最后元素的位置，降级到创建新页面模式');
              // 降级：创建新页面
              this.fallbackToCreatePages(unmatchedElements, worksStore, themeConfig, createdPageDepths);
            }
          }
        } catch (error) {
          console.error('[AIWorksSDK] 插入元素时出错，降级到创建新页面模式:', error);
          // 降级：创建新页面
          this.fallbackToCreatePages(unmatchedElements, worksStore, themeConfig, createdPageDepths);
        }
      }

      console.log(`[AIWorksSDK] 处理完成：替换 ${matchedCount} 个元素，新增 ${createdPageDepths.length} 个页面`);

      if (createdPageDepths.length === 0 && matchedCount === 0) {
        throw new Error('未能成功处理任何内容');
      }

      return worksStore;
    } catch (error) {
      console.error('[AIWorksSDK] 语义匹配流程出错，降级到新增模式:', error);
      // 降级处理：如果语义分析失败，使用原有逻辑
      let matchedCount = 0;
      content.pages.forEach((pageContent, index) => {
        try {
          const result = this.createSinglePage(pageContent, worksStore!, themeConfig);
          if (result) {
            createdPageDepths.push(result.pageDepth);
            console.log(
              `[AIWorksSDK] 成功创建页面 ${index + 1}/${content.pages.length}，包含 ${result.elementIds.length} 个元素`
            );
          } else {
            console.warn(`[AIWorksSDK] 创建页面 ${index + 1} 失败`);
          }
        } catch (pageError) {
          console.error(`[AIWorksSDK] 创建页面 ${index + 1} 时出错:`, pageError);
        }
      });

      if (createdPageDepths.length === 0 && matchedCount === 0) {
        throw new Error('未能成功创建任何页面');
      }

      return worksStore;
    }
  }

  /**
   * 创建单个页面及其内容
   */
  private static createSinglePage(
    pageContent: PageContent,
    worksStore: WorksStore,
    themeConfig: ThemeConfigV2
  ): {
    pageDepth: number[];
    contentRowDepth: number[];
    elementIds: string[];
  } | null {
    const { gridPropsOperator } = worksStore;

    // 1. 创建页面容器（block）
    const pageRow: GridRow = {
      id: random(),
      tag: 'block',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
        padding: '30px 20px 50px',
        width: 'auto',
        height: 'auto',
      },
      childrenIds: [],
    };

    const pageDepth = gridPropsOperator.addRowToRootV2(pageRow);
    if (!pageDepth || pageDepth.length === 0) {
      console.error('Failed to create page container');
      return null;
    }

    // 更新 widgetStateV2，确保 activeRowDepth 指向新创建的页面
    worksStore.setWidgetStateV2({
      activeRowDepth: pageDepth,
    });

    // 2. 在页面容器内创建内容容器（grid_root）
    const contentRow: GridRow = {
      id: random(),
      tag: 'grid_root',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 'auto',
      },
      childrenIds: [],
    };

    // 使用更新后的 widgetStateV2 创建内容容器
    const pageWidgetState = {
      ...worksStore.widgetStateV2,
      activeRowDepth: pageDepth,
    };
    const contentRowDepth = gridPropsOperator.addRowToRowChildV2(contentRow, pageWidgetState);
    if (!contentRowDepth || contentRowDepth.length === 0) {
      console.error('Failed to create content container');
      return null;
    }

    // 更新 widgetStateV2，确保 activeRowDepth 指向内容容器
    worksStore.setWidgetStateV2({
      activeRowDepth: contentRowDepth,
    });

    // 3. 在内容容器内添加文本组件
    const elementIds: string[] = [];
    const sortedElements = pageContent.elements.sort((a, b) => (a.order || 0) - (b.order || 0));

    // 使用更新后的 widgetStateV2 添加文本组件
    const contentWidgetState = {
      ...worksStore.widgetStateV2,
      activeRowDepth: contentRowDepth,
    };

    sortedElements.forEach((element, elementIndex) => {
      try {
        // 验证元素数据
        if (!element.text || !element.text.trim()) {
          console.warn(`[AIWorksSDK] 跳过空文本元素，tag: ${element.tag}, order: ${element.order}`);
          return;
        }

        // 验证tag是否有效
        const validTags = ['text_heading1', 'text_heading2', 'text_heading3', 'text_body', 'text_desc', 'text_free'];
        if (!validTags.includes(element.tag)) {
          console.warn(`[AIWorksSDK] 无效的tag: ${element.tag}，使用默认tag: text_body`);
          element.tag = 'text_body';
        }

        // 从themeConfig获取样式
        const themeStyle = themeConfig[element.tag] || {};

        // 创建文本组件
        const compId = gridPropsOperator.addComponentV2(
          {
            layer: {
              elementRef: 'Text',
              attrs: {
                text: element.text.trim(),
                lineHeight: themeStyle.lineHeight || 1.5,
                fontSize: themeStyle.fontSize,
                color: themeStyle.color,
                fontFamily: themeStyle.fontFamily,
                // fontUrl: themeStyle.fontUrl,
                textAlign: themeStyle.textAlign,
                ...themeStyle,
                position: undefined,
              },
              tag: element.tag,
            },
          },
          contentWidgetState
        );

        if (compId) {
          elementIds.push(compId);
        } else {
          console.warn(`[AIWorksSDK] 创建文本组件失败，tag: ${element.tag}, text: ${element.text.substring(0, 20)}...`);
        }
      } catch (error) {
        console.error(`[AIWorksSDK] 创建元素 ${elementIndex} 时出错:`, error);
        // 继续处理其他元素
      }
    });

    return {
      pageDepth,
      contentRowDepth,
      elementIds,
    };
  }
}
