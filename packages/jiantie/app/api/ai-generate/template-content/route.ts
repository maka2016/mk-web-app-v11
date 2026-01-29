import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createProxyFetch } from '../proxy-fetch';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userInput, templateElements } = body;

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

    // 验证templateElements（如果提供）
    const hasTemplate =
      templateElements &&
      Array.isArray(templateElements) &&
      templateElements.length > 0;

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

    // 根据是否有模版内容，使用不同的prompt策略
    let prompt: string;

    if (hasTemplate) {
      // 构建模版结构描述
      const templateStructure = templateElements
        .map((elem: any, index: number) => {
          const tag = elem.tag || 'text_body';
          const text = elem.text || '';
          return `  ${index + 1}. [${tag}] ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
        })
        .join('\n');

      const templateElementCount = templateElements.length;
      const maxElementCount = Math.ceil(templateElementCount * 1.5); // 最多150%

      prompt = `用户输入："${userInput}"

参考以下模版结构，根据用户输入生成新的文案内容：

【模版结构】（共${templateElementCount}个元素）：
${templateStructure}

要求：
1. 生成的内容结构要与模版相似：
   - 页面数量应该与模版相近（可以适当增减1-2页，但不要大幅偏离）
   - 每个页面的元素类型和顺序要参考模版（例如模版第一页是标题+正文，生成内容也应该是类似的顺序）
   - 元素总数不能超过模版的150%（模版有${templateElementCount}个元素，生成内容最多${maxElementCount}个元素）
   - 保持模版的结构层次感（标题、正文、描述等的分布要相似）

2. 文案内容可以根据用户输入自由发挥：
   - 文本内容要符合用户输入的主题
   - 但要保持对应元素的语义角色（例如模版中某个位置是主标题，生成内容也应该是主标题）
   - 语言自然流畅，符合中文表达习惯

3. 元素类型包括：
   - text_heading1: 大标题（用于主标题）
   - text_heading2: 副标题（用于章节标题）
   - text_heading3: 小标题（用于小节标题）
   - text_body: 正文（用于段落内容）
   - text_desc: 描述文字（用于说明性文字）
   - text_free: 自定义文字（用于特殊格式）

4. 必须返回有效的JSON格式，不要包含任何markdown代码块标记

返回JSON格式（严格按照此格式，不要添加任何其他内容）：
{
  "pages": [
    {
      "pageIndex": 0,
      "elements": [
        {
          "tag": "text_heading1",
          "text": "标题文本",
          "order": 0
        },
        {
          "tag": "text_body",
          "text": "正文内容",
          "order": 1
        }
      ]
    }
  ]
}`;
    } else {
      // 无模版时的原有逻辑
      prompt = `用户输入："${userInput}"

请根据用户输入生成一个多页面的文案结构，要求：
1. 生成合理的页面数量（通常1-3页）
2. 每个页面包含多个文本元素，类型包括：
   - text_heading1: 大标题（用于主标题）
   - text_heading2: 副标题（用于章节标题）
   - text_heading3: 小标题（用于小节标题）
   - text_body: 正文（用于段落内容）
   - text_desc: 描述文字（用于说明性文字）
   - text_free: 自定义文字（用于特殊格式）
3. 文案要符合用户输入的主题，语言自然流畅
4. 合理分配内容到不同页面，每页内容不宜过多
5. 必须返回有效的JSON格式，不要包含任何markdown代码块标记

返回JSON格式（严格按照此格式，不要添加任何其他内容）：
{
  "pages": [
    {
      "pageIndex": 0,
      "elements": [
        {
          "tag": "text_heading1",
          "text": "标题文本",
          "order": 0
        },
        {
          "tag": "text_body",
          "text": "正文内容",
          "order": 1
        }
      ]
    }
  ]
}`;
    }

    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.7,
    });

    // 尝试解析AI返回的文本为JSON
    let content;
    try {
      // 移除可能的markdown代码块标记
      let text = result.text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      content = JSON.parse(text);
    } catch (parseError) {
      console.error('[AI Generate API] JSON解析失败:', parseError);
      console.error('[AI Generate API] AI返回的原始文本:', result.text);
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
    if (!content || !Array.isArray(content.pages)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据结构不正确：缺少pages数组',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 验证每个页面的数据结构
    const validPages = content.pages.filter((page: any) => {
      return (
        page &&
        typeof page.pageIndex === 'number' &&
        Array.isArray(page.elements)
      );
    });

    if (validPages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据中没有有效的页面',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 验证每个元素的数据结构
    const validElements = validPages.every((page: any) => {
      return page.elements.every((element: any) => {
        return (
          element &&
          typeof element.tag === 'string' &&
          typeof element.text === 'string' &&
          element.text.trim().length > 0
        );
      });
    });

    if (!validElements) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI返回的数据中包含无效的元素',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 返回验证后的数据
    content.pages = validPages;

    return new Response(
      JSON.stringify({
        success: true,
        content,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Generate API] 生成失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : '生成失败，请重试',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
