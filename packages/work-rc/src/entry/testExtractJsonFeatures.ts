import fs from 'fs';
import path from 'path';
import { extractJsonFeatures } from '../utils/service';

/**
 * 测试 JSON 特征提取功能
 */
async function main() {
  console.log('开始测试 JSON 特征提取...\n');

  // 获取 utils 目录的路径（从 entry 目录向上到 src，然后进入 utils）
  const utilsDir = path.resolve(__dirname, '../utils');

  // 测试用例配置
  const testCases = [
    // { filename: 'example1.json', uid: 605551267, format: '新格式' },
    // { filename: 'example2.json', uid: 603982064, format: '旧格式' },
    // { filename: 'example3.json', uid: 603982064, format: '旧格式' },
    // { filename: 'example4.json', uid: 605434319, format: '新格式' },
    // { filename: 'example5.json', uid: 2443287, format: '新格式' },
    // { filename: 'example6.json', uid: 7056661, format: '新格式' },
    { filename: 'example7.json', uid: 605551486, format: '新格式' },
  ];

  // 循环测试每个用例
  for (const testCase of testCases) {
    console.log('='.repeat(60));
    console.log(`测试 ${testCase.filename} (${testCase.format})`);
    console.log('='.repeat(60));
    try {
      const filePath = path.join(utilsDir, testCase.filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      if (!fileContent.trim()) {
        throw new Error('文件内容为空');
      }
      const data = JSON.parse(fileContent);
      const features = extractJsonFeatures(data, testCase.uid);

      console.log('\n提取结果:');
      console.log(`  文字组件个数: ${features.textCount}`);
      console.log(`  文字内容:`, features.textContents);
      console.log(`  图片组件个数: ${features.imageCount}`);
      console.log(`  图片URL:`, features.imageUrls);
      console.log(
        `  用户上传图片个数 (uid=${testCase.uid}): ${features.userUploadedImageCount}`
      );
      console.log(`  用户上传图片URL:`, features.userUploadedImageUrls);
      console.log(`  外链个数: ${features.linkCount}`);
      console.log(`  外链URL:`, features.linkUrls);
      console.log(`  页面数量: ${features.pageCount}`);
      console.log(`  背景图片URL:`, features.backgroundImageUrls);
      console.log(`\n✅ ${testCase.filename} 测试通过\n`);
    } catch (error) {
      console.error(`❌ ${testCase.filename} 测试失败:`, error);
    }
  }

  console.log('='.repeat(60));
  console.log('所有测试完成');
  console.log('='.repeat(60));
}

// 执行测试
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

export { main };
