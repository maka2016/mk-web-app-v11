#!/usr/bin/env node

/**
 * Figma to React CLI
 * 命令行工具，用于在 Cursor 中直接转换 Figma 设计
 */

import { FigmaService } from './services/figma';
import { FigmaConverter } from './services/figma-converter';
import { FigmaErrorHandler } from './services/error-handler';
import * as fs from 'fs';
import * as path from 'path';

interface CLIOptions {
  accessToken: string;
  figmaUrl: string;
  outputPath: string;
  componentName?: string;
  addComments?: boolean;
}

/**
 * 从 Figma URL 提取文件信息
 */
function extractFigmaInfo(url: string): { fileKey: string; nodeId: string } {
  const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
  const parsedUrl = new URL(cleanUrl);

  const pathParts = parsedUrl.pathname.split('/');
  const fileKeyIndex = pathParts.findIndex(part => part === 'design' || part === 'file') + 1;
  const fileKey = fileKeyIndex > 0 ? pathParts[fileKeyIndex] : '';

  // Figma URL 中的 node-id 格式是 7426-25858，需要转换为 API 格式 7426:25858
  const rawNodeId = parsedUrl.searchParams.get('node-id') || '';
  const nodeId = rawNodeId.replace(/-/g, ':');

  return { fileKey, nodeId };
}

/**
 * 主转换函数
 */
export async function convertFigmaToReact(options: CLIOptions): Promise<void> {
  try {
    console.log('🚀 开始转换 Figma 设计...\n');

    // 验证 Access Token
    console.log('🔑 验证 Access Token...');
    const tokenValidation = FigmaErrorHandler.validateAccessToken(options.accessToken);
    if (!tokenValidation.valid) {
      throw new Error(tokenValidation.error);
    }

    // 验证 URL
    console.log('🔗 验证 Figma URL...');
    const urlValidation = FigmaErrorHandler.validateFigmaUrl(options.figmaUrl);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error);
    }

    // 提取文件信息
    console.log('📋 解析 Figma 链接...');
    const { fileKey, nodeId } = extractFigmaInfo(options.figmaUrl);
    console.log(`   File Key: ${fileKey}`);
    console.log(`   Node ID: ${nodeId}\n`);

    // 初始化 Figma 服务
    console.log('🌐 连接 Figma API...');
    const figmaService = new FigmaService({
      accessToken: options.accessToken,
      fileKey,
    });

    // 获取节点数据
    console.log('📦 获取设计数据...');
    const converter = new FigmaConverter(figmaService);
    const componentData = await converter.convertToReactComponent(fileKey, nodeId);

    // 生成代码
    console.log('✨ 生成 React 代码...');
    const componentName = options.componentName || 'FigmaComponent';
    const code = options.addComments
      ? converter.generateOptimizedComponent(componentData, componentName, {
          addComments: true,
        })
      : converter.generateFullComponent(componentData, componentName);

    // 写入文件
    console.log(`💾 写入文件: ${options.outputPath}`);
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(options.outputPath, code, 'utf-8');

    console.log('\n✅ 转换完成！');
    console.log(`📁 文件已保存到: ${options.outputPath}`);
    console.log(`📝 组件名称: ${componentName}\n`);
  } catch (error) {
    const errorInfo = FigmaErrorHandler.handleError(error);
    console.error('\n❌ 转换失败\n');
    console.error(`标题: ${errorInfo.title}`);
    console.error(`错误: ${errorInfo.message}`);
    if (errorInfo.solution) {
      console.error(`\n解决方案:\n${errorInfo.solution}`);
    }
    process.exit(1);
  }
}

/**
 * 批量转换
 */
export async function convertMultiple(
  accessToken: string,
  conversions: Array<{ url: string; outputPath: string; componentName?: string }>
): Promise<void> {
  console.log(`🚀 开始批量转换 ${conversions.length} 个组件...\n`);

  for (let i = 0; i < conversions.length; i++) {
    const { url, outputPath, componentName } = conversions[i];
    console.log(`\n[${i + 1}/${conversions.length}] 转换: ${componentName || path.basename(outputPath)}`);
    console.log('─'.repeat(50));

    try {
      await convertFigmaToReact({
        accessToken,
        figmaUrl: url,
        outputPath,
        componentName,
      });
    } catch (error) {
      console.error(`❌ 转换失败，跳过: ${componentName || outputPath}`);
      continue;
    }
  }

  console.log('\n🎉 批量转换完成！');
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(`
Figma to React Converter CLI

用法:
  node cli.ts <access-token> <figma-url> <output-path> [component-name]

参数:
  access-token    Figma Access Token (必需)
  figma-url       Figma 节点链接 (必需)
  output-path     输出文件路径 (必需)
  component-name  组件名称 (可选，默认为 FigmaComponent)

示例:
  node cli.ts "figd_xxx" "https://www.figma.com/design/xxx/...?node-id=123-456" "./MyComponent.tsx" "MyButton"

环境变量:
  FIGMA_ACCESS_TOKEN  如果设置，可以省略 access-token 参数
    `);
    process.exit(1);
  }

  const accessToken = args[0] || process.env.FIGMA_ACCESS_TOKEN || '';
  const figmaUrl = args[1];
  const outputPath = args[2];
  const componentName = args[3];

  convertFigmaToReact({
    accessToken,
    figmaUrl,
    outputPath,
    componentName,
    addComments: true,
  });
}
