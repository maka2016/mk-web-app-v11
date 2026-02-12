/**
 * 检查 rsvp_form_config_entity 表中是否存在重复的 works_id
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/check-rsvp-duplicate-works-id.ts
 */

import { initPrisma } from '../index';

async function checkDuplicateWorksId() {
  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL! });

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  try {
    console.log('🔍 检查 rsvp_form_config_entity 表中的重复 works_id...\n');

    // 方法 1: 使用 Prisma 查询
    const allConfigs = await prisma.rsvpFormConfigEntity.findMany({
      where: {
        deleted: false, // 只检查未删除的记录
      },
      select: {
        id: true,
        works_id: true,
        title: true,
        enabled: true,
        create_time: true,
      },
      orderBy: {
        create_time: 'desc',
      },
    });

    console.log(`   找到 ${allConfigs.length} 个未删除的 RSVP 配置记录\n`);

    // 按 works_id 分组
    const configsByWorksId = new Map<string, typeof allConfigs>();
    allConfigs.forEach(config => {
      if (!configsByWorksId.has(config.works_id)) {
        configsByWorksId.set(config.works_id, []);
      }
      configsByWorksId.get(config.works_id)!.push(config);
    });

    // 查找重复的 works_id
    const duplicateWorksIds: string[] = [];
    configsByWorksId.forEach((configs, worksId) => {
      if (configs.length > 1) {
        duplicateWorksIds.push(worksId);
      }
    });

    if (duplicateWorksIds.length > 0) {
      console.log(
        `   ⚠️  发现 ${duplicateWorksIds.length} 个作品有多个 RSVP 配置:\n`
      );

      for (const worksId of duplicateWorksIds) {
        const configs = configsByWorksId.get(worksId)!;
        console.log(`   📋 works_id: ${worksId} (${configs.length} 个配置)`);
        configs.forEach((config, index) => {
          console.log(
            `      ${index + 1}. ID: ${config.id}, title: ${config.title || 'N/A'}, enabled: ${config.enabled}, create_time: ${config.create_time.toISOString()}`
          );
        });
        console.log('');
      }

      console.log('\n❌ 存在重复的 works_id，无法添加唯一约束！');
      console.log('\n💡 解决方案：');
      console.log('   运行修复脚本：');
      console.log(
        '   DATABASE_URL="your_database_url" npx tsx scripts/fix-rsvp-works-relation.ts'
      );
      console.log('\n   或者使用 dry-run 模式先查看：');
      console.log(
        '   DATABASE_URL="your_database_url" npx tsx scripts/fix-rsvp-works-relation.ts --dry-run'
      );

      process.exit(1);
    } else {
      console.log('   ✅ 没有发现重复的 works_id\n');
      console.log('✅ 可以安全地添加唯一约束！');
    }

    // 方法 2: 使用原始 SQL 查询（作为验证）
    console.log('\n🔍 使用 SQL 查询验证...\n');
    const sqlResult = await prisma.$queryRaw<
      Array<{ works_id: string; count: bigint }>
    >`
      SELECT works_id, COUNT(*) as count
      FROM rsvp_form_config_entity
      WHERE deleted = false
      GROUP BY works_id
      HAVING COUNT(*) > 1
    `;

    if (sqlResult.length > 0) {
      console.log(
        `   ⚠️  SQL 查询也发现 ${sqlResult.length} 个重复的 works_id:`
      );
      sqlResult.forEach(row => {
        console.log(`      - works_id: ${row.works_id}, 数量: ${row.count}`);
      });
      process.exit(1);
    } else {
      console.log('   ✅ SQL 查询确认没有重复的 works_id');
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行检查
checkDuplicateWorksId();
