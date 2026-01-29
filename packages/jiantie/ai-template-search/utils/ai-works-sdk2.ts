import { getPlainTextValue } from '@/components/GridEditorV3/components/Text/textUtils';
import { ThemeConfigV2 } from '@/components/GridEditorV3/types';
import { GridRow, deepClone } from '@/components/GridEditorV3/utils';
import { WorksStore } from '@/components/GridEditorV3/works-store/store';
import { random } from '@/utils';

import { IWorksData } from '../../components/GridEditorV3/works-store/types';
import { TemplateTextElement } from './ai-works-sdk';

// 辅助函数：根据深度路径构建访问路径
const getPathByRowDepth = (rowDepth: readonly number[]): (string | number)[] => {
  const path: (string | number)[] = [];
  for (let i = 0; i < rowDepth.length; i++) {
    if (i === 0) {
      path.push(rowDepth[i]);
    } else {
      path.push('children', rowDepth[i]);
    }
  }
  return path;
};

// 辅助函数：通过路径设置值
const setByPath = <T = any>(
  obj: Record<string | number, any> | null | undefined,
  path: (string | number)[],
  value: T
): void => {
  if (!obj || !path || path.length === 0) {
    return;
  }

  let current: Record<string | number, any> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] === undefined) {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = path[path.length - 1];
  current[lastKey] = value;
};

/**
 * 分析结果：内容操作计划
 */
export interface ContentPlan {
  replace: Array<{ elemId: string; newText: string }>;
  delete: string[];
  add: Array<{ position: number[]; tag: string; text: string; order?: number }>;
}

/**
 * 分析结果：排版优化计划
 */
export interface LayoutPlan {
  adjustFlexDirection: Array<{ rowDepth: number[]; direction: 'column' | 'row' }>;
  adjustGap: Array<{ rowDepth: number[]; gap: string }>;
  adjustAlignItems?: Array<{ rowDepth: number[]; alignItems: string }>;
  addContainers?: Array<{ parentDepth: number[]; container: Partial<GridRow> }>;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  contentPlan: ContentPlan;
  layoutPlan: LayoutPlan;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  contentValid: boolean;
  layoutValid: boolean;
  issues: Array<{ type: 'content' | 'layout'; description: string; fix?: any }>;
}

/**
 * 执行报告
 */
export interface ExecutionReport {
  replaced: number;
  deleted: number;
  added: number;
  layoutAdjusted: number;
  errors: Array<{ step: string; error: string }>;
}

/**
 * AI Works SDK V2
 * 基于 Agent 工作流的模版生成 SDK
 */
