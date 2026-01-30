/**
 * 修复 spec_id 外键约束问题
 *
 * 问题：works_entity 和 template_entity 表中存在 spec_id 值，但这些值在 works_spec_entity 表中不存在
 * 解决方案：将无效的 spec_id 设置为 null（因为字段是可选的）
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/fix-spec-id-relation.ts
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 使用 --dry-run 参数可以只查看需要修复的数据，不实际执行修复
 */

import { initPrisma } from '../index';

interface FixOptions {
  dryRun?: boolean; // 仅查看，不实际修复
  fixWorks?: boolean; // 是否修复 works_entity 表
  fixTemplates?: boolean; // 是否修复 template_entity 表
}

async function fixSpecIdRelation(options: FixOptions = {}) {
  const { dryRun = false, fixWorks = true, fixTemplates = true } = options;

  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL! });

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 运行模式: 仅查看（dry-run），不会实际修改数据\n');
  } else {
    console.log('⚠️  运行模式: 实际修复模式，将修改数据库\n');
  }

  try {
    // ============================================
    // 步骤 1: 获取所有有效的 spec_id
    // ============================================
    console.log('🔍 步骤 1: 获取所有有效的 spec_id...\n');

    const allSpecs = await prisma.worksSpecEntity.findMany({
      select: {
        id: true,
        name: true,
        alias: true,
      },
    });

    const validSpecIds = new Set(allSpecs.map(s => s.id));
    console.log(`   找到 ${validSpecIds.size} 个有效的规格记录\n`);

    // ============================================
    // 步骤 2: 检查并修复 works_entity 表
    // ============================================
    if (fixWorks) {
      console.log('🔍 步骤 2: 检查 works_entity 表中的无效 spec_id...\n');

      const allWorks = await prisma.worksEntity.findMany({
        where: {
          spec_id: {
            not: null,
          },
        },
        select: {
          id: true,
          spec_id: true,
          title: true,
        },
      });

      console.log(`   找到 ${allWorks.length} 个有 spec_id 的作品记录`);

      // 查找无效的 spec_id
      const invalidWorks = allWorks.filter(
        work => work.spec_id && !validSpecIds.has(work.spec_id)
      );

      if (invalidWorks.length > 0) {
        console.log(
          `   ⚠️  发现 ${invalidWorks.length} 个无效的 spec_id 记录:\n`
        );
        invalidWorks.forEach(work => {
          console.log(
            `   - ID: ${work.id}, spec_id: ${work.spec_id}, title: ${work.title || 'N/A'}`
          );
        });
        console.log('');

        if (!dryRun) {
          console.log('🔧 将无效的 spec_id 设置为 null...\n');
          const updateResult = await prisma.worksEntity.updateMany({
            where: {
              id: {
                in: invalidWorks.map(w => w.id),
              },
            },
            data: {
              spec_id: null,
            },
          });
          console.log(`   ✅ 已修复 ${updateResult.count} 个记录\n`);
        } else {
          console.log(
            `   [DRY-RUN] 将修复 ${invalidWorks.length} 个记录（将 spec_id 设置为 null）\n`
          );
        }
      } else {
        console.log('   ✅ 所有 spec_id 都是有效的\n');
      }
    }

    // ============================================
    // 步骤 3: 检查并修复 template_entity 表
    // ============================================
    if (fixTemplates) {
      console.log('🔍 步骤 3: 检查 template_entity 表中的无效 spec_id...\n');

      const allTemplates = await prisma.templateEntity.findMany({
        where: {
          spec_id: {
            not: null,
          },
        },
        select: {
          id: true,
          spec_id: true,
          title: true,
        },
      });

      console.log(`   找到 ${allTemplates.length} 个有 spec_id 的模板记录`);

      // 查找无效的 spec_id
      const invalidTemplates = allTemplates.filter(
        template => template.spec_id && !validSpecIds.has(template.spec_id)
      );

      if (invalidTemplates.length > 0) {
        console.log(
          `   ⚠️  发现 ${invalidTemplates.length} 个无效的 spec_id 记录:\n`
        );
        invalidTemplates.forEach(template => {
          console.log(
            `   - ID: ${template.id}, spec_id: ${template.spec_id}, title: ${template.title || 'N/A'}`
          );
        });
        console.log('');

        if (!dryRun) {
          console.log('🔧 将无效的 spec_id 设置为 null...\n');
          const updateResult = await prisma.templateEntity.updateMany({
            where: {
              id: {
                in: invalidTemplates.map(t => t.id),
              },
            },
            data: {
              spec_id: null,
            },
          });
          console.log(`   ✅ 已修复 ${updateResult.count} 个记录\n`);
        } else {
          console.log(
            `   [DRY-RUN] 将修复 ${invalidTemplates.length} 个记录（将 spec_id 设置为 null）\n`
          );
        }
      } else {
        console.log('   ✅ 所有 spec_id 都是有效的\n');
      }
    }

    // ============================================
    // 步骤 4: 验证修复结果
    // ============================================
    console.log('🔍 步骤 4: 验证修复结果...\n');

    if (fixWorks) {
      const finalWorks = await prisma.worksEntity.findMany({
        where: {
          spec_id: {
            not: null,
          },
        },
        select: {
          id: true,
          spec_id: true,
        },
      });

      const finalInvalidWorks = finalWorks.filter(
        work => work.spec_id && !validSpecIds.has(work.spec_id)
      );

      if (finalInvalidWorks.length > 0) {
        console.error(
          `   ❌ 验证失败！works_entity 表中仍有 ${finalInvalidWorks.length} 个无效的 spec_id:`
        );
        finalInvalidWorks.forEach(work => {
          console.error(`      - ID: ${work.id}, spec_id: ${work.spec_id}`);
        });
        process.exit(1);
      } else {
        console.log('   ✅ works_entity 表中所有 spec_id 都是有效的');
      }
    }

    if (fixTemplates) {
      const finalTemplates = await prisma.templateEntity.findMany({
        where: {
          spec_id: {
            not: null,
          },
        },
        select: {
          id: true,
          spec_id: true,
        },
      });

      const finalInvalidTemplates = finalTemplates.filter(
        template => template.spec_id && !validSpecIds.has(template.spec_id)
      );

      if (finalInvalidTemplates.length > 0) {
        console.error(
          `   ❌ 验证失败！template_entity 表中仍有 ${finalInvalidTemplates.length} 个无效的 spec_id:`
        );
        finalInvalidTemplates.forEach(template => {
          console.error(
            `      - ID: ${template.id}, spec_id: ${template.spec_id}`
          );
        });
        process.exit(1);
      } else {
        console.log('   ✅ template_entity 表中所有 spec_id 都是有效的');
      }
    }

    console.log('\n🎉 验证通过！数据已准备好进行迁移');
    console.log('\n📝 下一步: 执行 Prisma 迁移');
    console.log('   cd packages/jiantie/v11-database');
    console.log('   npx prisma db push');
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const options: FixOptions = {
  dryRun: args.includes('--dry-run'),
  fixWorks: !args.includes('--no-fix-works'),
  fixTemplates: !args.includes('--no-fix-templates'),
};

// 执行修复
fixSpecIdRelation(options);
