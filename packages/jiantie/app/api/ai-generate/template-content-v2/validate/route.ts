import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createProxyFetch } from '../../proxy-fetch';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userInput, gridsDataStructure, templateElements } = body;

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

    // 构建当前作品内容描述
    const currentContent = templateElements
      .map((elem: any, index: number) => {
        const tag = elem.tag || 'text_body';
        const text = elem.text || '';
        return `  ${index + 1}. [${tag}] ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
      })
      .join('\n');

    // 构建布局结构描述
    const layoutStructure = JSON.stringify(gridsDataStructure, null, 2);

    const prompt = `你是一个专业的作品质量检查助手。请检查最终作品是否符合用户故事，以及排版结构是否合理。

用户故事：
"${userInput}"

当前作品内容（共${templateElements.length}个元素）：
${currentContent}

当前布局结构（JSON格式）：
${layoutStructure}

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
   - 视觉层次是否清晰？

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

    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.5, // 验证阶段使用较低温度，更保守
    });

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
