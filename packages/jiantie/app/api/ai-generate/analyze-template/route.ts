import { AIWorksSDK } from '@/ai-template-search/utils/ai-works-sdk';
import { ListItemField, TemplateFormField } from '@/app/desktop/ai-gen-works/types';
import { getPlainTextValue } from '@/components/GridEditorV3/components/Text/textUtils';
import { GridRow } from '@/components/GridEditorV3/utils';
import { WorksStore } from '@/components/GridEditorV3/works-store/store';
import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import { getTemplateDataWithOSS } from '@/server';
import { SerializedWorksEntity } from '@/utils';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '@mk/jiantie/v11-database';
import { generateText } from 'ai';
import { createProxyFetch } from '../proxy-fetch';

export const dynamic = 'force-dynamic';

/**
 * 从GridRow中提取文本字段结构（只提取Text元素，忽略图片）
 * 返回字段结构，不包含默认值
 */
function extractTextFieldsStructureFromRow(
  row: GridRow,
  layersMap: IWorksData['layersMap']
): Omit<ListItemField, 'defaultValue'>[] {
  const fields: Omit<ListItemField, 'defaultValue'>[] = [];

  if (!row.childrenIds || !layersMap) {
    return fields;
  }

  row.childrenIds.forEach((elemId, index) => {
    const layer = layersMap[elemId];
    if (layer && layer.elementRef === 'Text' && layer.attrs) {
      const text = getPlainTextValue(layer.attrs.text || '');
      const tag = layer.tag || 'text_body';

      // 只提取有文本内容的元素
      if (text.trim()) {
        // 根据tag判断字段类型
        const fieldType: 'text' | 'textarea' =
          tag === 'text_heading1' || tag === 'text_heading2' || tag === 'text_heading3' || tag === 'text_free'
            ? 'text'
            : 'textarea';

        // 使用文本内容作为label（如果太长则截断）
        const label = text.length > 30 ? `${text.substring(0, 30)}...` : text;

        fields.push({
          key: `field_${index}`,
          label,
          type: fieldType,
          required: false,
        });
      }
    }
  });

  return fields;
}

/**
 * 从GridRow中提取文本字段的值（用于获取默认值）
 */
function extractTextValuesFromRow(
  row: GridRow,
  layersMap: IWorksData['layersMap'],
  fieldKeys: string[]
): Record<string, string> {
  const values: Record<string, string> = {};

  if (!row.childrenIds || !layersMap) {
    return values;
  }

  let fieldIndex = 0;
  row.childrenIds.forEach(elemId => {
    const layer = layersMap[elemId];
    if (layer && layer.elementRef === 'Text' && layer.attrs) {
      const text = getPlainTextValue(layer.attrs.text || '');

      // 只提取有文本内容的元素
      if (text.trim() && fieldIndex < fieldKeys.length) {
        values[fieldKeys[fieldIndex]] = text;
        fieldIndex++;
      }
    }
  });

  return values;
}

/**
 * 从worksData中提取列表字段
 */
