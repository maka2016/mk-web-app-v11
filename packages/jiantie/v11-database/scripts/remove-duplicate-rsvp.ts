/**
 * 删除重复的 RSVP 配置，保留最新的一个
 *
 * 功能：
 * - 对于每个 works_id，如果有多个 RSVP 配置，保留最新的（create_time 最大的）
 * - 将删除的配置的关联数据（提交记录、操作日志、嘉宾关联）迁移到保留的配置
 * - 删除其他重复的配置
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/remove-duplicate-rsvp.ts
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 使用 --dry-run 参数可以只查看需要删除的数据，不实际删除
 * - 如果保留的配置和删除的配置有相同的嘉宾关联，会删除重复的关联
 */

import { initPrisma } from '../index';

interface RemoveOptions {
  dryRun?: boolean; // 仅查看，不实际删除
}

async function removeDuplicateRsvp(options: RemoveOptions = {}) {
  const { dryRun = false } = options;

  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL! });

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 运行模式: 仅查看（dry-run），不会实际删除数据\n');
  } else {
    console.log('⚠️  运行模式: 实际删除模式，将删除重复的 RSVP 配置\n');
  }

  try {
    console.log('🔍 步骤 1: 查找重复的 works_id...\n');

    // 获取所有未删除的配置
    const allConfigs = await prisma.rsvpFormConfigEntity.findMany({
      where: {
        deleted: false,
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

    if (duplicateWorksIds.length === 0) {
      console.log('   ✅ 没有发现重复的 works_id，无需删除\n');
      return;
    }

    console.log(
      `   ⚠️  发现 ${duplicateWorksIds.length} 个作品有多个 RSVP 配置:\n`
    );

    // 收集需要删除的配置 ID 和迁移映射
    const configsToDelete: string[] = [];
    const migrationMap = new Map<string, string>(); // 删除的配置 ID -> 保留的配置 ID
    let totalToDelete = 0;

    for (const worksId of duplicateWorksIds) {
      const configs = configsByWorksId.get(worksId)!;
      console.log(`   📋 works_id: ${worksId} (${configs.length} 个配置)`);

      // 配置已经按 create_time 降序排列，第一个就是最新的
      const keepConfig = configs[0];
      const deleteConfigs = configs.slice(1);

      console.log(
        `      保留: ID ${keepConfig.id} (title: ${keepConfig.title || 'N/A'}, enabled: ${keepConfig.enabled}, create_time: ${keepConfig.create_time.toISOString()})`
      );

      deleteConfigs.forEach(config => {
        console.log(
          `      删除: ID ${config.id} (title: ${config.title || 'N/A'}, enabled: ${config.enabled}, create_time: ${config.create_time.toISOString()})`
        );
        configsToDelete.push(config.id);
        migrationMap.set(config.id, keepConfig.id); // 记录迁移映射
        totalToDelete++;
      });
      console.log('');
    }

    console.log(
      `\n📊 统计: 将删除 ${totalToDelete} 个重复的 RSVP 配置，保留 ${duplicateWorksIds.length} 个最新的配置\n`
    );

    if (configsToDelete.length === 0) {
      console.log('✅ 没有需要删除的配置\n');
      return;
    }

    if (dryRun) {
      console.log(
        `   [DRY-RUN] 将删除 ${configsToDelete.length} 个重复的 RSVP 配置\n`
      );

      // 检查关联数据
      console.log('🔍 检查关联数据...\n');
      for (const [deleteConfigId, keepConfigId] of migrationMap.entries()) {
        const submissionCount = await prisma.rsvpSubmissionEntity.count({
          where: { form_config_id: deleteConfigId },
        });
        const viewLogCount = await prisma.rsvpViewLogEntity.count({
          where: { form_config_id: deleteConfigId },
        });
        const contactConfigCount =
          await prisma.rsvpContactFormConfigEntity.count({
            where: { form_config_id: deleteConfigId },
          });

        if (submissionCount > 0 || viewLogCount > 0 || contactConfigCount > 0) {
          console.log(`   配置 ${deleteConfigId} 的关联数据:`);
          console.log(`     - 提交记录: ${submissionCount} 条`);
          console.log(`     - 操作日志: ${viewLogCount} 条`);
          console.log(`     - 嘉宾关联: ${contactConfigCount} 条`);
          console.log(`     - 将迁移到配置 ${keepConfigId}\n`);
        }
      }

      console.log('💡 要实际执行删除，请运行:');
      console.log(
        '   DATABASE_URL="your_database_url" npx tsx scripts/remove-duplicate-rsvp.ts\n'
      );
      return;
    }

    // ============================================
    // 步骤 2: 迁移关联数据
    // ============================================
    console.log('🔄 步骤 2: 迁移关联数据到保留的配置...\n');

    let totalMigrations = 0;

    for (const [deleteConfigId, keepConfigId] of migrationMap.entries()) {
      // 迁移提交记录
      const submissionResult = await prisma.rsvpSubmissionEntity.updateMany({
        where: {
          form_config_id: deleteConfigId,
        },
        data: {
          form_config_id: keepConfigId,
        },
      });

      // 迁移操作日志
      const viewLogResult = await prisma.rsvpViewLogEntity.updateMany({
        where: {
          form_config_id: deleteConfigId,
        },
        data: {
          form_config_id: keepConfigId,
        },
      });

      // 迁移嘉宾关联（注意：如果保留的配置已经有相同的 contact_id，可能会违反唯一约束）
      // 先检查是否有冲突
      const existingContacts =
        await prisma.rsvpContactFormConfigEntity.findMany({
          where: {
            form_config_id: keepConfigId,
          },
          select: {
            contact_id: true,
          },
        });
      const existingContactIds = new Set(
        existingContacts.map(c => c.contact_id)
      );

      const contactsToMigrate =
        await prisma.rsvpContactFormConfigEntity.findMany({
          where: {
            form_config_id: deleteConfigId,
          },
        });

      let migratedContacts = 0;
      let skippedContacts = 0;

      for (const contact of contactsToMigrate) {
        if (existingContactIds.has(contact.contact_id)) {
          // 如果保留的配置已经有这个 contact，删除重复的
          await prisma.rsvpContactFormConfigEntity.delete({
            where: { id: contact.id },
          });
          skippedContacts++;
        } else {
          // 迁移到保留的配置
          await prisma.rsvpContactFormConfigEntity.update({
            where: { id: contact.id },
            data: { form_config_id: keepConfigId },
          });
          migratedContacts++;
          existingContactIds.add(contact.contact_id);
        }
      }

      const totalAffected =
        submissionResult.count + viewLogResult.count + migratedContacts;

      if (totalAffected > 0 || skippedContacts > 0) {
        console.log(`   配置 ${deleteConfigId} -> ${keepConfigId}:`);
        console.log(`     - 迁移提交记录: ${submissionResult.count} 条`);
        console.log(`     - 迁移操作日志: ${viewLogResult.count} 条`);
        console.log(`     - 迁移嘉宾关联: ${migratedContacts} 条`);
        if (skippedContacts > 0) {
          console.log(`     - 跳过重复嘉宾关联: ${skippedContacts} 条`);
        }
        totalMigrations += totalAffected;
      }
    }

    console.log(`\n   ✅ 共迁移 ${totalMigrations} 条关联数据\n`);

    // ============================================
    // 步骤 3: 删除重复的配置
    // ============================================
    console.log('🗑️  步骤 3: 删除重复的 RSVP 配置...\n');

    // 批量删除
    const deleteResult = await prisma.rsvpFormConfigEntity.deleteMany({
      where: {
        id: {
          in: configsToDelete,
        },
      },
    });

    console.log(`   ✅ 已删除 ${deleteResult.count} 个重复的 RSVP 配置\n`);

    // ============================================
    // 步骤 4: 验证删除结果
    // ============================================
    console.log('🔍 步骤 4: 验证删除结果...\n');

    // 再次检查是否还有重复
    const remainingConfigs = await prisma.rsvpFormConfigEntity.findMany({
      where: {
        deleted: false,
      },
      select: {
        id: true,
        works_id: true,
      },
    });

    // 按 works_id 分组检查
    const remainingConfigsByWorksId = new Map<string, string[]>();
    remainingConfigs.forEach(config => {
      if (!remainingConfigsByWorksId.has(config.works_id)) {
        remainingConfigsByWorksId.set(config.works_id, []);
      }
      remainingConfigsByWorksId.get(config.works_id)!.push(config.id);
    });

    // 查找是否还有重复
    const remainingDuplicates: string[] = [];
    remainingConfigsByWorksId.forEach((ids, worksId) => {
      if (ids.length > 1) {
        remainingDuplicates.push(worksId);
      }
    });

    if (remainingDuplicates.length > 0) {
      console.error(
        `   ❌ 验证失败！仍有 ${remainingDuplicates.length} 个重复的 works_id:`
      );
      remainingDuplicates.forEach(worksId => {
        const ids = remainingConfigsByWorksId.get(worksId)!;
        console.error(`      - works_id: ${worksId} (${ids.length} 个配置)`);
      });
      process.exit(1);
    } else {
      console.log('   ✅ 验证通过！没有重复的 works_id 了\n');
    }

    // 使用 SQL 查询再次验证
    console.log('🔍 使用 SQL 查询验证...\n');
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
      console.error(
        `   ❌ SQL 验证失败！仍有 ${sqlResult.length} 个重复的 works_id:`
      );
      sqlResult.forEach(row => {
        console.error(`      - works_id: ${row.works_id}, 数量: ${row.count}`);
      });
      process.exit(1);
    } else {
      console.log('   ✅ SQL 查询确认没有重复的 works_id\n');
    }

    console.log('🎉 删除完成！现在可以安全地添加唯一约束了');
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
const options: RemoveOptions = {
  dryRun: args.includes('--dry-run'),
};

// 执行删除
removeDuplicateRsvp(options);
