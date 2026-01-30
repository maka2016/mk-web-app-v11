import { streamText, convertToModelMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const dynamic = 'force-dynamic';

// 创建支持代理的 fetch 函数
function createCustomFetch(): typeof fetch {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (!proxyUrl) {
    return fetch;
  }

  try {
    const { ProxyAgent } = require('proxy-agent');
    const agent = new ProxyAgent(proxyUrl);

    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(input, {
          ...init,
          // @ts-ignore
          agent,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };
  } catch (error) {
    console.warn('[Chat API] 代理配置失败，使用直接连接:', error);
    return fetch;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const modelMessages = await convertToModelMessages(messages);
    const customFetch = createCustomFetch();
    const googleClient = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      fetch: customFetch,
    });

    const modelName =
      process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-2.0-flash-lite';

    const result = streamText({
      model: googleClient(modelName),
      messages: modelMessages,
    });

    // @ts-ignore
    return result.toUIMessageStreamResponse();
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
