import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '@mk/jiantie/v11-database';
import { validateRequest } from '@/server/auth/token-validator';
import { createProxyFetch } from '../../proxy-fetch';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userInput,
      gridsDataStructure,
      templateElements,
      templateStructureForAI,
      run_id,
      iteration,
      template_id,
      template_title,
      execution_report,
    } = body;

    const shouldLog = typeof run_id === 'string' && run_id.trim() !== '';
    if (shouldLog) {
      const token = req.headers.get('x-token');
      const uidHeader = req.headers.get('x-uid');
      const appid = req.headers.get('x-appid') ?? undefined;
      if (!token || !uidHeader) {
        return new Response(
          JSON.stringify({ success: false, message: '缺少鉴权头 x-token / x-uid' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const auth = await validateRequest(token, Number(uidHeader), appid);
      if (!auth.isValid) {
        return new Response(
          JSON.stringify({ success: false, message: auth.error || '鉴权失败' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      await prisma.aiTemplateGenerationRunEntity.upsert({
        where: { id: run_id },
        create: {
          id: run_id,
          uid: auth.uid!,
          appid: auth.appid ?? null,
          template_id: template_id ?? null,
          template_title: template_title ?? null,
          user_input: userInput?.trim() ?? null,
          status: 'running',
        },
        update: { updated_at: new Date() },
      });
    }

    if (!userInput || typeof userInput !== 'string' || !userInput.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '用户输入不能为空',
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

    const customFetch = createProxyFetch();
    const googleClient = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      fetch: customFetch,
    });

    const modelName =
      process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-2.0-flash-lite';

    // 构建当前作品内容描述（含 elemId，便于 fix.replace 引用）
    const currentContent = templateElements
      .map((elem: any, index: number) => {
        const tag = elem.tag || 'text_body';
        const text = elem.text || '';
        const elemId = elem.elemId || '';
        return `  ${index + 1}. ID: ${elemId} [${tag}] ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
      })
      .join('\n');

    // 构建布局结构描述：仅用简短层级摘要，不传完整 JSON 以节省 token
    function formatLayoutSummary(nodes: any[], depthPath: number[] = []): string {
      return (nodes || [])
        .map((node: any, i) => {
          const path = [...depthPath, i];
          const dir = node.style?.flexDirection === 'row' ? 'row' : 'column';
          const line = `[${path.join(',')}] ${(node.tag || 'row')} ${dir}`;
          const children = node.children && node.children.length > 0
            ? '\n' + formatLayoutSummary(node.children, path)
            : '';
          return line + children;
        })
        .join('\n');
    }
    const layoutSummary = formatLayoutSummary(gridsDataStructure || []);

    // 若有 AI 友好结构，生成槽位结构描述供校验对照（角色、字数、列表）
    function formatTemplateStructureForAI(nodes: any[], indent = ''): string {
      return nodes
        .map((node, i) => {
          const prefix = indent ? `${indent}  ` : '';
          const layoutDesc = node.layout === 'row' ? '横向排列(左-右)' : '纵向排列';
          const listDesc = node.isList ? ` [列表容器，共${node.listItemCount ?? 0}项]` : '';
          let block = `${prefix}[${node.rowDepth?.join(',') ?? i}] ${node.tag || 'row'} ${layoutDesc}${listDesc}\n`;
          if (node.slots && node.slots.length > 0) {
            node.slots.forEach((slot: any) => {
              const roleDesc = slot.role === 'left' ? '左' : slot.role === 'right' ? '右' : slot.role === 'list-item' ? '列表项' : '单行';
              const sizeDesc = slot.slotSize ? ` 字数约束:${slot.slotSize === 'short' ? '短(≤6字)' : slot.slotSize === 'medium' ? '中(≤20字)' : '长'}` : '';
              block += `${prefix}  槽位 ID:${slot.elemId} [${slot.tag}] 角色:${roleDesc}${sizeDesc}\n`;
            });
          }
          if (node.children && node.children.length > 0) {
            block += formatTemplateStructureForAI(node.children, prefix);
          }
          return block;
        })
        .join('');
    }

    // 收集所有列表容器节点，用于「列表容器一览」便于校验时对照
    function collectListNodes(nodes: any[]): Array<{ rowDepth: number[]; listItemCount: number }> {
      const list: Array<{ rowDepth: number[]; listItemCount: number }> = [];
      function walk(ns: any[]) {
        if (!Array.isArray(ns)) return;
        for (const node of ns) {
          if (node.isList === true && Array.isArray(node.rowDepth)) {
            list.push({
              rowDepth: node.rowDepth,
              listItemCount: typeof node.listItemCount === 'number' ? node.listItemCount : 0,
            });
          }
          if (node.children && node.children.length > 0) walk(node.children);
        }
      }
      walk(nodes);
      return list;
    }
    const hasStructureForAI = Array.isArray(templateStructureForAI) && templateStructureForAI.length > 0;
    const listNodes = hasStructureForAI ? collectListNodes(templateStructureForAI) : [];
    const hasListNodes = listNodes.length > 0;
    const listStructureSection =
      hasListNodes &&
      `**列表容器一览**（可调整项数的列表，rowDepth 供 fix 参考）：
${listNodes.map((n, i) => `  - 列表${i + 1} rowDepth: [${n.rowDepth.join(',')}] 当前项数: ${n.listItemCount}`).join('\n')}
`;
    const structureSection = hasStructureForAI
      ? `

模版槽位结构（含角色与字数约束、布局层级与 rowDepth，请对照此结构检查当前作品；fix 中的 rowDepth 请从本结构中复制）：
${formatTemplateStructureForAI(templateStructureForAI)}${listStructureSection ? `\n${listStructureSection}` : ''}`
      : '';

    // 不传完整布局 JSON；有模版槽位结构时以该结构为准，无则用简短层级摘要
    const layoutSection = hasStructureForAI
      ? `
布局层级与 rowDepth 见上方「模版槽位结构」，无需单独 JSON。`
      : `

当前布局层级摘要（fix 中的 rowDepth 请从下列路径复制）：
${layoutSummary}`;

    const prompt = `你是一个专业的作品质量检查助手。请检查最终作品是否符合用户故事，以及排版结构是否合理。

用户故事：
"${userInput}"

当前作品内容（共${templateElements.length}个元素，fix.replace 时 elemId 必须从下列 ID 复制）：
${currentContent}
${structureSection}
${layoutSection}

请检查以下方面：

1. **内容检查**：
   - 作品内容是否符合用户故事？
   - 是否有遗漏的关键信息？
   - 内容逻辑是否连贯？
   - 文本是否自然流畅？

2. **排版检查**：
   - 整体布局是否从上到下（flex-direction: column）？
     - 第一层（pages/blocks）必须是 column
     - 第二层（grids/rows）通常也应该是 column，除非是横向排列的内容
   - 层级结构是否合理？
   - 间距和对齐是否协调？
   - 视觉层次是否清晰？${hasStructureForAI ? `
   - **槽位与字数**：对照上方「模版槽位结构」，检查各槽位（按 ID）内容是否与角色匹配、short 槽是否≤6字、medium 槽是否≤20字，是否因超长导致换行破坏排版。
   - **列表**：对照模版槽位结构中的列表容器（共N项），检查列表项数量与用户故事中的重复结构是否一致，列表项内容是否完整。` : ''}

如果发现问题，请输出详细的修复建议。

必须返回有效的JSON格式，不要包含任何markdown代码块标记。

返回JSON格式（严格按照此格式）：
{
  "contentValid": true/false,
  "layoutValid": true/false,
  "issues": [
    {
      "type": "content" | "layout",
      "description": "问题描述",
      "fix": {
        "replace": [{"elemId": "元素ID", "newText": "新文本"}],
        "adjustFlexDirection": [{"rowDepth": [深度路径], "direction": "column"}],
        "adjustGap": [{"rowDepth": [深度路径], "gap": "16px"}]
      }
    }
  ]
}

如果没有问题，issues 应该为空数组。`;

    const startMs = Date.now();
    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.5, // 验证阶段使用较低温度，更保守
    });

    const durationMs = Date.now() - startMs;

    if (shouldLog) {
      await prisma.aiTemplateGenerationStepEntity.create({
        data: {
          run_id,
          iteration: typeof iteration === 'number' ? iteration : 0,
          step_type: 'validate',
          model_name: modelName,
          duration_ms: durationMs,
          request_json: {
            templateElementsCount: Array.isArray(templateElements)
              ? templateElements.length
              : 0,
            iteration,
          },
          prompt_text: prompt,
          response_text: result.text,
          execution_report:
            execution_report != null ? (execution_report as object) : undefined,
          error: null,
        },
      });
    }

    // 解析AI返回的JSON
    let validation;
    try {
      let text = result.text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      validation = JSON.parse(text);
    } catch (parseError) {
      console.error('[AI Validate API] JSON解析失败:', parseError);
      console.error('[AI Validate API] AI返回的原始文本:', result.text);
      if (shouldLog) {
        await prisma.aiTemplateGenerationStepEntity.updateMany({
          where: {
            run_id,
            iteration: typeof iteration === 'number' ? iteration : 0,
            step_type: 'validate',
          },
          data: {
            error: parseError instanceof Error ? parseError.message : String(parseError),
          },
        });
      }
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

    // 验证数据结构
    if (typeof validation.contentValid !== 'boolean' || typeof validation.layoutValid !== 'boolean') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据结构不正确：缺少 contentValid 或 layoutValid',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 确保 issues 数组存在
    if (!Array.isArray(validation.issues)) {
      validation.issues = [];
    }

    if (shouldLog) {
      await prisma.aiTemplateGenerationStepEntity.updateMany({
        where: {
          run_id,
          iteration: typeof iteration === 'number' ? iteration : 0,
          step_type: 'validate',
        },
        data: { response_json: validation as object },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        validation,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Validate API] 验证失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : '验证失败，请重试',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
