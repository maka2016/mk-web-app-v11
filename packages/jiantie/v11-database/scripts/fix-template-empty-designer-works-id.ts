/**
 * 修复 template_entity 表中 designer_works_id 为空字符串的问题
 *
 * 问题：template_entity 表中存在 designer_works_id 为空字符串（''）的记录
 * 解决方案：将这些空字符串重置为 null（因为字段是可选的，应该使用 null 而不是空字符串）
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/fix-template-empty-designer-works-id.ts
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

async function fixTemplateEmptyDesignerWorksId(options: FixOptions = {}) {
  const { dryRun = false } = options;

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔍 开始检查 template_entity 表中的 designer_works_id...\n');

    // 1. 查找所有 designer_works_id 为空字符串的记录
    const templatesWithEmptyString = await prisma.templateEntity.findMany({
      where: {
        designer_works_id: '',
      },
      select: {
        id: true,
        title: true,
        designer_works_id: true,
        designer_uid: true,
        create_time: true,
      },
      orderBy: {
        create_time: 'desc',
      },
    });

    const count = templatesWithEmptyString.length;

    if (count === 0) {
      console.log('   ✅ 没有找到 designer_works_id 为空字符串的记录\n');
      console.log('🎉 无需修复');
      return;
    }

    console.log(`   📊 找到 ${count} 个 designer_works_id 为空字符串的模板\n`);

    // 2. 显示统计信息
    const byYear = new Map<number, number>();
    templatesWithEmptyString.forEach(t => {
      const year = t.create_time?.getFullYear() || 0;
      byYear.set(year, (byYear.get(year) || 0) + 1);
    });

    console.log('📅 按年份统计:');
    Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([year, count]) => {
        console.log(`   ${year} 年: ${count} 个`);
      });
    console.log('');

    // 3. 显示前10个记录
    console.log('📋 需要修复的记录（前10个）:\n');
    templatesWithEmptyString.slice(0, 10).forEach((template, index) => {
      console.log(
        `${index + 1}. 模板ID: ${template.id}, 标题: ${template.title || '未命名'}, 设计师UID: ${template.designer_uid || '未知'}`
      );
    });

    if (count > 10) {
      console.log(`   ... 还有 ${count - 10} 个记录`);
    }
    console.log('');

    if (dryRun) {
      console.log('   🔍 [DRY RUN] 仅查看模式，不会实际修改数据\n');
      console.log(
        `   如需修复，请运行: npx tsx scripts/fix-template-empty-designer-works-id.ts`
      );
      return;
    }

    // 4. 执行修复：将空字符串重置为 null
    console.log('   🔧 开始修复...\n');

    const result = await prisma.templateEntity.updateMany({
      where: {
        designer_works_id: '',
      },
      data: {
        designer_works_id: null,
      },
    });

    console.log(
      `   ✅ 已修复 ${result.count} 个模板的 designer_works_id（从空字符串重置为 null）\n`
    );

    // 5. 验证修复结果
    console.log('   🔍 验证修复结果...\n');

    const remainingEmpty = await prisma.templateEntity.count({
      where: {
        designer_works_id: '',
      },
    });

    if (remainingEmpty > 0) {
      console.error(
        `   ❌ 验证失败！仍有 ${remainingEmpty} 个 designer_works_id 为空字符串`
      );
      process.exit(1);
    } else {
      console.log('   ✅ 所有空字符串已成功重置为 null\n');
    }

    // 6. 统计修复后的状态
    const nullCount = await prisma.templateEntity.count({
      where: {
        designer_works_id: null,
        deleted: false,
      },
    });

    const validCount = await prisma.templateEntity.count({
      where: {
        designer_works_id: { not: null },
        deleted: false,
      },
    });

    console.log('📊 修复后的统计:');
    console.log(`   designer_works_id 为 null: ${nullCount} 个`);
    console.log(`   designer_works_id 有值: ${validCount} 个`);
    console.log('');

    console.log('🎉 修复完成！');
    console.log('\n📝 下一步: 可以执行 Prisma 迁移（如果需要）');
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
fixTemplateEmptyDesignerWorksId({ dryRun });
