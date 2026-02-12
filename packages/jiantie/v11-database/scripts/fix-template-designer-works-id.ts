/**
 * 修复 template_entity 表中 designer_works_id 外键约束问题
 *
 * 问题：template_entity 表中存在 designer_works_id 值，但这些值在 works_entity 表中不存在
 * 解决方案：将无效的 designer_works_id 设置为 null（因为字段是可选的）
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/fix-template-designer-works-id.ts
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 使用 --dry-run 参数可以只查看需要修复的数据，不实际执行修复
 */

import { initPrisma } from '../index';

interface FixOptions {
  dryRun?: boolean; // 仅查看，不实际修复
}

async function fixTemplateDesignerWorksId(options: FixOptions = {}) {
  const { dryRun = false } = options;

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔍 开始检查 template_entity 表中的 designer_works_id...\n');

    // 1. 获取所有有效的 works_id
    const validWorksIds = await prisma.worksEntity.findMany({
      select: { id: true },
    });
    const validWorksIdSet = new Set(validWorksIds.map(w => w.id));

    console.log(`   ✅ 找到 ${validWorksIdSet.size} 个有效的作品ID\n`);

    // 2. 查找所有有 designer_works_id 的模板
    const templatesWithWorksId = await prisma.templateEntity.findMany({
      where: {
        designer_works_id: { not: null },
      },
      select: {
        id: true,
        title: true,
        designer_works_id: true,
      },
    });

    console.log(
      `   📊 找到 ${templatesWithWorksId.length} 个模板有 designer_works_id\n`
    );

    // 3. 找出无效的 designer_works_id
    const invalidTemplates = templatesWithWorksId.filter(
      template =>
        template.designer_works_id &&
        !validWorksIdSet.has(template.designer_works_id)
    );

    if (invalidTemplates.length === 0) {
      console.log('   ✅ 所有 designer_works_id 都是有效的！\n');
      console.log('🎉 无需修复，可以直接执行迁移');
      return;
    }

    console.log(
      `   ⚠️  发现 ${invalidTemplates.length} 个无效的 designer_works_id:\n`
    );

    // 显示前10个无效记录
    invalidTemplates.slice(0, 10).forEach(template => {
      console.log(
        `      - 模板ID: ${template.id}, 标题: ${template.title || '未命名'}, 无效的 designer_works_id: ${template.designer_works_id}`
      );
    });

    if (invalidTemplates.length > 10) {
      console.log(`      ... 还有 ${invalidTemplates.length - 10} 个无效记录`);
    }

    console.log('');

    if (dryRun) {
      console.log('   🔍 [DRY RUN] 仅查看模式，不会实际修改数据\n');
      console.log(
        `   如需修复，请运行: npx tsx scripts/fix-template-designer-works-id.ts`
      );
      return;
    }

    // 4. 修复无效的 designer_works_id（设置为 null）
    console.log('   🔧 开始修复无效的 designer_works_id...\n');

    const invalidWorksIds = invalidTemplates
      .map(t => t.designer_works_id)
      .filter((id): id is string => !!id);

    const result = await prisma.templateEntity.updateMany({
      where: {
        designer_works_id: { in: invalidWorksIds },
      },
      data: {
        designer_works_id: null,
      },
    });

    console.log(
      `   ✅ 已修复 ${result.count} 个模板的 designer_works_id（设置为 null）\n`
    );

    // 5. 验证修复结果
    console.log('   🔍 验证修复结果...\n');

    const remainingInvalid = await prisma.templateEntity.findMany({
      where: {
        designer_works_id: { not: null },
      },
      select: {
        id: true,
        designer_works_id: true,
      },
    });

    const stillInvalid = remainingInvalid.filter(
      template =>
        template.designer_works_id &&
        !validWorksIdSet.has(template.designer_works_id)
    );

    if (stillInvalid.length > 0) {
      console.error(
        `   ❌ 验证失败！仍有 ${stillInvalid.length} 个无效的 designer_works_id:`
      );
      stillInvalid.forEach(template => {
        console.error(
          `      - 模板ID: ${template.id}, designer_works_id: ${template.designer_works_id}`
        );
      });
      process.exit(1);
    } else {
      console.log('   ✅ 所有 designer_works_id 都是有效的\n');
    }

    console.log('🎉 修复完成！现在可以执行 Prisma 迁移了');
    console.log('\n📝 下一步: 执行 Prisma 迁移');
    console.log('   cd packages/jiantie/v11-database');
    console.log('   npx prisma migrate dev --name add_template_designer_works_relation');
    console.log('   或');
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
const dryRun = args.includes('--dry-run');

// 执行修复
fixTemplateDesignerWorksId({ dryRun });
