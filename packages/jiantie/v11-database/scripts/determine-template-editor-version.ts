/**
 * 确定模版的 editor_version
 *
 * 问题：
 * - TemplateEntity 表新增了 editor_version 字段，但现有数据可能没有正确设置
 * - 需要通过分析模版数据来判断编辑器版本
 *
 * 解决方案：
 * 1. 遍历所有模版实体（排除已删除的）
 * 2. 对每个模版，从 OSS 获取模版数据
 * 3. 使用 getAllBlock 函数分析模版数据：
 *    - 如果返回 null（有 cellsMap），说明是 v1 模版，editor_version = 1
 *    - 如果返回数组（有 gridsData），说明是 v2 模版，editor_version = 2
 * 4. 更新数据库中的 editor_version 字段
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   npx tsx scripts/determine-template-editor-version.ts
 *
 * 环境变量配置（在 .env.local 文件中）：
 *   DATABASE_URL=your_database_url
 *   # OSS 配置（阿里云）
 *   CLOUD_PROVIDER=aliyun
 *   ALIYUN_AK_ID=your_access_key_id
 *   ALIYUN_AK_SECRET=your_access_key_secret
 *   OSS_MAIN_BUCKET=your_bucket_name
 *   OSS_REGION=oss-cn-beijing
 *   STS_ROLE_ARN=acs:ram::账号ID:role/角色名称
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 使用 --dry-run 参数可以只查看需要更新的数据，不实际执行
 * - 脚本会自动从项目根目录或 packages/jiantie/ 目录加载 .env.local 文件
 */

import dotenv from 'dotenv';
import path from 'path';
import { getTemplateDataWithOSS } from '../../server/utils/works-utils';
import { initPrisma } from '../index';

// 加载环境变量
// 尝试从多个可能的位置加载 .env.local 文件
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
  console.warn('⚠️  未找到 .env.local 或 .env 文件，将使用系统环境变量');
}

interface MigrateOptions {
  dryRun?: boolean; // 仅查看，不实际更新
  batchSize?: number; // 批处理大小，默认 10
}

