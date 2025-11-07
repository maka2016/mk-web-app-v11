/**
 * 测试脚本 - 快速验证 Figma 转换功能
 *
 * 使用方法（在 Cursor 中让 AI 执行）:
 *
 * "请运行 figma2cursor/test-convert.ts，
 *  将 Figma 设计 https://www.figma.com/design/xxx/...?node-id=7426-25858
 *  转换为 ShareInviteCard 组件，保存到 /tmp/ShareInviteCard.tsx"
 */

import * as fs from 'fs';
import { convertFigmaToFile } from './services/figma-api';

async function testConvert() {
  try {
    console.log('🧪 开始测试 Figma to React 转换...\n');

    // 从环境变量获取 Token
    const accessToken = process.env.FIGMA_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('❌ 未找到 FIGMA_ACCESS_TOKEN 环境变量');
      console.log('\n请先设置环境变量：');
      console.log('  export FIGMA_ACCESS_TOKEN="figd_your_token_here"');
      console.log('\n或在 .env.local 文件中添加：');
      console.log('  FIGMA_ACCESS_TOKEN=figd_your_token_here');
      process.exit(1);
    }

    // 测试配置（你可以修改这些值）
    const config = {
      accessToken,
      figmaUrl: 'https://www.figma.com/design/YOUR_FILE/...?node-id=7426-25858',
      outputPath: '/tmp/FigmaTestComponent.tsx',
      componentName: 'FigmaTestComponent',
      addComments: true,
    };

    console.log('📋 转换配置:');
    console.log('  URL:', config.figmaUrl);
    console.log('  输出:', config.outputPath);
    console.log('  组件:', config.componentName);
    console.log('');

    // 执行转换
    const outputPath = await convertFigmaToFile(config);

    // 读取并显示结果
    const code = fs.readFileSync(outputPath, 'utf-8');
    const lines = code.split('\n').length;
    const size = fs.statSync(outputPath).size;

    console.log('✅ 转换成功！\n');
    console.log('📊 统计:');
    console.log(`  文件大小: ${size} bytes`);
    console.log(`  代码行数: ${lines} 行`);
    console.log(`  文件路径: ${outputPath}\n`);

    console.log('📝 生成的代码预览（前 30 行）:');
    console.log('─'.repeat(60));
    console.log(code.split('\n').slice(0, 30).join('\n'));
    console.log('─'.repeat(60));
    console.log('\n💡 查看完整代码:', outputPath);
  } catch (error: any) {
    console.error('\n❌ 转换失败\n');
    console.error('错误信息:', error.message);

    if (error.message.includes('Token')) {
      console.log('\n💡 提示: 请检查 FIGMA_ACCESS_TOKEN 是否正确设置');
    } else if (error.message.includes('node-id')) {
      console.log('\n💡 提示: 请确保 Figma URL 包含 node-id 参数');
      console.log(
        '   正确格式: https://www.figma.com/design/xxx/...?node-id=123-456'
      );
    }

    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testConvert();
}

export { testConvert };