function extractListFields(worksData: IWorksData): TemplateFormField[] {
  const listFields: TemplateFormField[] = [];

  if (!worksData.gridProps?.gridsData || !worksData.layersMap) {
    return listFields;
  }

  const gridsData = worksData.gridProps.gridsData;
  const layersMap = worksData.layersMap;

  /**
   * 递归遍历gridsData，查找isRepeatList为true的row
   */
  const traverseRows = (rows: GridRow[]): void => {
    for (const row of rows) {
      // 检查是否是列表
      if (row.isRepeatList && row.children && row.children.length > 0) {
        // 从第一个子项提取字段结构（只提取结构，不包含默认值）
        const firstItem = row.children[0];
        const itemFieldsStructure = extractTextFieldsStructureFromRow(firstItem, layersMap);

        // 如果提取到了字段，创建列表字段定义
        if (itemFieldsStructure.length > 0) {
          // 获取所有字段的key
          const fieldKeys = itemFieldsStructure.map(f => f.key);

          // 遍历所有列表项，提取每个列表项的默认值
          const defaultItems: Array<Record<string, string>> = [];
          for (const listItem of row.children) {
            const itemValues = extractTextValuesFromRow(listItem, layersMap, fieldKeys);
            defaultItems.push(itemValues);
          }

          // 为每个字段设置默认值（从第一个列表项提取，用于label优化）
          const improvedItemFields: ListItemField[] = itemFieldsStructure.map(field => {
            // 从第一个列表项的默认值中提取label（如果第一个列表项有值）
            let label = field.label;
            if (defaultItems.length > 0 && defaultItems[0][field.key]) {
              const firstValue = defaultItems[0][field.key];
              if (firstValue.length <= 30) {
                label = firstValue;
              }
            }

            return {
              ...field,
              label,
              // 不设置defaultValue，因为每个列表项的默认值不同
              defaultValue: undefined,
            };
          });

          listFields.push({
            key: `list_${row.id}`,
            label: row.name || row.alias || '列表',
            type: 'list',
            required: false,
            description: `包含${row.children.length}个列表项`,
            itemFields: improvedItemFields,
            defaultItemCount: row.children.length,
            minItems: 1,
            // 添加每个列表项的默认值数组
            defaultItems: defaultItems,
          });
        }
        // 注意：对于isRepeatList的row，不应该递归遍历它的children
        // 因为children是列表项，不是嵌套的结构，继续遍历会导致死循环
        continue;
      }

      // 递归处理子rows（非列表的情况）
      if (row.children && row.children.length > 0) {
        traverseRows(row.children);
      }
    }
  };

  traverseRows(gridsData);

  return listFields;
}