async function determineTemplateEditorVersion(options: MigrateOptions = {}) {
  const { dryRun = false, batchSize = 10 } = options;

  // 验证必需的环境变量
  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    console.error('   可以在 .env.local 文件中设置，或通过环境变量传入');
    process.exit(1);
  }

  // 验证 OSS 相关环境变量（用于获取模版数据）
  const requiredOssVars = [
    process.env.ALIYUN_AK_ID || process.env.AWS_ACCESS_KEY_ID,
    process.env.ALIYUN_AK_SECRET || process.env.AWS_SECRET_ACCESS_KEY,
    process.env.OSS_MAIN_BUCKET || process.env.S3_BUCKET,
    process.env.OSS_REGION || process.env.AWS_REGION,
  ];

  if (requiredOssVars.some(v => !v)) {
    console.warn('⚠️  警告: OSS 相关环境变量未完全设置，可能无法获取模版数据');
    console.warn('   需要设置以下环境变量之一：');
    console.warn(
      '   - 阿里云: ALIYUN_AK_ID, ALIYUN_AK_SECRET, OSS_MAIN_BUCKET, OSS_REGION'
    );
    console.warn(
      '   - AWS: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION'
    );
    console.warn('');
  }

  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL! });

  if (dryRun) {
    console.log('🔍 运行模式: 仅查看（dry-run），不会实际修改数据\n');
  } else {
    console.log('⚠️  运行模式: 实际更新模式，将修改数据库\n');
  }

  try {
    // ============================================
    // 步骤 1: 查找所有需要处理的模版
    // ============================================
    console.log('🔍 步骤 1: 查找所有需要处理的模版...\n');

    const allTemplates = await prisma.templateEntity.findMany({
      where: {
        deleted: false,
      },
      select: {
        id: true,
        title: true,
        editor_version: true,
      },
      orderBy: {
        create_time: 'asc',
      },
    });

    console.log(`   找到 ${allTemplates.length} 个模版需要处理\n`);

    if (allTemplates.length === 0) {
      console.log('   ✅ 没有需要处理的模版\n');
      return;
    }

    // ============================================
    // 步骤 2: 分析每个模版的编辑器版本
    // ============================================
    console.log('🔍 步骤 2: 分析每个模版的编辑器版本...\n');

    const results: Array<{
      templateId: string;
      templateTitle: string;
      currentVersion: number | null;
      detectedVersion: number;
      status: 'success' | 'error' | 'skip';
      error?: string;
    }> = [];

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    // 批量处理
    for (let i = 0; i < allTemplates.length; i += batchSize) {
      const batch = allTemplates.slice(i, i + batchSize);
      console.log(
        `   处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(allTemplates.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, allTemplates.length)}/${allTemplates.length})...`
      );

      await Promise.all(
        batch.map(async template => {
          try {
            // 获取模版数据
            const { work_data } = await getTemplateDataWithOSS({
              prisma,
              templateId: template.id,
            });

            // 分析编辑器版本
            // 参考 getGridProps 方法的逻辑来判断版本
            const gridProps = work_data.gridProps;
            let detectedVersion = 2; // 默认是 v2

            if (!gridProps?.version) {
              detectedVersion = 1;
            }

            // 检查是否需要更新
            const currentVersion = template.editor_version;
            const needsUpdate = currentVersion !== detectedVersion;

            if (needsUpdate) {
              results.push({
                templateId: template.id,
                templateTitle: template.title,
                currentVersion: currentVersion ?? null,
                detectedVersion,
                status: 'success',
              });
              successCount++;
            } else {
              results.push({
                templateId: template.id,
                templateTitle: template.title,
                currentVersion: currentVersion ?? null,
                detectedVersion,
                status: 'skip',
              });
              skipCount++;
            }
            processedCount++;
          } catch (error: any) {
            console.error(
              `   ❌ 处理模版 "${template.title}" (ID: ${template.id}) 失败:`,
              error.message
            );
            results.push({
              templateId: template.id,
              templateTitle: template.title,
              currentVersion: template.editor_version ?? null,
              detectedVersion: template.editor_version ?? 2,
              status: 'error',
              error: error.message,
            });
            errorCount++;
            processedCount++;
          }
        })
      );
    }

    console.log(`\n   处理完成:`);
    console.log(`   - 成功分析: ${successCount + skipCount} 个`);
    console.log(`   - 需要更新: ${successCount} 个`);
    console.log(`   - 无需更新: ${skipCount} 个`);
    console.log(`   - 处理失败: ${errorCount} 个\n`);

    // ============================================
    // 步骤 3: 显示需要更新的模版列表
    // ============================================
    const templatesToUpdate = results.filter(r => r.status === 'success');

    if (templatesToUpdate.length > 0) {
      console.log('📋 需要更新的模版列表:\n');
      templatesToUpdate.slice(0, 20).forEach(result => {
        console.log(
          `   - "${result.templateTitle}" (ID: ${result.templateId}): ${result.currentVersion ?? 'null'} -> ${result.detectedVersion}`
        );
      });
      if (templatesToUpdate.length > 20) {
        console.log(`   ... 还有 ${templatesToUpdate.length - 20} 个模版\n`);
      } else {
        console.log('');
      }
    }

    // ============================================
    // 步骤 4: 更新数据库
    // ============================================
    if (templatesToUpdate.length > 0) {
      console.log('🔧 步骤 3: 更新数据库...\n');

      if (!dryRun) {
        let updatedCount = 0;
        let updateErrorCount = 0;

        for (const result of templatesToUpdate) {
          try {
            await prisma.templateEntity.update({
              where: { id: result.templateId },
              data: { editor_version: result.detectedVersion },
            });
            updatedCount++;
          } catch (error: any) {
            console.error(
              `   ❌ 更新模版 "${result.templateTitle}" (ID: ${result.templateId}) 失败:`,
              error.message
            );
            updateErrorCount++;
          }
        }

        console.log(`   ✅ 成功更新 ${updatedCount} 个模版`);
        if (updateErrorCount > 0) {
          console.log(`   ⚠️  ${updateErrorCount} 个模版更新失败`);
        }
        console.log('');
      } else {
        console.log(
          `   [DRY-RUN] 将更新 ${templatesToUpdate.length} 个模版的 editor_version\n`
        );
      }
    } else {
      console.log('   ✅ 所有模版的 editor_version 都已正确设置，无需更新\n');
    }

    // ============================================
    // 步骤 5: 显示错误列表
    // ============================================
    const errorResults = results.filter(r => r.status === 'error');
    if (errorResults.length > 0) {
      console.log('⚠️  处理失败的模版列表:\n');
      errorResults.forEach(result => {
        console.log(
          `   - "${result.templateTitle}" (ID: ${result.templateId}): ${result.error}`
        );
      });
      console.log('');
    }

    // ============================================
    // 步骤 6: 统计最终结果
    // ============================================
    console.log('🔍 步骤 4: 统计最终结果...\n');

    const finalStats = await prisma.templateEntity.groupBy({
      by: ['editor_version'],
      where: {
        deleted: false,
      },
      _count: {
        id: true,
      },
    });

    console.log(`   最终统计:`);
    finalStats.forEach(stat => {
      console.log(
        `   - editor_version = ${stat.editor_version ?? 'null'}: ${stat._count.id} 个模版`
      );
    });
    console.log('');

    console.log('🎉 迁移完成！');
    if (!dryRun && templatesToUpdate.length > 0) {
      console.log(
        `\n📝 已更新 ${templatesToUpdate.length} 个模版的 editor_version 字段`
      );
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const options: MigrateOptions = {
  dryRun: args.includes('--dry-run'),
  batchSize: args.includes('--batch-size')
    ? parseInt(args[args.indexOf('--batch-size') + 1]) || 10
    : 10,
};

// 执行迁移
determineTemplateEditorVersion(options);
