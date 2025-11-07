/**
 * Figma to React 基础使用示例
 *
 * 这个文件展示了如何在代码中使用 Figma 转换服务
 */

import {
  convertFigmaToCode,
  convertFigmaToFile,
  batchConvert,
  getAccessToken,
} from '../services/figma-api';

/**
 * 示例 1: 转换单个组件（获取代码字符串）
 */
async function example1_convertToCode() {
  try {
    const result = await convertFigmaToCode({
      accessToken: getAccessToken(),
      figmaUrl: 'https://www.figma.com/design/xxx/...?node-id=7426-25858',
      componentName: 'ShareButton',
      addComments: true,
    });

    console.log('生成的代码:');
    console.log(result.code);
    console.log('\n元数据:', result.metadata);
  } catch (error) {
    console.error('转换失败:', error);
  }
}

/**
 * 示例 2: 转换并保存到文件
 */
async function example2_convertToFile() {
  try {
    const outputPath = await convertFigmaToFile({
      accessToken: getAccessToken(),
      figmaUrl: 'https://www.figma.com/design/xxx/...?node-id=7426-25858',
      outputPath: './packages/jiantie/components/ShareButton.tsx',
      componentName: 'ShareButton',
      addComments: true,
    });

    console.log('✅ 文件已保存:', outputPath);
  } catch (error) {
    console.error('转换失败:', error);
  }
}

/**
 * 示例 3: 批量转换多个组件
 */
async function example3_batchConvert() {
  try {
    const accessToken = getAccessToken();
    const baseUrl = 'https://www.figma.com/design/YOUR_FILE_KEY/...?node-id=';

    const results = await batchConvert({
      accessToken,
      conversions: [
        {
          url: baseUrl + '111-222',
          outputPath: './components/buttons/PrimaryButton.tsx',
          componentName: 'PrimaryButton',
        },
        {
          url: baseUrl + '333-444',
          outputPath: './components/buttons/SecondaryButton.tsx',
          componentName: 'SecondaryButton',
        },
        {
          url: baseUrl + '555-666',
          outputPath: './components/cards/Card.tsx',
          componentName: 'Card',
        },
      ],
    });

    console.log(`✅ 成功转换 ${results.length} 个组件`);
    console.log('文件列表:');
    results.forEach(file => console.log(`  - ${file}`));
  } catch (error) {
    console.error('批量转换失败:', error);
  }
}

/**
 * 示例 4: 在 Cursor AI 中使用
 *
 * 在 Cursor 中对 AI 说：
 *
 * "请使用 figma-api.ts 中的 convertFigmaToFile 函数，
 *  将 Figma 设计 [URL] 转换为 React 组件，
 *  保存到 components/MyComponent.tsx"
 *
 * AI 会自动执行类似以下的代码：
 */
async function cursorAIExample() {
  await convertFigmaToFile({
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    figmaUrl: 'https://www.figma.com/design/xxx/...?node-id=7426-25858',
    outputPath: './components/MyComponent.tsx',
    componentName: 'MyComponent',
    addComments: true,
  });
}

/**
 * 运行示例
 *
 * 在终端中执行：
 * npx tsx packages/jiantie/app/figma2cursor/examples/basic-usage.ts
 */
async function main() {
  console.log('Figma to React 转换示例\n');
  console.log('请选择要运行的示例：');
  console.log('1. 转换为代码字符串');
  console.log('2. 转换并保存到文件');
  console.log('3. 批量转换多个组件');
  console.log('4. Cursor AI 使用示例\n');

  // 取消注释你想运行的示例
  // await example1_convertToCode();
  // await example2_convertToFile();
  // await example3_batchConvert();
  // await cursorAIExample();

  console.log('\n💡 提示: 取消注释上面的示例函数来运行');
}

if (require.main === module) {
  main();
}

export {
  example1_convertToCode,
  example2_convertToFile,
  example3_batchConvert,
  cursorAIExample,
};
