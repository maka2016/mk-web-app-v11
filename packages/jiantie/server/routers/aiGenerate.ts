import { TRPCError } from '@trpc/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

/**
 * 语言代码到语言名称的映射
 */
const LANGUAGE_NAME_MAP: Record<string, string> = {
  'ZH-CN': '简体中文',
  'ZH-TW': '繁體中文',
  EN: 'English',
  'ID-ID': 'Bahasa Indonesia',
};

/**
 * 创建火山引擎 ARK OpenAI 兼容客户端
 */
function getDashScopeClient(): OpenAI {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '缺少环境变量: DASHSCOPE_API_KEY',
    });
  }

  return new OpenAI({
    baseURL: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
    apiKey,
  });
}

/**
 * AI 生成相关路由
 */
export const aiGenerateRouter = router({
  /**
   * 根据作品文本内容生成指定语言的标题和描述
   */
  generateWorkMeta: publicProcedure
    .input(
      z.object({
        workText: z.string().max(500),
        language: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { workText, language } = input;

      console.log('[aiGenerate] 生成标题和描述:', { workText, language });
      if (!workText.trim()) {
        return { title: '', desc: '' };
      }

      const client = getDashScopeClient();
      const modelId = 'qwen-flash';
      const langName = LANGUAGE_NAME_MAP[language.toUpperCase()] || language;

      try {
        const completion = await client.chat.completions.create({
          model: modelId,
          messages: [
            {
              role: 'system',
              content: `你是一个作品标题和描述生成专家。根据用户提供的作品文本内容，用${langName}生成一个简洁有吸引力的标题和一段简短的描述。

要求：
1. 标题不超过 20 个字（或等效长度），简洁精炼，能概括作品主题
2. 描述不超过 60 个字（或等效长度），简要说明作品内容或用途
3. 标题和描述必须使用${langName}，要符合该语言的表达习惯
4. 必须以 JSON 格式返回，格式为：{"title": "标题", "desc": "描述"}
5. 不要返回 JSON 以外的任何内容`,
            },
            {
              role: 'user',
              content: `请根据以下作品文本内容，用${langName}生成标题和描述：\n\n${workText}`,
            },
          ],
          temperature: 0.7,
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI 返回结果为空',
          });
        }

        console.log('[aiGenerate] AI 返回结果:', content);
        // 解析 JSON 结果
        try {
          const jsonMatch = content.match(/\{[\s\S]*?\}/);
          if (!jsonMatch) {
            throw new Error('未找到 JSON 内容');
          }

          const result = JSON.parse(jsonMatch[0]) as {
            title: string;
            desc: string;
          };

          if (!result.title || !result.desc) {
            throw new Error('缺少 title 或 desc 字段');
          }

          return {
            title: result.title.slice(0, 36),
            desc: result.desc.slice(0, 60),
          };
        } catch (parseError) {
          console.error('[aiGenerate] 解析 AI 返回的 JSON 失败:', content, parseError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI 返回结果格式不正确',
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[aiGenerate] 调用 ARK API 失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '调用 AI 服务失败',
        });
      }
    }),
});