export class AIWorksSDK2 {
  /**
   * 从worksData中提取所有文本元素（复用原有逻辑）
   */
  static extractTemplateTextElements(worksData: IWorksData): TemplateTextElement[] {
    const textElements: TemplateTextElement[] = [];

    if (!worksData.layersMap || !worksData.gridProps?.gridsData) {
      return textElements;
    }

    const gridsData = worksData.gridProps.gridsData;
    const layersMap = worksData.layersMap;

    const traverseRows = (rows: GridRow[], currentDepth: number[] = []): void => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowDepth = [...currentDepth, i];

        if (row.childrenIds && row.childrenIds.length > 0) {
          row.childrenIds.forEach((elemId, childrenIndex) => {
            const layer = layersMap[elemId];
            if (layer && layer.elementRef === 'Text' && layer.attrs) {
              const text = getPlainTextValue(layer.attrs.text || '');
              const tag = layer.tag || 'text_body';

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

        if (row.children && row.children.length > 0) {
          traverseRows(row.children, rowDepth);
        }
      }
    };

    traverseRows(gridsData);
    return textElements;
  }

  /**
   * 步骤1：分析用户故事和模版结构
   */
  static async analyzeUserStoryAndTemplate(
    userInput: string,
    worksData: IWorksData,
    templateElements: TemplateTextElement[]
  ): Promise<AnalysisResult> {
    try {
      const response = await fetch('/api/ai-generate/template-content-v2/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          templateElements,
          gridsDataStructure: this.serializeGridsDataStructure(worksData.gridProps?.gridsData || []),
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '分析失败');
      }

      return result.analysis as AnalysisResult;
    } catch (error) {
      console.error('[AIWorksSDK2] 分析失败:', error);
      throw error;
    }
  }

  /**
   * 步骤2：执行内容替换和排版调整
   */
  static async executeContentAndLayout(
    worksStore: WorksStore,
    analysisResult: AnalysisResult
  ): Promise<ExecutionReport> {
    const report: ExecutionReport = {
      replaced: 0,
      deleted: 0,
      added: 0,
      layoutAdjusted: 0,
      errors: [],
    };

    const { gridPropsOperator } = worksStore;
    const themeConfig = worksStore.worksData.gridProps.themeConfig2 || ({} as ThemeConfigV2);

    // 1. 执行内容替换
    console.log(`[AIWorksSDK2] 准备替换 ${analysisResult.contentPlan.replace.length} 个元素`);
    for (const replace of analysisResult.contentPlan.replace) {
      try {
        // 检查元素是否存在
        const layer = worksStore.getLayer(replace.elemId);
        if (!layer) {
          report.errors.push({
            step: 'replace',
            error: `元素 ${replace.elemId} 不存在于 layersMap 中`,
          });
          console.warn(`[AIWorksSDK2] 元素 ${replace.elemId} 不存在，跳过替换`);
          continue;
        }

        // 检查是否是文本元素
        if (layer.elementRef !== 'Text') {
          report.errors.push({
            step: 'replace',
            error: `元素 ${replace.elemId} 不是文本元素（elementRef: ${layer.elementRef}）`,
          });
          console.warn(`[AIWorksSDK2] 元素 ${replace.elemId} 不是文本元素，跳过替换`);
          continue;
        }

        console.log(`[AIWorksSDK2] 替换元素 ${replace.elemId}: "${layer.attrs?.text?.substring(0, 30)}..." -> "${replace.newText.substring(0, 30)}..."`);
        
        worksStore.changeCompAttr(replace.elemId, {
          text: replace.newText,
        });
        report.replaced++;
      } catch (error) {
        report.errors.push({
          step: 'replace',
          error: `替换元素 ${replace.elemId} 失败: ${error instanceof Error ? error.message : String(error)}`,
        });
        console.error(`[AIWorksSDK2] 替换元素 ${replace.elemId} 时出错:`, error);
      }
    }
    console.log(`[AIWorksSDK2] 替换完成：成功 ${report.replaced} 个，失败 ${report.errors.filter(e => e.step === 'replace').length} 个`);

    // 2. 执行内容删除
    if (analysisResult.contentPlan.delete.length > 0) {
      try {
        worksStore.deleteCompEntity(analysisResult.contentPlan.delete);
        report.deleted = analysisResult.contentPlan.delete.length;
      } catch (error) {
        report.errors.push({
          step: 'delete',
          error: `删除元素失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // 3. 执行内容新增
    for (const add of analysisResult.contentPlan.add) {
      try {
        const gridsData = gridPropsOperator.getGridsData();
        const row = gridPropsOperator.getRowByDepth(add.position, gridsData);
        if (!row) {
          report.errors.push({
            step: 'add',
            error: `无法找到位置 ${add.position.join(',')} 的 row`,
          });
          continue;
        }

        worksStore.setWidgetStateV2({
          activeRowDepth: add.position,
        });

        const themeStyle = (themeConfig[add.tag as keyof ThemeConfigV2] || {}) as React.CSSProperties;
        const compId = gridPropsOperator.addComponentV2(
          {
            layer: {
              elementRef: 'Text',
              attrs: {
                text: add.text.trim(),
                lineHeight: themeStyle.lineHeight || 1.5,
                fontSize: themeStyle.fontSize,
                color: themeStyle.color,
                fontFamily: themeStyle.fontFamily,
                textAlign: themeStyle.textAlign,
                ...themeStyle,
                position: undefined,
              },
              tag: add.tag,
            },
          },
          worksStore.widgetStateV2
        );

        if (compId) {
          report.added++;
        } else {
          report.errors.push({
            step: 'add',
            error: `添加元素失败，位置: ${add.position.join(',')}, tag: ${add.tag}`,
          });
        }
      } catch (error) {
        report.errors.push({
          step: 'add',
          error: `添加元素失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // 4. 执行排版调整
    const gridsData = gridPropsOperator.getGridsData();
    const nextGridsData = deepClone(gridsData);

    let hasLayoutChanges = false;

    // 4.1 调整 flex-direction
    for (const adjust of analysisResult.layoutPlan.adjustFlexDirection) {
      try {
        const row = gridPropsOperator.getRowByDepth(adjust.rowDepth, nextGridsData);
        if (row) {
          const path = getPathByRowDepth(adjust.rowDepth);
          const updatedRow = {
            ...row,
            style: {
              ...row.style,
              flexDirection: adjust.direction,
            },
          };
          setByPath(nextGridsData, path, updatedRow);
          hasLayoutChanges = true;
          report.layoutAdjusted++;
        }
      } catch (error) {
        report.errors.push({
          step: 'adjustFlexDirection',
          error: `调整 flex-direction 失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // 4.2 调整 gap
    for (const adjust of analysisResult.layoutPlan.adjustGap) {
      try {
        const row = gridPropsOperator.getRowByDepth(adjust.rowDepth, nextGridsData);
        if (row) {
          const path = getPathByRowDepth(adjust.rowDepth);
          const updatedRow = {
            ...row,
            style: {
              ...row.style,
              gap: adjust.gap,
            },
          };
          setByPath(nextGridsData, path, updatedRow);
          hasLayoutChanges = true;
          report.layoutAdjusted++;
        }
      } catch (error) {
        report.errors.push({
          step: 'adjustGap',
          error: `调整 gap 失败: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // 4.3 调整 alignItems（如果有）
    if (analysisResult.layoutPlan.adjustAlignItems) {
      for (const adjust of analysisResult.layoutPlan.adjustAlignItems) {
        try {
          const row = gridPropsOperator.getRowByDepth(adjust.rowDepth, nextGridsData);
          if (row) {
            const path = getPathByRowDepth(adjust.rowDepth);
            const updatedRow = {
              ...row,
              style: {
                ...row.style,
                alignItems: adjust.alignItems,
              },
            };
            setByPath(nextGridsData, path, updatedRow);
            hasLayoutChanges = true;
            report.layoutAdjusted++;
          }
        } catch (error) {
          report.errors.push({
            step: 'adjustAlignItems',
            error: `调整 alignItems 失败: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    }

    // 4.4 添加容器（如果有）
    if (analysisResult.layoutPlan.addContainers) {
      for (const addContainer of analysisResult.layoutPlan.addContainers) {
        try {
          worksStore.setWidgetStateV2({
            activeRowDepth: addContainer.parentDepth,
          });

          const containerRow: GridRow = {
            id: random(),
            tag: addContainer.container.tag || 'grid_root',
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              ...addContainer.container.style,
            },
            childrenIds: [],
            ...addContainer.container,
          } as GridRow;

          const containerDepth = gridPropsOperator.addRowToRowChildV2(containerRow, worksStore.widgetStateV2);

          if (containerDepth && containerDepth.length > 0) {
            hasLayoutChanges = true;
            report.layoutAdjusted++;
          }
        } catch (error) {
          report.errors.push({
            step: 'addContainer',
            error: `添加容器失败: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    }

    // 提交排版变更
    if (hasLayoutChanges) {
      gridPropsOperator.commitChangeV2(nextGridsData);
    }

    return report;
  }

  /**
   * 步骤3：验证最终作品质量
   */
  static async validateFinalWorks(userInput: string, worksData: IWorksData): Promise<ValidationResult> {
    try {
      const response = await fetch('/api/ai-generate/template-content-v2/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          gridsDataStructure: this.serializeGridsDataStructure(worksData.gridProps?.gridsData || []),
          templateElements: this.extractTemplateTextElements(worksData),
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '验证失败');
      }

      return result.validation as ValidationResult;
    } catch (error) {
      console.error('[AIWorksSDK2] 验证失败:', error);
      throw error;
    }
  }

  /**
   * 主入口：Agent 工作流
   */
  static async generateWithAgentWorkflow(userInput: string, worksStore: WorksStore): Promise<WorksStore> {
    const maxIterations = 3;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      try {
        // 步骤1：分析
        const templateElements = this.extractTemplateTextElements(worksStore.worksData);
        const analysisResult = await this.analyzeUserStoryAndTemplate(
          userInput,
          worksStore.worksData,
          templateElements
        );

        // 步骤2：执行
        const executionReport = await this.executeContentAndLayout(worksStore, analysisResult);
        console.log(`[AIWorksSDK2] 执行完成 (迭代 ${iteration}):`, executionReport);

        // 步骤3：验证
        const validationResult = await this.validateFinalWorks(userInput, worksStore.worksData);
        console.log(`[AIWorksSDK2] 验证结果 (迭代 ${iteration}):`, validationResult);

        // 如果验证通过，返回结果
        if (validationResult.contentValid && validationResult.layoutValid) {
          console.log(`[AIWorksSDK2] 工作流完成，共迭代 ${iteration} 次`);
          return worksStore;
        }

        // 如果有修复建议，在下次迭代中应用
        if (validationResult.issues.length > 0 && iteration < maxIterations) {
          console.log(`[AIWorksSDK2] 发现 ${validationResult.issues.length} 个问题，准备修复...`);
          // 将修复建议转换为新的分析结果
          const fixAnalysis = this.convertIssuesToAnalysis(validationResult.issues);
          await this.executeContentAndLayout(worksStore, fixAnalysis);
        }
      } catch (error) {
        console.error(`[AIWorksSDK2] 迭代 ${iteration} 失败:`, error);
        if (iteration >= maxIterations) {
          throw error;
        }
      }
    }

    // 如果达到最大迭代次数仍未通过验证，返回当前状态
    console.warn(`[AIWorksSDK2] 达到最大迭代次数 ${maxIterations}，返回当前状态`);
    return worksStore;
  }

  /**
   * 辅助方法：序列化 gridsData 结构（用于 AI 分析）
   */
  private static serializeGridsDataStructure(gridsData: GridRow[]): any {
    const serializeRow = (row: GridRow): any => {
      return {
        id: row.id,
        tag: row.tag,
        style: {
          display: row.style?.display,
          flexDirection: row.style?.flexDirection,
          gap: row.style?.gap,
          alignItems: row.style?.alignItems,
        },
        childrenCount: row.children?.length || 0,
        childrenIdsCount: row.childrenIds?.length || 0,
        children: row.children?.map(serializeRow) || [],
      };
    };

    return gridsData.map(serializeRow);
  }

  /**
   * 辅助方法：将验证问题转换为分析结果（用于修复）
   */
  private static convertIssuesToAnalysis(issues: ValidationResult['issues']): AnalysisResult {
    const contentPlan: ContentPlan = {
      replace: [],
      delete: [],
      add: [],
    };

    const layoutPlan: LayoutPlan = {
      adjustFlexDirection: [],
      adjustGap: [],
      adjustAlignItems: [],
    };

    for (const issue of issues) {
      if (issue.fix) {
        if (issue.type === 'content') {
          if (issue.fix.replace && Array.isArray(issue.fix.replace)) {
            contentPlan.replace.push(...issue.fix.replace);
          }
          if (issue.fix.delete && Array.isArray(issue.fix.delete)) {
            contentPlan.delete.push(...issue.fix.delete);
          }
          if (issue.fix.add && Array.isArray(issue.fix.add)) {
            contentPlan.add.push(...issue.fix.add);
          }
        }
        if (issue.type === 'layout') {
          if (issue.fix.adjustFlexDirection && Array.isArray(issue.fix.adjustFlexDirection)) {
            layoutPlan.adjustFlexDirection.push(...issue.fix.adjustFlexDirection);
          }
          if (issue.fix.adjustGap && Array.isArray(issue.fix.adjustGap)) {
            layoutPlan.adjustGap.push(...issue.fix.adjustGap);
          }
          if (issue.fix.adjustAlignItems && Array.isArray(issue.fix.adjustAlignItems)) {
            layoutPlan.adjustAlignItems!.push(...issue.fix.adjustAlignItems);
          }
        }
      }
    }

    return { contentPlan, layoutPlan };
  }
}
