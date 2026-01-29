/**
 * AI 分析模版内容工具函数
 * 用于提取模版可编辑内容并调用 AI 分析生成结构化标签数据
 */

import { AIWorksSDK } from './ai-works-sdk';
import { IWorksData } from '../../components/GridEditorV3/works-store/types';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createProxyFetch } from '../../app/api/ai-generate/proxy-fetch';

/**
 * AI 向量元数据结构
 */
export interface AIVectorMeta {
  sceneTags: string[];      // 场景标签，如：促销、节日、招聘
  industryTags: string[];   // 行业标签，如：餐饮、教育、电商
  styleTags: string[];      // 风格标签，如：简约、复古、科技
  audienceTags: string[];   // 受众标签，如：年轻人、白领、家长
  sampleTitle: string;      // 示例标题（从模版内容提取）
  sampleCopy: string;       // 示例文案（从模版内容提取）
  /**
   * 用户故事：在什么时间、什么地点、谁在做什么
   * 例如：小儿张子帅十周岁啦，妈妈刘琼和爸爸张红光诚邀收到海报邀请函的人于2026年2月4日中午11点（农历腊月十七）在咸宁市通城县塘湖镇狮子村二组参加小儿生日宴。
   */
  userStory?: string;
}

/**
 * AI 分析结果
 */
export interface AnalyzeResult {
  success: boolean;
  meta?: AIVectorMeta;
  error?: string;
  rawText?: string; // 用于调试的原始模版文本
}

/**
 * 作品用户故事分析结果
 */
export interface WorksUserStoryResult {
  success: boolean;
  userStory?: string;
  error?: string;
  rawText?: string;
}

/**
 * 从模版 work_data 中提取文本内容
 * @param worksData 模版的 work_data
 * @returns 格式化的文本内容
 */
export function extractTemplateText(worksData: IWorksData): string {
  const textElements = AIWorksSDK.extractTemplateTextElements(worksData);
  
  if (textElements.length === 0) {
    return '';
  }
  
  // 按照显示顺序格式化文本
  return textElements
    .map((elem, index) => {
      const tag = elem.tag || 'text_body';
      const text = elem.text || '';
      return `${index + 1}. [${tag}] ${text}`;
    })
    .join('\n');
}

/**
 * 构建 AI 分析 prompt
 * @param templateText 模版文本内容
 * @param templateTitle 模版标题
 * @returns AI prompt
 */
function buildAnalyzePrompt(templateText: string, templateTitle: string): string {
  return `你是一个模版分析专家。请分析以下海报/邀请函模版的内容，提取出模版的语义标签信息。

【模版标题】：${templateTitle}

【模版文本内容】：
${templateText}

请根据模版内容，分析并提取以下信息：

1. **场景标签（sceneTags）**：模版适用的使用场景，如：促销、节日、招聘、活动、通知、婚礼、生日、开业等
2. **行业标签（industryTags）**：模版适用的行业，如：餐饮、教育、电商、零售、医疗、科技、金融等
3. **风格标签（styleTags）**：模版的设计风格，如：简约、复古、科技、可爱、商务、时尚、中国风等
4. **受众标签（audienceTags）**：模版的目标受众，如：年轻人、白领、家长、学生、商务人士等
5. **示例标题（sampleTitle）**：从模版中提取一个最具代表性的标题文本
6. **示例文案（sampleCopy）**：从模版中提取一段代表性的文案内容（最多200字）
7. **用户故事（userStory）**：基于模版内容，生成一段完整的自然语言用户故事，用一句或几句顺畅的话描述“谁在什么时间什么地点做什么”，例如：
   - 妈妈刘琼和爸爸张红光诚邀收到海报邀请函的人，于2026年2月4日中午11点（农历腊月十七），在咸宁市通城县塘湖镇狮子村二组参加小儿张子帅的十岁生日宴。

关于用户故事的要求：
- **尽量严格从模版文本中抽取人物、时间、地点**，不要随意改动已经给出的具体信息（例如姓名、日期、农历、公历、地点等）
- 如果文本中有多处时间或地点，请根据整体语义选择最主要的一处来写故事
- 如果文本中缺少某一类信息（例如没有明确地点），可以用模糊表达（例如“在约定的地点”），不要编造具体地点名称
- 用户故事要通顺自然，适合作为生成作品文案时的背景描述

要求：
- 每个标签数组包含2-5个标签
- 标签要精准，不要过于宽泛
- 如果某类标签无法从模版内容中明确判断，可以返回空数组
- 示例标题和示例文案直接从模版内容中提取，不要自己创作

必须返回有效的JSON格式，不要包含任何markdown代码块标记。

返回JSON格式（严格按照此格式）：
{
  "sceneTags": ["标签1", "标签2"],
  "industryTags": ["标签1", "标签2"],
  "styleTags": ["标签1", "标签2"],
  "audienceTags": ["标签1", "标签2"],
  "sampleTitle": "从模版提取的标题",
  "sampleCopy": "从模版提取的文案内容",
  "userStory": "基于模版内容生成的完整用户故事"
}`;
}

/**
 * 解析 AI 返回的 JSON
 * @param text AI 返回的文本
 * @returns 解析后的 AIVectorMeta
 */
function parseAIResponse(text: string): AIVectorMeta {
  let cleanText = text.trim();
  
  // 移除 markdown 代码块标记
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  const parsed = JSON.parse(cleanText);
  
  // 验证并规范化数据
  return {
    sceneTags: Array.isArray(parsed.sceneTags) ? parsed.sceneTags.filter((t: unknown) => typeof t === 'string') : [],
    industryTags: Array.isArray(parsed.industryTags) ? parsed.industryTags.filter((t: unknown) => typeof t === 'string') : [],
    styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags.filter((t: unknown) => typeof t === 'string') : [],
    audienceTags: Array.isArray(parsed.audienceTags) ? parsed.audienceTags.filter((t: unknown) => typeof t === 'string') : [],
    sampleTitle: typeof parsed.sampleTitle === 'string' ? parsed.sampleTitle.trim() : '',
    sampleCopy: typeof parsed.sampleCopy === 'string' ? parsed.sampleCopy.trim().slice(0, 200) : '',
    userStory: typeof parsed.userStory === 'string' ? parsed.userStory.trim() : undefined,
  };
}

