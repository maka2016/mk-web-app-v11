import dotenv from 'dotenv';
import { initPrisma } from '@mk/jiantie/works-database';
import { imageSize } from 'image-size';
import axios from 'axios';

dotenv.config({ path: '.env.local' });
const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

interface CoverV3 {
  url: string;
  width: number;
  height: number;
}

interface CheckResult {
  templateId: string;
  title: string;
  coverV3: CoverV3;
  actualWidth: number;
  actualHeight: number;
  actualRatio: number;
  recordedRatio: number;
  ratioDiff: number;
  status: 'match' | 'mismatch' | 'error';
  error?: string;
}

/**
 * 获取图片的真实尺寸
 */
async function getImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  try {
    // 尝试使用 OSS 的 image/info 接口（如果图片在 OSS 上）
    if (url.includes('oss-') || url.includes('aliyuncs.com')) {
      try {
        const infoUrl = url.includes('?')
          ? `${url}&x-oss-process=image/info`
          : `${url}?x-oss-process=image/info`;
        const response = await axios.get(infoUrl, { timeout: 10000 });
        const imageInfo = response.data as any;
        if (imageInfo?.ImageWidth?.value && imageInfo?.ImageHeight?.value) {
          return {
            width: Number(imageInfo.ImageWidth.value),
            height: Number(imageInfo.ImageHeight.value),
          };
        }
      } catch {
        // OSS info 接口失败，继续使用 image-size
        console.warn(`OSS info 接口失败，使用 image-size: ${url}`);
      }
    }

    // 使用 image-size 获取图片尺寸（通过 buffer）
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    const buffer = Buffer.from(response.data);
    const result = imageSize(buffer);
    if (!result || !result.width || !result.height) {
      throw new Error('无法解析图片尺寸');
    }
    return {
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error(`获取图片尺寸失败: ${url}`, error);
    return null;
  }
}

/**
 * 检查单个模板的 coverV3
 */
async function checkTemplateCoverV3(
  templateId: string,
  title: string,
  coverV3: any
): Promise<CheckResult> {
  // 验证 coverV3 结构
  if (!coverV3 || typeof coverV3 !== 'object') {
    return {
      templateId,
      title,
      coverV3: { url: '', width: 0, height: 0 },
      actualWidth: 0,
      actualHeight: 0,
      actualRatio: 0,
      recordedRatio: 0,
      ratioDiff: 0,
      status: 'error',
      error: 'coverV3 格式错误',
    };
  }

  const url = coverV3.url;
  const recordedWidth = Number(coverV3.width) || 0;
  const recordedHeight = Number(coverV3.height) || 0;

  if (!url) {
    return {
      templateId,
      title,
      coverV3: { url: '', width: recordedWidth, height: recordedHeight },
      actualWidth: 0,
      actualHeight: 0,
      actualRatio: 0,
      recordedRatio: 0,
      ratioDiff: 0,
      status: 'error',
      error: 'coverV3.url 为空',
    };
  }

  if (recordedWidth === 0 || recordedHeight === 0) {
    return {
      templateId,
      title,
      coverV3: { url, width: recordedWidth, height: recordedHeight },
      actualWidth: 0,
      actualHeight: 0,
      actualRatio: 0,
      recordedRatio: 0,
      ratioDiff: 0,
      status: 'error',
      error: 'coverV3 width 或 height 为 0',
    };
  }

  // 获取图片真实尺寸
  const dimensions = await getImageDimensions(url);
  if (!dimensions) {
    return {
      templateId,
      title,
      coverV3: { url, width: recordedWidth, height: recordedHeight },
      actualWidth: 0,
      actualHeight: 0,
      actualRatio: 0,
      recordedRatio: 0,
      ratioDiff: 0,
      status: 'error',
      error: '无法获取图片尺寸',
    };
  }

  const actualWidth = dimensions.width;
  const actualHeight = dimensions.height;
  const actualRatio = actualHeight / actualWidth;
  const recordedRatio = recordedHeight / recordedWidth;
  const ratioDiff = Math.abs(actualRatio - recordedRatio);

  // 允许 0.01 的误差（约 1%）
  const tolerance = 0.01;
  const isMatch = ratioDiff <= tolerance;

  return {
    templateId,
    title,
    coverV3: { url, width: recordedWidth, height: recordedHeight },
    actualWidth,
    actualHeight,
    actualRatio,
    recordedRatio,
    ratioDiff,
    status: isMatch ? 'match' : 'mismatch',
  };
}

