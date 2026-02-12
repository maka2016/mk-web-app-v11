import { getPlainTextValue } from '@/components/GridEditorV3/components/Text/textUtils';
import { ThemeConfigV2 } from '@/components/GridEditorV3/types';
import { GridRow, deepClone } from '@/components/GridEditorV3/utils';
import { WorksStore } from '@/components/GridEditorV3/works-store/store';
import { random } from '@/utils';
import { getTRPCHeaders } from '@/utils/trpc';
import { IWorksData } from '../../components/GridEditorV3/works-store/types';

/** 分析/验证请求的日志上下文（可选，用于落库） */
export interface AnalyzeLogContext {
  run_id: string;
  iteration: number;
  template_id?: string;
  template_title?: string;
}

/** 验证请求的日志上下文（可选，包含执行报告） */
export interface ValidateLogContext extends AnalyzeLogContext {
  execution_report?: ExecutionReport;
}

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
  /** 需要调整项数的列表：rowDepth 为列表容器的路径，targetCount 为目标项数 */
  listAdjust?: Array<{ rowDepth: number[]; targetCount: number }>;
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
  listAdjusted: number;
  errors: Array<{ step: string; error: string }>;
}

/** 槽位角色：单行 | 行内左 | 行内右 | 列表项 */
export type SlotRole = 'single' | 'left' | 'right' | 'list-item';

/** 槽位字数档位：短(≤6字) | 中(≤20字) | 长 */
export type SlotSize = 'short' | 'medium' | 'long';

/** 文本槽（与 templateElements 对齐，增加排版语义） */
export interface TemplateSlot {
  elemId: string;
  tag: string;
  text: string;
  role: SlotRole;
  slotSize?: SlotSize;
}

/** 模版树节点（带布局语义与子槽，用于 AI 分析） */
export interface TemplateNodeForAI {
  id: string;
  tag: string;
  rowDepth: number[];
  layout: 'column' | 'row';
  gap?: string;
  isList?: boolean;
  listItemCount?: number;
  slots: TemplateSlot[];
  children: TemplateNodeForAI[];
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
   * 从文本长度与字号粗分槽位字数档位（用于 AI 约束 replace 长度）
   */
  private static getSlotSize(text: string, _fontSize?: number | string): SlotSize {
    const len = text.length;
    if (len <= 6) return 'short';
    if (len <= 20) return 'medium';
    return 'long';
  }

  /**
   * 将作品数据序列化为 AI 友好结构（树 + 槽位 role/slotSize/isList）
   */
  static serializeTemplateForAI(worksData: IWorksData): TemplateNodeForAI[] {
    const nodes: TemplateNodeForAI[] = [];
    if (!worksData.layersMap || !worksData.gridProps?.gridsData) {
      return nodes;
    }
    const gridsData = worksData.gridProps.gridsData;
    const layersMap = worksData.layersMap;

    const traverse = (rows: GridRow[], currentDepth: number[], isInsideRepeatList: boolean): TemplateNodeForAI[] => {
      const result: TemplateNodeForAI[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowDepth = [...currentDepth, i];
        const layout: 'column' | 'row' = row.style?.flexDirection === 'row' ? 'row' : 'column';
        const gap = typeof row.style?.gap === 'number' ? `${row.style.gap}px` : (row.style?.gap as string | undefined);
        const isList = row.isRepeatList === true;
        const listItemCount = isList && row.children?.length ? row.children.length : undefined;

        const slots: TemplateSlot[] = [];
        if (row.childrenIds && row.childrenIds.length > 0) {
          const getSlotRole = (idx: number): SlotRole => {
            if (isInsideRepeatList) return 'list-item';
            if (layout === 'row' && row.childrenIds!.length >= 2) {
              return idx === 0 ? 'left' : idx === 1 ? 'right' : 'single';
            }
            return 'single';
          };
          row.childrenIds.forEach((elemId, idx) => {
            const layer = layersMap[elemId];
            if (layer && layer.elementRef === 'Text' && layer.attrs) {
              const text = getPlainTextValue(layer.attrs.text || '');
              const tag = (layer.tag as string) || 'text_body';
              const role = getSlotRole(idx);
              slots.push({
                elemId,
                tag,
                text,
                role,
                slotSize: this.getSlotSize(text, layer.attrs.fontSize),
              });
            }
          });
        }

        let children: TemplateNodeForAI[] = [];
        if (row.children && row.children.length > 0) {
          if (isList) {
            children = traverse([row.children[0]], [...rowDepth, 0], true);
          } else {
            children = traverse(row.children, rowDepth, isInsideRepeatList);
          }
        }

        result.push({
          id: row.id,
          tag: (row.tag as string) || '',
          rowDepth,
          layout,
          gap,
          isList: isList || undefined,
          listItemCount,
          slots,
          children,
        });
      }
      return result;
    };

    return traverse(gridsData, [], false);
  }

