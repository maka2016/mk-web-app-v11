/**
 * Figma API 服务（用于 Cursor AI）
 * 提供简单的函数接口供 AI 调用
 */

import * as fs from 'fs';
import * as path from 'path';
import { FigmaErrorHandler } from './error-handler';
import { FigmaService } from './figma';
import { FigmaConverter } from './figma-converter';

export interface ConversionOptions {
  figmaUrl: string;
  accessToken: string;
  componentName?: string;
  addComments?: boolean;
}

export interface ConversionResult {
  code: string;
  componentName: string;
  metadata: {
    fileKey: string;
    nodeId: string;
    timestamp: string;
  };
}

/**
 * 从 Figma URL 提取信息
 */
function extractFigmaInfo(url: string): { fileKey: string; nodeId: string } {
  const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
  const parsedUrl = new URL(cleanUrl);

  const pathParts = parsedUrl.pathname.split('/');
  const fileKeyIndex =
    pathParts.findIndex(part => part === 'design' || part === 'file') + 1;
  const fileKey = fileKeyIndex > 0 ? pathParts[fileKeyIndex] : '';

  const rawNodeId = parsedUrl.searchParams.get('node-id') || '';
  const nodeId = rawNodeId.replace(/-/g, ':');

  return { fileKey, nodeId };
}

/**
 * 将 Figma 设计转换为 React 代码
 *
 * @example
 * ```typescript
 * const result = await convertFigmaToCode({
 *   figmaUrl: 'https://www.figma.com/design/xxx/...?node-id=123-456',
 *   accessToken: 'figd_xxx',
 *   componentName: 'MyButton'
 * });
 * console.log(result.code);
 * ```
 */
export async function convertFigmaToCode(
  options: ConversionOptions
): Promise<ConversionResult> {
  // 验证输入
  const tokenValidation = FigmaErrorHandler.validateAccessToken(
    options.accessToken
  );
  if (!tokenValidation.valid) {
    throw new Error(tokenValidation.error);
  }

  const urlValidation = FigmaErrorHandler.validateFigmaUrl(options.figmaUrl);
  if (!urlValidation.valid) {
    throw new Error(urlValidation.error);
  }

  // 提取文件信息
  const { fileKey, nodeId } = extractFigmaInfo(options.figmaUrl);

  // 初始化服务
  const figmaService = new FigmaService({
    accessToken: options.accessToken,
    fileKey,
  });

  // 转换
  const converter = new FigmaConverter(figmaService);
  const componentData = await converter.convertToReactComponent(
    fileKey,
    nodeId
  );

  // 生成代码
  const componentName = options.componentName || 'FigmaComponent';
  const code = options.addComments
    ? converter.generateOptimizedComponent(componentData, componentName, {
        addComments: true,
      })
    : converter.generateFullComponent(componentData, componentName);

  return {
    code,
    componentName,
    metadata: {
      fileKey,
      nodeId,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 将 Figma 设计转换为 React 代码并保存到文件
 *
 * @example
 * ```typescript
 * await convertFigmaToFile({
 *   figmaUrl: 'https://www.figma.com/design/xxx/...?node-id=123-456',
 *   accessToken: process.env.FIGMA_ACCESS_TOKEN!,
 *   outputPath: './components/MyButton.tsx',
 *   componentName: 'MyButton'
 * });
 * ```
 */
export async function convertFigmaToFile(
  options: ConversionOptions & { outputPath: string }
): Promise<string> {
  const result = await convertFigmaToCode(options);

  // 确保输出目录存在
  const outputDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(options.outputPath, result.code, 'utf-8');

  return options.outputPath;
}

/**
 * 批量转换多个 Figma 节点
 *
 * @example
 * ```typescript
 * await batchConvert({
 *   accessToken: process.env.FIGMA_ACCESS_TOKEN!,
 *   conversions: [
 *     { url: 'figma-url-1', outputPath: './Button.tsx', componentName: 'Button' },
 *     { url: 'figma-url-2', outputPath: './Card.tsx', componentName: 'Card' }
 *   ]
 * });
 * ```
 */
export async function batchConvert(options: {
  accessToken: string;
  conversions: Array<{
    url: string;
    outputPath: string;
    componentName?: string;
  }>;
}): Promise<string[]> {
  const results: string[] = [];

  for (const conversion of options.conversions) {
    try {
      const outputPath = await convertFigmaToFile({
        accessToken: options.accessToken,
        figmaUrl: conversion.url,
        outputPath: conversion.outputPath,
        componentName: conversion.componentName,
        addComments: true,
      });
      results.push(outputPath);
    } catch (error) {
      const errorInfo = FigmaErrorHandler.handleError(error);
      console.error(
        `转换失败: ${conversion.outputPath} - ${errorInfo.message}`
      );
    }
  }

  return results;
}

/**
 * 从环境变量获取 Access Token
 */
export function getAccessToken(): string {
  const token =
    process.env.FIGMA_ACCESS_TOKEN ||
    process.env.FIGMA_TOKEN ||
    process.env.NEXT_PUBLIC_FIGMA_TOKEN;

  if (!token) {
    throw new Error(
      '未找到 Figma Access Token。请设置环境变量 FIGMA_ACCESS_TOKEN'
    );
  }

  return token;
}