/**
 * 主函数：扫描所有 template entity 的 coverV3
 */
async function scanTemplateCoverV3() {
  console.log('开始扫描 template entity 的 coverV3...');

  // 查询所有有 coverV3 的模板
  const allTemplates = await prisma.templateEntity.findMany({
    where: {
      deleted: false,
    },
    select: {
      id: true,
      title: true,
      coverV3: true,
    },
  });

  // 过滤出有 coverV3 的模板
  const templates = allTemplates.filter(
    t => t.coverV3 !== null && typeof t.coverV3 === 'object'
  );

  console.log(`找到 ${templates.length} 个有 coverV3 的模板`);

  const results: CheckResult[] = [];
  let processed = 0;
  let matchCount = 0;
  let mismatchCount = 0;
  let errorCount = 0;

  // 批量处理，避免并发过多
  const batchSize = 50;
  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(template =>
        checkTemplateCoverV3(template.id, template.title, template.coverV3)
      )
    );

    results.push(...batchResults);

    // 统计
    batchResults.forEach(result => {
      if (result.status === 'match') {
        matchCount++;
      } else if (result.status === 'mismatch') {
        mismatchCount++;
      } else {
        errorCount++;
      }
    });

    processed += batch.length;
    console.log(`已处理 ${processed}/${templates.length} 个模板`);

    // 避免请求过快，添加小延迟
    if (i + batchSize < templates.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 输出结果
  console.log('\n=== 扫描结果统计 ===');
  console.log(`总计: ${templates.length}`);
  console.log(`匹配: ${matchCount}`);
  console.log(`不匹配: ${mismatchCount}`);
  console.log(`错误: ${errorCount}`);

  // 处理不匹配的记录，更新数据库
  const mismatches = results.filter(r => r.status === 'mismatch');
  if (mismatches.length > 0) {
    console.log(`\n=== 发现 ${mismatches.length} 个不匹配的记录，开始更新 ===`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const result of mismatches) {
      try {
        // 计算新的高度：540 * 实际比例
        const newWidth = 540;
        const newHeight = Math.round(540 * result.actualRatio);

        // 更新数据库
        await prisma.templateEntity.update({
          where: { id: result.templateId },
          data: {
            coverV3: {
              url: result.coverV3.url,
              width: newWidth,
              height: newHeight,
            },
          },
        });

        console.log(
          `✓ 已更新: ${result.templateId} | ${result.title} | ${result.coverV3.width}x${result.coverV3.height} -> ${newWidth}x${newHeight}`
        );
        updatedCount++;
      } catch (error) {
        console.error(
          `✗ 更新失败: ${result.templateId} | ${result.title}`,
          error
        );
        failedCount++;
      }
    }

    console.log(`\n=== 更新完成 ===`);
    console.log(`成功更新: ${updatedCount}`);
    console.log(`更新失败: ${failedCount}`);
  }

  // 输出错误的记录
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.log('\n=== 错误的记录 ===');
    errors.forEach(result => {
      console.log(`\n模板ID: ${result.templateId}`);
      console.log(`标题: ${result.title}`);
      console.log(`错误: ${result.error}`);
      if (result.coverV3.url) {
        console.log(`URL: ${result.coverV3.url}`);
      }
    });
  }

  return results;
}

// 执行脚本
if (require.main === module) {
  (async function run() {
    try {
      await scanTemplateCoverV3();
      process.exit(0);
    } catch (error) {
      console.error('扫描失败:', error);
      process.exit(1);
    }
  })();
}

export { scanTemplateCoverV3 };