  /**
   * 步骤1：分析用户故事和模版结构
   */
  static async analyzeUserStoryAndTemplate(
    userInput: string,
    worksData: IWorksData,
    templateElements: TemplateTextElement[],
    logContext?: AnalyzeLogContext
  ): Promise<AnalysisResult> {
    try {
      const body: Record<string, unknown> = {
        userInput,
        templateElements,
        gridsDataStructure: this.serializeGridsDataStructure(worksData.gridProps?.gridsData || []),
        templateStructureForAI: this.serializeTemplateForAI(worksData),
      };
      if (logContext) {
        body.run_id = logContext.run_id;
        body.iteration = logContext.iteration;
        if (logContext.template_id != null) body.template_id = logContext.template_id;
        if (logContext.template_title != null) body.template_title = logContext.template_title;
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (logContext) {
        Object.assign(headers, getTRPCHeaders());
      }
      const response = await fetch('/api/ai-generate/template-content-v2/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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
      listAdjusted: 0,
      errors: [],
    };

    const { gridPropsOperator } = worksStore;
    const themeConfig = worksStore.worksData.gridProps.themeConfig2 || ({} as ThemeConfigV2);

    // 0. 执行列表项数调整（先确定列表有几项，再执行 replace/delete/add）
    const listAdjustItems = analysisResult.contentPlan.listAdjust ?? [];
    for (const item of listAdjustItems) {
      try {
        worksStore.setWidgetStateV2({ activeRowDepth: item.rowDepth });
        gridPropsOperator.handleChangeRepeatList(item.targetCount, worksStore.getWidgetStateV2());
        report.listAdjusted++;
      } catch (error) {
        report.errors.push({
          step: 'listAdjust',
          error: `列表项数调整失败 rowDepth=[${item.rowDepth.join(',')}] targetCount=${item.targetCount}: ${error instanceof Error ? error.message : String(error)}`,
        });
        console.warn('[AIWorksSDK2] listAdjust 失败:', item, error);
      }
    }
    if (listAdjustItems.length > 0) {
      console.log(`[AIWorksSDK2] listAdjust 完成：成功 ${report.listAdjusted} 个，失败 ${listAdjustItems.length - report.listAdjusted} 个`);
    }

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

        console.log(
          `[AIWorksSDK2] 替换元素 ${replace.elemId}: "${layer.attrs?.text?.substring(0, 30)}..." -> "${replace.newText.substring(0, 30)}..."`
        );

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
    console.log(
      `[AIWorksSDK2] 替换完成：成功 ${report.replaced} 个，失败 ${report.errors.filter(e => e.step === 'replace').length} 个`
    );

    // 2. 执行内容删除（复用 GridOperatorV2 的 deleteElemIdsV2：从 grid 移除引用 + 递归删空父级 + layersMap）
    if (analysisResult.contentPlan.delete.length > 0) {
      try {
        gridPropsOperator.deleteElemIdsV2(analysisResult.contentPlan.delete, true);
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
        let row = gridPropsOperator.getRowByDepth(add.position, gridsData);
        let resolvedPosition = add.position;

        // 容错1：AI 常漏写 block 下第一层索引，导致 [0,2,...] 应为 [0,0,2,...]
        if (!row && add.position.length >= 2 && add.position[0] === 0 && add.position[1] !== 0) {
          const fallbackPosition = [0, 0, ...add.position.slice(1)];
          row = gridPropsOperator.getRowByDepth(fallbackPosition, gridsData);
          if (row) resolvedPosition = fallbackPosition;
        }

        // 容错2：精确路径不存在时（如 delete 后结构变化），尝试父级路径逐级回退
        if (!row && add.position.length >= 2) {
          for (let len = add.position.length - 1; len >= 1; len--) {
            const parentPosition = add.position.slice(0, len);
            const parentRow = gridPropsOperator.getRowByDepth(parentPosition, gridsData);
            if (parentRow) {
              row = parentRow;
              resolvedPosition = parentPosition;
              break;
            }
          }
        }

        if (!row) {
          report.errors.push({
            step: 'add',
            error: `无法找到位置 ${add.position.join(',')} 的 row`,
          });
          continue;
        }

        worksStore.setWidgetStateV2({
          activeRowDepth: resolvedPosition,
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

    // 暂不执行排版优化，仅做内容操作（replace/delete/add）
    // 原 4. 执行排版调整（adjustFlexDirection / adjustGap / adjustAlignItems / addContainers）已关闭

    return report;
  }

  /**
   * 步骤3：验证最终作品质量
   */
  static async validateFinalWorks(
    userInput: string,
    worksData: IWorksData,
    logContext?: ValidateLogContext
  ): Promise<ValidationResult> {
    try {
      const body: Record<string, unknown> = {
        userInput,
        gridsDataStructure: this.serializeGridsDataStructure(worksData.gridProps?.gridsData || []),
        templateElements: this.extractTemplateTextElements(worksData),
        templateStructureForAI: this.serializeTemplateForAI(worksData),
      };
      if (logContext) {
        body.run_id = logContext.run_id;
        body.iteration = logContext.iteration;
        if (logContext.template_id != null) body.template_id = logContext.template_id;
        if (logContext.template_title != null) body.template_title = logContext.template_title;
        if (logContext.execution_report != null) body.execution_report = logContext.execution_report;
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (logContext) {
        Object.assign(headers, getTRPCHeaders());
      }
      const response = await fetch('/api/ai-generate/template-content-v2/validate', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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
   * 传入 templateId / templateTitle 时会落库 run 与 steps，并在结束时调用 finish 更新 status 与 final_snapshot
   */
  static async generateWithAgentWorkflow(
    options: string | { userInput: string; worksStore: WorksStore; templateId?: string; templateTitle?: string }
  ): Promise<WorksStore> {
    const userInput = typeof options === 'string' ? options : options.userInput;
    const worksStore =
      typeof options === 'string' ? (options as unknown as { worksStore: WorksStore }).worksStore : options.worksStore;
    const templateId = typeof options === 'object' ? options.templateId : undefined;
    const templateTitle = typeof options === 'object' ? options.templateTitle : undefined;

    const maxIterations = 3;
    let iteration = 0;
    let alreadyRetriedDueToAddErrors = false;
    const runId =
      templateId != null || templateTitle != null
        ? typeof crypto !== 'undefined' && typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function'
          ? (crypto as { randomUUID: () => string }).randomUUID()
          : null
        : null;
    const logContext =
      runId !== null
        ? (iter: number, executionReport?: ExecutionReport): ValidateLogContext => ({
            run_id: runId,
            iteration: iter,
            template_id: templateId,
            template_title: templateTitle,
            ...(executionReport != null ? { execution_report: executionReport } : {}),
          })
        : null;

    const callFinish = async (status: 'success' | 'failed', errorMessage?: string) => {
      if (runId === null) return;
      try {
        const body: Record<string, unknown> = { run_id: runId, status };
        if (status === 'failed' && errorMessage != null) body.error_message = errorMessage;
        if (status === 'success') {
          body.final_snapshot = {
            final_text_elements: this.extractTemplateTextElements(worksStore.worksData),
            final_layout_structure: this.serializeGridsDataStructure(worksStore.worksData.gridProps?.gridsData || []),
          };
        }
        await fetch('/api/ai-generate/template-content-v2/finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getTRPCHeaders() },
          body: JSON.stringify(body),
        });
      } catch (e) {
        console.error('[AIWorksSDK2] finish 请求失败:', e);
      }
    };

    while (iteration < maxIterations) {
      iteration++;

      try {
        // 步骤1：分析
        const templateElements = this.extractTemplateTextElements(worksStore.worksData);
        const analyzeCtx = logContext
          ? { run_id: runId!, iteration, template_id: templateId, template_title: templateTitle }
          : undefined;
        const analysisResult = await this.analyzeUserStoryAndTemplate(
          userInput,
          worksStore.worksData,
          templateElements,
          analyzeCtx
        );

        // 步骤2：执行
        const executionReport = await this.executeContentAndLayout(worksStore, analysisResult);
        console.log(`[AIWorksSDK2] 执行完成 (迭代 ${iteration}):`, executionReport);

        // 步骤3：验证
        const validateCtx = logContext ? logContext(iteration, executionReport) : undefined;
        const validationResult = await this.validateFinalWorks(userInput, worksStore.worksData, validateCtx);
        console.log(`[AIWorksSDK2] 验证结果 (迭代 ${iteration}):`, validationResult);

        // 若存在「无法找到位置」的 add 错误：优先再迭代一轮（用当前结构重新 analyze），与验证是否通过无关
        const hasAddPositionErrors = executionReport.errors.some(
          e => e.step === 'add' && (e.error.includes('无法找到位置') || e.error.includes('添加元素失败'))
        );
        if (hasAddPositionErrors && !alreadyRetriedDueToAddErrors && iteration < maxIterations) {
          console.log(`[AIWorksSDK2] 存在 add 位置错误，再迭代一轮以当前结构重新分析`);
          alreadyRetriedDueToAddErrors = true;
          continue;
        }

        if (validationResult.contentValid && validationResult.layoutValid) {
          console.log(`[AIWorksSDK2] 工作流完成，共迭代 ${iteration} 次`);
          await callFinish('success');
          return worksStore;
        }

        // 如果有修复建议，在下次迭代中应用
        if (validationResult.issues.length > 0 && iteration < maxIterations) {
          console.log(`[AIWorksSDK2] 发现 ${validationResult.issues.length} 个问题，准备修复...`);
          const fixAnalysis = this.convertIssuesToAnalysis(validationResult.issues);
          await this.executeContentAndLayout(worksStore, fixAnalysis);
        }
      } catch (error) {
        console.error(`[AIWorksSDK2] 迭代 ${iteration} 失败:`, error);
        if (iteration >= maxIterations) {
          await callFinish('failed', error instanceof Error ? error.message : String(error));
          throw error;
        }
      }
    }

    console.warn(`[AIWorksSDK2] 达到最大迭代次数 ${maxIterations}，返回当前状态`);
    await callFinish('success');
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
