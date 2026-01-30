import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createProxyFetch } from '../proxy-fetch';

export const dynamic = 'force-dynamic';

/**
 * 语义分析API
 * 同时分析模版和AI生成内容的语义，并返回匹配结果
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templateElements, aiElements } = body;

    // 验证参数：必须同时提供模版元素和AI元素
    if (
      !templateElements ||
      !Array.isArray(templateElements) ||
      templateElements.length === 0
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'templateElements数组不能为空',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!aiElements || !Array.isArray(aiElements) || aiElements.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'aiElements数组不能为空',
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

    // 构建模版元素列表
    const templateElementsList = templateElements
      .map((elem: any) => {
        const id = elem.elemId || `template_${elem.index || ''}`;
        const tag = elem.tag || 'text_body';
        const text = elem.text || '';
        return `  - ID: ${id}, Tag: ${tag}, Text: "${text}"`;
      })
      .join('\n');

    // 构建AI元素列表
    const aiElementsList = aiElements
      .map((elem: any, index: number) => {
        const id = elem.index || `ai_elem_${index}`;
        const tag = elem.tag || 'text_body';
        const text = elem.text || '';
        return `  - ID: ${id}, Tag: ${tag}, Text: "${text}"`;
      })
      .join('\n');

    const prompt = `你是一个语义匹配专家。现在有两组文本元素：

【模版元素】（来自现有模版，需要被替换）：
${templateElementsList}

【AI生成元素】（新生成的内容，用于替换模版）：
${aiElementsList}

请分析这两组元素的语义，找出语义相同的元素对，并返回匹配结果。

要求：
1. 仔细分析每个元素的语义角色（如"促销主标题"、"活动时间"、"联系方式"等）
2. 找出模版元素和AI生成元素中语义相同的配对
3. 语义匹配应该基于元素的功能和作用，而不是字面意思
4. 如果AI生成元素在模版中找不到语义匹配的元素，则不包含在matches中
5. 必须返回有效的JSON格式，不要包含任何markdown代码块标记

返回JSON格式（严格按照此格式，不要添加任何其他内容）：
{
  "matches": [
    {
      "templateElemId": "模版元素ID",
      "aiIndex": "AI元素ID（如ai_elem_0）",
      "semantics": "语义角色（如：促销主标题）",
      "aiText": "AI生成的新文本内容"
    }
  ]
}

注意：
- matches数组包含所有找到的语义匹配对
- templateElemId必须是模版元素的elemId
- aiIndex必须是AI元素的ID（如ai_elem_0）
- semantics是识别出的语义角色
- aiText是AI生成的新文本，将用于替换模版中的对应文本`;

    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.3, // 降低温度以提高一致性
    });

    // 尝试解析AI返回的文本为JSON
    let analysisResult;
    try {
      // 移除可能的markdown代码块标记
      let text = result.text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      analysisResult = JSON.parse(text);
    } catch (parseError) {
      console.error('[AI Semantics API] JSON解析失败:', parseError);
      console.error('[AI Semantics API] AI返回的原始文本:', result.text);
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
    if (!analysisResult || !Array.isArray(analysisResult.matches)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据结构不正确：缺少matches数组',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 验证并清理匹配结果
    const validMatches: Array<{
      templateElemId: string;
      aiIndex: string;
      semantics: string;
      aiText: string;
    }> = [];

    for (const match of analysisResult.matches) {
      if (
        match &&
        typeof match.templateElemId === 'string' &&
        typeof match.aiIndex === 'string' &&
        typeof match.semantics === 'string' &&
        typeof match.aiText === 'string' &&
        match.templateElemId.trim() &&
        match.aiIndex.trim() &&
        match.semantics.trim() &&
        match.aiText.trim()
      ) {
        validMatches.push({
          templateElemId: match.templateElemId.trim(),
          aiIndex: match.aiIndex.trim(),
          semantics: match.semantics.trim(),
          aiText: match.aiText.trim(),
        });
      }
    }

    if (validMatches.length === 0) {
      console.warn('[AI Semantics API] 未找到任何匹配项');
      // 返回空匹配数组，而不是错误，让SDK继续处理未匹配的元素
    }

    return new Response(
      JSON.stringify({
        success: true,
        matches: validMatches,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Semantics API] 分析失败:', error);
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