/**
 * 分析模版内容，提取表单字段
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templateId } = body;

    if (!templateId || typeof templateId !== 'string' || !templateId.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '模版ID不能为空',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. 获取模版数据
    const templateData = await getTemplateDataWithOSS({
      prisma,
      templateId: templateId.trim(),
    });

    if (!templateData || !templateData.work_data) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '模版数据无效，请检查模版ID',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. 提取模版文本元素
    const templateWorksStore = new WorksStore({
      worksId: () => templateId.trim(),
      readonly: false,
      autoSaveFreq: -1,
      worksData: templateData.work_data as unknown as IWorksData,
      worksDetail: templateData.detail as unknown as SerializedWorksEntity,
    });

    const templateElements = AIWorksSDK.extractTemplateTextElements(templateWorksStore.worksData);

    // 2.1 提取列表字段
    const listFields = extractListFields(templateWorksStore.worksData);

    if (templateElements.length === 0 && listFields.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '模版中没有找到文本内容或列表结构',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. 构建模版文本内容用于AI分析
    const templateText = templateElements
      .map((elem, index) => {
        const tag = elem.tag || 'text_body';
        const text = elem.text || '';
        return `${index + 1}. [${tag}] ${text}`;
      })
      .join('\n');

    // 4. 调用AI分析模版内容，提取表单字段
    const customFetch = createProxyFetch();
    const googleClient = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      fetch: customFetch,
    });

    const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-2.0-flash-lite';

    const prompt = `你是一个表单设计专家。请分析以下模版内容，识别出需要用户填写的关键信息字段，并从模版中提取对应的值作为默认值。

【模版内容】：
${templateText}

请识别模版中需要用户填写的关键信息字段（如：活动名称、时间、地点、联系方式、人数等），并为每个字段生成表单字段定义。同时，从模版内容中提取每个字段对应的实际值作为默认值。

要求：
1. 只提取关键信息字段，不要提取所有文本
2. 识别常见的信息类型：活动名称、时间、地点、联系方式、联系人、人数、主题、描述等
3. 为每个字段分配合适的类型：
   - text: 短文本（如名称、主题）
   - textarea: 长文本（如描述、内容）
   - date: 日期时间（如活动时间、开始时间）
   - number: 数字（如人数、数量）
4. 根据字段在模版中的重要性判断是否必填
5. 为字段生成合适的标签和占位符
6. 字段数量控制在3-8个之间，不要过多
7. **重要**：从模版内容中提取每个字段对应的实际值，作为 defaultValue。如果模版中某个字段有具体值（如"元旦放假通知"、"2024年1月1日"等），请提取出来；如果模版中该字段是占位符或示例值，也请提取作为默认值

必须返回有效的JSON格式，不要包含任何markdown代码块标记。

返回JSON格式（严格按照此格式，不要添加任何其他内容）：
{
  "fields": [
    {
      "key": "field_key",
      "label": "字段标签",
      "type": "text",
      "required": true,
      "placeholder": "请输入...",
      "description": "字段说明（可选）",
      "defaultValue": "从模版中提取的实际值（如果有）"
    }
  ]
}`;

    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.3, // 降低温度以提高一致性
    });

    // 5. 解析AI返回的JSON
    let analysisResult;
    try {
      let text = result.text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      analysisResult = JSON.parse(text);
    } catch (parseError) {
      console.error('[AI Analyze Template API] JSON解析失败:', parseError);
      console.error('[AI Analyze Template API] AI返回的原始文本:', result.text);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据格式不正确，无法解析为JSON',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. 验证和清理字段数据
    if (!analysisResult || !Array.isArray(analysisResult.fields)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据结构不正确：缺少fields数组',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const validFields: TemplateFormField[] = [];

    const fieldTypes = ['text', 'textarea', 'date', 'number'];
    const seenKeys = new Set<string>();

    // 处理AI返回的普通字段
    for (const field of analysisResult.fields) {
      if (
        field &&
        typeof field.key === 'string' &&
        typeof field.label === 'string' &&
        typeof field.type === 'string' &&
        typeof field.required === 'boolean' &&
        field.key.trim() &&
        field.label.trim() &&
        fieldTypes.includes(field.type)
      ) {
        // 确保key唯一
        let uniqueKey = field.key.trim();
        let counter = 1;
        while (seenKeys.has(uniqueKey)) {
          uniqueKey = `${field.key.trim()}_${counter}`;
          counter++;
        }
        seenKeys.add(uniqueKey);

        // 处理默认值
        let defaultValue: string | number | undefined = undefined;
        if (field.defaultValue !== undefined && field.defaultValue !== null) {
          if (field.type === 'number') {
            const numValue = Number(field.defaultValue);
            if (!isNaN(numValue)) {
              defaultValue = numValue;
            }
          } else {
            defaultValue = String(field.defaultValue).trim();
          }
        }

        validFields.push({
          key: uniqueKey,
          label: field.label.trim(),
          type: field.type as 'text' | 'textarea' | 'date' | 'number',
          required: field.required,
          placeholder:
            field.placeholder && typeof field.placeholder === 'string' ? field.placeholder.trim() : undefined,
          description:
            field.description && typeof field.description === 'string' ? field.description.trim() : undefined,
          defaultValue: defaultValue,
        });
      }
    }

    // 合并列表字段（确保key唯一）
    for (const listField of listFields) {
      let uniqueKey = listField.key;
      let counter = 1;
      while (seenKeys.has(uniqueKey)) {
        uniqueKey = `${listField.key}_${counter}`;
        counter++;
      }
      seenKeys.add(uniqueKey);
      validFields.push({
        ...listField,
        key: uniqueKey,
      });
    }

    if (validFields.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '未能从模版中提取到有效的表单字段',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        fields: validFields,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Analyze Template API] 分析失败:', error);

    // 检查是否是代理相关的错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isProxyError =
      errorMessage.includes('Connection terminated') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('socket hang up') ||
      errorMessage.includes('proxy');

    const proxyUrl =
      process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

    return new Response(
      JSON.stringify({
        success: false,
        message: isProxyError
          ? `代理连接失败: ${errorMessage}${proxyUrl ? ` (代理: ${proxyUrl})` : ''}。请检查代理配置或尝试禁用代理。`
          : errorMessage || '分析失败，请重试',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
