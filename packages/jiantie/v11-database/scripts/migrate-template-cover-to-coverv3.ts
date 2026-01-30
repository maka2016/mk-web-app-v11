/**
 * 将模板实体的 cover 和 coverV2 数据迁移到 coverV3
 *
 * 迁移内容：
 * - 查询所有 coverV3 为 null 但 cover 或 coverV2 不为空的模板
 * - 从图片 URL 获取图片尺寸
 * - 更新 coverV3 字段为 { url: string, width: number, height: number }
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/migrate-template-cover-to-coverv3.ts
 *
 * 参数：
 *   --dry-run: 仅查看数据，不实际迁移
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 脚本会更新 coverV3 字段，不会删除 cover 和 coverV2
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { imageSize } from 'image-size';
import path from 'path';
import { Prisma } from '../generated/client/client';
import { initPrisma } from '../index';

// 加载环境变量
const possibleEnvPaths = [
  // 项目根目录
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../../../.env'),
  // packages/jiantie/ 目录
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  // 当前工作目录
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✅ 已加载环境变量文件: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  未找到环境变量文件，将使用系统环境变量');
}

interface CoverV3 {
  url: string;
  width: number;
  height: number;
}

interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ templateId: string; title: string; error: string }>;
}

/**
 * 获取图片的真实尺寸
 */
async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    // 尝试使用 OSS 的 image/info 接口（如果图片在 OSS 上）
    if (url.includes('oss-') || url.includes('aliyuncs.com')) {
      try {
        const infoUrl = url.includes('?') ? `${url}&x-oss-process=image/info` : `${url}?x-oss-process=image/info`;
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
 * 迁移单个模板的 cover 到 coverV3
 */
async function migrateTemplateCover(
  prisma: ReturnType<typeof initPrisma>,
  templateId: string,
  title: string,
  coverUrl: string,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取图片尺寸
    const dimensions = await getImageDimensions(coverUrl);

    let width = 540;
    let height = 960; // 默认 9:16 比例

    if (dimensions) {
      width = dimensions.width;
      height = dimensions.height;
    } else {
      console.warn(`⚠️  无法获取图片尺寸，使用默认值 (540x960): ${templateId} - ${title}`);
    }

    const coverV3: CoverV3 = {
      url: coverUrl,
      width,
      height,
    };

    if (dryRun) {
      console.log(`[DRY RUN] 将更新模板 ${templateId} (${title}):`, JSON.stringify(coverV3, null, 2));
      return { success: true };
    }

    // 更新数据库
    await prisma.templateEntity.update({
      where: { id: templateId },
      data: { coverV3: coverV3 as any },
    });

    console.log(`✅ 已更新模板 ${templateId} (${title}): ${coverUrl} -> ${width}x${height}`);
    return { success: true };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`❌ 迁移失败 ${templateId} (${title}):`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * 执行迁移
 */
async function runMigration(dryRun: boolean = false) {
  const prisma = initPrisma({
    connectionString: process.env.DATABASE_URL || '',
  });

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  console.log('🚀 开始迁移模板 cover 到 coverV3...');
  if (dryRun) {
    console.log('⚠️  DRY RUN 模式：不会实际更新数据库');
  }

  const stats: MigrationStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // 查询所有有 cover 或 coverV2 的模板
    // 注意：由于 Prisma JSON 字段查询 null 的限制，我们先查询所有符合条件的模板，然后在代码中过滤
    const allTemplates = await prisma.templateEntity.findMany({
      where: {
        coverV3: {
          equals: Prisma.DbNull,
        },
        OR: [{ cover: { not: null } }, { coverV2: { not: null } }],
      },
      select: {
        id: true,
        title: true,
        cover: true,
        coverV2: true,
        coverV3: true,
      },
    });

    // 在代码中过滤 coverV3 为 null 的模板
    const templates = allTemplates.filter(template => {
      // coverV3 为 null 或 undefined，或者不是有效的对象
      if (!template.coverV3) {
        return true;
      }
      // 如果是对象但没有 url 字段，也认为需要迁移
      if (typeof template.coverV3 === 'object') {
        const coverV3 = template.coverV3 as any;
        return !coverV3.url;
      }
      return false;
    });

    stats.total = templates.length;
    console.log(`📊 找到 ${stats.total} 个需要迁移的模板（从 ${allTemplates.length} 个有 cover/coverV2 的模板中筛选）`);

    if (stats.total === 0) {
      console.log('✅ 没有需要迁移的模板');
      await prisma.$disconnect();
      return;
    }

    // 批量并发迁移，每批10个
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(templates.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, templates.length);
      const batch = templates.slice(startIndex, endIndex);

      console.log(`\n📦 处理第 ${batchIndex + 1}/${totalBatches} 批 (${startIndex + 1}-${endIndex}/${stats.total})...`);

      // 并发处理当前批次
      const batchPromises = batch.map(async (template, indexInBatch) => {
        const templateId = template.id;
        const title = template.title || '未知标题';
        const globalIndex = startIndex + indexInBatch + 1;

        // 检查是否已经有 coverV3（双重检查）
        if (template.coverV3 && typeof template.coverV3 === 'object') {
          const existingCoverV3 = template.coverV3 as any;
          if (existingCoverV3.url) {
            console.log(`⏭️  [${globalIndex}/${stats.total}] 跳过 ${templateId} (${title}): 已有 coverV3`);
            return { success: true, skipped: true };
          }
        }

        // 优先使用 coverV2，如果没有则使用 cover
        const coverUrl = template.coverV2 || template.cover;

        if (!coverUrl) {
          console.warn(`⚠️  [${globalIndex}/${stats.total}] 跳过 ${templateId} (${title}): cover 和 coverV2 都为空`);
          return { success: true, skipped: true };
        }

        console.log(`[${globalIndex}/${stats.total}] 处理模板 ${templateId} (${title})...`);

        const result = await migrateTemplateCover(prisma, templateId, title, coverUrl, dryRun);

        return {
          success: result.success,
          skipped: false,
          error: result.error,
          templateId,
          title,
        };
      });

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);

      // 统计当前批次结果
      for (const result of batchResults) {
        if (result.skipped) {
          stats.skipped++;
        } else if (result.success) {
          stats.success++;
        } else {
          stats.failed++;
          stats.errors.push({
            templateId: result.templateId || 'unknown',
            title: result.title || '未知标题',
            error: result.error || '未知错误',
          });
        }
      }

      // 批次间添加短暂延迟，避免请求过快
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 输出统计信息
    console.log('\n📊 迁移统计:');
    console.log(`   总数: ${stats.total}`);
    console.log(`   成功: ${stats.success}`);
    console.log(`   失败: ${stats.failed}`);
    console.log(`   跳过: ${stats.skipped}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ 失败详情:');
      stats.errors.forEach(({ templateId, title, error }) => {
        console.log(`   - ${templateId} (${title}): ${error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  这是 DRY RUN 模式，未实际更新数据库');
    } else {
      console.log('\n✅ 迁移完成！');
    }
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// 执行迁移
if (require.main === module) {
  runMigration(dryRun)
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { runMigration };
