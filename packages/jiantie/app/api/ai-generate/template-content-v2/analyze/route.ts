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
      templateElements,
      gridsDataStructure,
      templateStructureForAI,
      run_id,
      iteration,
      template_id,
      template_title,
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

    // 构建模版结构描述（包含 elemId，这是替换操作的关键）
    const templateStructure = templateElements
      .map((elem: any, index: number) => {
        const tag = elem.tag || 'text_body';
        const text = elem.text || '';
        const rowDepth = elem.rowDepth || [];
        const elemId = elem.elemId || '';
        return `  ${index + 1}. ID: ${elemId} [${tag}] 位置: [${rowDepth.join(',')}] ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
      })
      .join('\n');

    // 构建布局结构描述
    const layoutStructure = JSON.stringify(gridsDataStructure, null, 2);

    // 若有 AI 友好结构，生成带槽位角色与字数约束的模版描述
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
              block += `${prefix}  槽位 ID:${slot.elemId} [${slot.tag}] 角色:${roleDesc}${sizeDesc} 当前: "${(slot.text || '').substring(0, 40)}${(slot.text || '').length > 40 ? '...' : ''}"\n`;
            });
          }
          if (node.children && node.children.length > 0) {
            block += formatTemplateStructureForAI(node.children, prefix);
          }
          return block;
        })
        .join('');
    }

    const hasStructureForAI = Array.isArray(templateStructureForAI) && templateStructureForAI.length > 0;
    const templateStructureSection = hasStructureForAI
      ? `模版结构（树形，含槽位角色与字数约束）：
${formatTemplateStructureForAI(templateStructureForAI)}

模版文本元素 ID 白名单（replace/delete 的 elemId 必须从下列 ID 中复制）：
${templateStructure}`
      : `模版文本元素（共${templateElements.length}个）：
${templateStructure}

模版布局结构（JSON格式）：
${layoutStructure}`;

    const replaceConstraints = hasStructureForAI
      ? `
   - **字数约束**：每个槽位有 slotSize。short 槽的新文本尽量 ≤6 字，medium 槽 ≤20 字，避免换行破坏排版。
   - **左右角色**：role 为 left/right 的槽位表示同一行左右排列，请根据用户故事把对应内容填到正确的左/右槽位。`
      : '';

    const prompt = `你是一个专业的模版编辑助手。请分析用户故事和模版结构，制定详细的内容操作计划和排版优化计划。

用户故事：
"${userInput}"

${templateStructureSection}

请分析并输出以下内容：

1. **内容操作计划**：
   - replace: 需要替换的元素列表，格式：[{elemId: "元素ID", newText: "新文本"}]
     - **重要**：elemId 必须使用模版中提供的实际 ID，不能自己编造
     - 根据用户故事，为每个需要替换的元素生成符合主题的新文本${replaceConstraints}
   - delete: 需要删除的元素ID列表，格式：["元素ID1", "元素ID2"]
     - **重要**：elemId 必须使用模版中提供的实际 ID
   - add: 需要新增的元素列表，格式：[{position: [深度路径数组], tag: "元素类型", text: "文本内容", order: 顺序}]
     - position: **必须与模版结构中行开头的 [a,b,c,...] 完全一致**（从模版结构描述中复制，不要省略层级）。例如第一个 block 下通常只有 1 个 grid，应写 [0,0,1] 而非 [0,1]；列表容器内应写完整路径如 [0,0,2,0,0,0,0,1]
     - tag: 元素类型，可选值：text_heading1, text_heading2, text_heading3, text_body, text_desc, text_free
     - order: 可选，元素在容器中的顺序

2. **排版优化计划**：
   - adjustFlexDirection: 需要调整 flex-direction 的 row 列表，格式：[{rowDepth: [深度路径], direction: "column" | "row"}]
     - 注意：整体布局需要从上到下，所以第一层（pages/blocks）必须是 column
     - 第二层（grids/rows）通常也应该是 column，除非是横向排列的内容
   - adjustGap: 需要调整间距的 row 列表，格式：[{rowDepth: [深度路径], gap: "8px" | "16px" | "24px"}]
   - adjustAlignItems: 可选，需要调整对齐方式的 row 列表，格式：[{rowDepth: [深度路径], alignItems: "flex-start" | "center" | "flex-end"}]
   - addContainers: 可选，需要新增的容器列表，格式：[{parentDepth: [父级深度路径], container: {tag: "grid_root", style: {...}}}]

要求：
1. 内容替换要符合用户故事的主题和需求
2. 排版要确保整体从上到下（flex-direction: column），层级结构清晰
3. 如果模版中某些元素不再需要，应该删除
4. 如果用户故事中有新内容，应该添加新元素
5. 排版调整要合理，保持视觉协调
${hasStructureForAI ? '6. 遵守各槽位的字数约束（short/medium）和左右角色，避免内容错位或换行破坏排版。' : ''}

必须返回有效的JSON格式，不要包含任何markdown代码块标记。

返回JSON格式（严格按照此格式）：
{
  "contentPlan": {
    "replace": [
      {"elemId": "实际的元素ID（从模版结构描述中复制）", "newText": "根据用户故事生成的新文本"}
    ],
    "delete": ["实际的元素ID1", "实际的元素ID2"],
    "add": [
      {"position": [0, 1], "tag": "text_heading1", "text": "标题文本", "order": 0}
    ]
  },
  "layoutPlan": {
    "adjustFlexDirection": [
      {"rowDepth": [0], "direction": "column"}
    ],
    "adjustGap": [
      {"rowDepth": [0, 1], "gap": "16px"}
    ]
  }
}

**重要提示**：
- replace 和 delete 中的 elemId 必须完全匹配模版中提供的实际 ID
- 不要自己编造 elemId
- 如果某个元素不需要替换，不要将其放入 replace 数组`;

    const startMs = Date.now();
    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.7,
    });

    const durationMs = Date.now() - startMs;

    if (shouldLog) {
      await prisma.aiTemplateGenerationStepEntity.create({
        data: {
          run_id,
          iteration: typeof iteration === 'number' ? iteration : 0,
          step_type: 'analyze',
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
          error: null,
        },
      });
    }

    // 解析AI返回的JSON
    let analysis;
    try {
      let text = result.text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      analysis = JSON.parse(text);
    } catch (parseError) {
      console.error('[AI Analyze API] JSON解析失败:', parseError);
      console.error('[AI Analyze API] AI返回的原始文本:', result.text);
      if (shouldLog) {
        await prisma.aiTemplateGenerationStepEntity.updateMany({
          where: { run_id, iteration: typeof iteration === 'number' ? iteration : 0, step_type: 'analyze' },
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
    if (!analysis.contentPlan || !analysis.layoutPlan) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据结构不正确：缺少 contentPlan 或 layoutPlan',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 确保数组字段存在
    if (!Array.isArray(analysis.contentPlan.replace)) {
      analysis.contentPlan.replace = [];
    }
    if (!Array.isArray(analysis.contentPlan.delete)) {
      analysis.contentPlan.delete = [];
    }
    if (!Array.isArray(analysis.contentPlan.add)) {
      analysis.contentPlan.add = [];
    }
    if (!Array.isArray(analysis.layoutPlan.adjustFlexDirection)) {
      analysis.layoutPlan.adjustFlexDirection = [];
    }
    if (!Array.isArray(analysis.layoutPlan.adjustGap)) {
      analysis.layoutPlan.adjustGap = [];
    }

    // 验证 replace 和 delete 中的 elemId 是否有效
    const validElemIds = new Set(templateElements.map((e: any) => e.elemId));
    const invalidReplaceIds = analysis.contentPlan.replace
      .filter((r: any) => !validElemIds.has(r.elemId))
      .map((r: any) => r.elemId);
    const invalidDeleteIds = analysis.contentPlan.delete.filter((id: string) => !validElemIds.has(id));

    if (invalidReplaceIds.length > 0) {
      console.warn('[AI Analyze API] 发现无效的 replace elemId:', invalidReplaceIds);
      // 过滤掉无效的 replace
      analysis.contentPlan.replace = analysis.contentPlan.replace.filter((r: any) => validElemIds.has(r.elemId));
    }

    if (invalidDeleteIds.length > 0) {
      console.warn('[AI Analyze API] 发现无效的 delete elemId:', invalidDeleteIds);
      // 过滤掉无效的 delete
      analysis.contentPlan.delete = analysis.contentPlan.delete.filter((id: string) => validElemIds.has(id));
    }

    if (shouldLog) {
      await prisma.aiTemplateGenerationStepEntity.updateMany({
        where: { run_id, iteration: typeof iteration === 'number' ? iteration : 0, step_type: 'analyze' },
        data: { response_json: analysis as object },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Analyze API] 分析失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : '分析失败，请重试',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