/**
 * 使用 AI 分析模版内容，生成结构化标签数据
 * @param worksData 模版的 work_data
 * @param templateTitle 模版标题
 * @returns 分析结果
 */
export async function analyzeTemplateForVector(
  worksData: IWorksData,
  templateTitle: string
): Promise<AnalyzeResult> {
  // 检查 API Key
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      success: false,
      error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured',
    };
  }
  
  // 1. 提取模版文本
  const templateText = extractTemplateText(worksData);
  
  if (!templateText) {
    return {
      success: false,
      error: '模版中没有找到文本内容',
      rawText: '',
    };
  }
  
  try {
    // 2. 构建 prompt
    const prompt = buildAnalyzePrompt(templateText, templateTitle);
    
    // 3. 调用 AI
    const customFetch = createProxyFetch();
    const googleClient = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      fetch: customFetch,
    });
    
    const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-2.0-flash-lite';
    
    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.3, // 降低温度以提高一致性
    });
    
    // 4. 解析结果
    const meta = parseAIResponse(result.text);
    
    return {
      success: true,
      meta,
      rawText: templateText,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 检查是否是代理相关的错误
    const isProxyError =
      errorMessage.includes('Connection terminated') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('socket hang up') ||
      errorMessage.includes('proxy');
    
    const proxyUrl =
      process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    
    return {
      success: false,
      error: isProxyError
        ? `代理连接失败: ${errorMessage}${proxyUrl ? ` (代理: ${proxyUrl})` : ''}`
        : `AI 分析失败: ${errorMessage}`,
      rawText: templateText,
    };
  }
}

/**
 * 使用 AI 基于作品内容生成完整的用户故事
 * @param worksData 作品或模版的 work_data
 * @param title 标题（作品标题或模版标题）
 */
export async function buildWorksUserStory(
  worksData: IWorksData,
  title: string
): Promise<WorksUserStoryResult> {
  // 检查 API Key
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      success: false,
      error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured',
    };
  }

  // 1. 提取文本（与模版分析共用逻辑，保证语义一致）
  const templateText = extractTemplateText(worksData);

  if (!templateText) {
    return {
      success: false,
      error: '作品中没有找到文本内容',
      rawText: '',
    };
  }

  // 2. 构建用户故事专用 prompt
  const prompt = `你是一个“用户故事”抽取与重写专家。请根据以下海报/邀请函/作品的内容，生成一段完整的、自然语言的用户故事，清晰地说明「谁、在什么时间、什么地点、做什么」。

【作品标题】：
${title}

【作品文本内容】：
${templateText}

请严格遵守以下要求：
1. **优先从文本中精确抽取信息**：
   - 人物：姓名、称谓（例如：妈妈刘琼、爸爸张红光、寿星张子帅等）
   - 时间：可以包含公历日期、农历日期、具体时刻（例如：2026年2月4日中午11点，农历腊月十七）
   - 地点：具体的城市、区县、乡镇、村组、酒店/饭店名称等
   - 事件：例如生日宴、婚礼、升学宴、开业庆典、活动邀请等
2. **不要篡改已有的具体信息**：
   - 文本中已经给出的姓名、时间、地点要原样或等价复述，不能随意改成别的数字或别的城市
3. **在缺失信息时的处理方式**：
   - 如果文本中缺少某一类信息（例如没有写地点），可以用模糊表达（例如“在约定的地点”），不要凭空编造一个具体地名
4. **表达风格**：
   - 用一到三句话，将“谁在什么时间什么地点做什么”串成一段顺畅的中文描述，语气自然，适合作为生成作品文案时的背景故事

只返回 JSON，且不要包含任何 markdown 代码块标记。

返回 JSON 格式（严格按照此格式）：
{
  "userStory": "完整的用户故事，例如：妈妈刘琼和爸爸张红光诚邀收到海报邀请函的人，于2026年2月4日中午11点（农历腊月十七），在咸宁市通城县塘湖镇狮子村二组参加小儿张子帅的十岁生日宴。"
}`;

  try {
    const customFetch = createProxyFetch();
    const googleClient = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      fetch: customFetch,
    });

    const modelName = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-2.0-flash-lite';

    const result = await generateText({
      model: googleClient(modelName),
      prompt,
      temperature: 0.2, // 用户故事需要更稳定，温度再低一点
    });

    let cleanText = result.text.trim();

    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanText) as { userStory?: unknown };
    const userStory =
      typeof parsed.userStory === 'string' && parsed.userStory.trim()
        ? parsed.userStory.trim()
        : '';

    if (!userStory) {
      return {
        success: false,
        error: 'AI 返回的 userStory 为空',
        rawText: templateText,
      };
    }

    return {
      success: true,
      userStory: userStory.slice(0, 600),
      rawText: templateText,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const isProxyError =
      errorMessage.includes('Connection terminated') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('socket hang up') ||
      errorMessage.includes('proxy');

    const proxyUrl =
      process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

    return {
      success: false,
      error: isProxyError
        ? `代理连接失败: ${errorMessage}${proxyUrl ? ` (代理: ${proxyUrl})` : ''}`
        : `AI 生成用户故事失败: ${errorMessage}`,
      rawText: templateText,
    };
  }
}
