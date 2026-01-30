/**
 * RSVP 数据迁移脚本
 *
 * 问题：
 * 1. rsvp_form_config_entity 表中可能存在 works_id 值，但这些值在 works_entity 表中不存在
 * 2. 这些无效的 works_id 可能是 template_id（模板ID），需要识别并删除对应的 RSVP 配置
 * 3. 可能存在一个作品有多个 RSVP 配置的情况（违反唯一约束）
 *
 * 解决方案：
 * 1. 删除所有无效的 works_id 记录（关联的作品不存在）
 *    - 包括那些 works_id 实际上是 template_id 的记录
 *    - 只删除 RSVP 配置记录，不会删除作品或模板实体
 * 2. 对于重复的 works_id，保留最新的（create_time 最大的）或 enabled = true 的，删除其他的
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/fix-rsvp-works-relation.ts
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 使用 --dry-run 参数可以只查看需要修复的数据，不实际执行修复
 * - 脚本只会删除 RSVP 配置记录，不会删除作品或模板实体
 */

import { initPrisma } from '../index';

interface FixOptions {
  dryRun?: boolean; // 仅查看，不实际修复
  deleteInvalid?: boolean; // 是否删除无效的 works_id 记录
  fixDuplicates?: boolean; // 是否修复重复的 works_id
}

/**
 * 删除 RSVP 配置及其所有相关数据
 * 删除顺序：view_logs -> submissions -> contact_form_configs -> form_config
 */
async function deleteRsvpConfigsWithRelatedData(
  prisma: ReturnType<typeof initPrisma>,
  configIds: string[],
  dryRun: boolean = false
): Promise<{
  viewLogsDeleted: number;
  submissionsDeleted: number;
  contactFormConfigsDeleted: number;
  configsDeleted: number;
}> {
  if (configIds.length === 0) {
    return {
      viewLogsDeleted: 0,
      submissionsDeleted: 0,
      contactFormConfigsDeleted: 0,
      configsDeleted: 0,
    };
  }

  if (dryRun) {
    // 在 dry-run 模式下，只统计数量
    const relatedSubmissions = await prisma.rsvpSubmissionEntity.findMany({
      where: {
        form_config_id: {
          in: configIds,
        },
      },
      select: {
        id: true,
      },
    });
    const relatedSubmissionIds = relatedSubmissions.map(s => s.id);

    const viewLogsByFormConfig = await prisma.rsvpViewLogEntity.count({
      where: {
        form_config_id: {
          in: configIds,
        },
      },
    });

    const viewLogsBySubmission =
      relatedSubmissionIds.length > 0
        ? await prisma.rsvpViewLogEntity.count({
            where: {
              submission_id: {
                in: relatedSubmissionIds,
              },
            },
          })
        : 0;

    const submissionsCount = relatedSubmissions.length;
    const contactFormConfigsCount =
      await prisma.rsvpContactFormConfigEntity.count({
        where: {
          form_config_id: {
            in: configIds,
          },
        },
      });

    return {
      viewLogsDeleted: viewLogsByFormConfig + viewLogsBySubmission,
      submissionsDeleted: submissionsCount,
      contactFormConfigsDeleted: contactFormConfigsCount,
      configsDeleted: configIds.length,
    };
  }

  // 实际删除模式
  // 步骤 1: 删除相关的操作日志（view_logs）
  // 先获取所有相关的 submission_id
  const relatedSubmissions = await prisma.rsvpSubmissionEntity.findMany({
    where: {
      form_config_id: {
        in: configIds,
      },
    },
    select: {
      id: true,
    },
  });
  const relatedSubmissionIds = relatedSubmissions.map(s => s.id);

  // 删除通过 form_config_id 关联的 view_logs
  const viewLogsByFormConfig = await prisma.rsvpViewLogEntity.deleteMany({
    where: {
      form_config_id: {
        in: configIds,
      },
    },
  });

  // 删除通过 submission_id 关联的 view_logs
  let viewLogsBySubmission = { count: 0 };
  if (relatedSubmissionIds.length > 0) {
    viewLogsBySubmission = await prisma.rsvpViewLogEntity.deleteMany({
      where: {
        submission_id: {
          in: relatedSubmissionIds,
        },
      },
    });
  }

  // 步骤 2: 删除相关的提交记录（submissions）
  const submissionsResult = await prisma.rsvpSubmissionEntity.deleteMany({
    where: {
      form_config_id: {
        in: configIds,
      },
    },
  });

  // 步骤 3: 删除相关的嘉宾与表单关联（contact_form_configs）
  const contactFormConfigsResult =
    await prisma.rsvpContactFormConfigEntity.deleteMany({
      where: {
        form_config_id: {
          in: configIds,
        },
      },
    });

  // 步骤 4: 最后删除 RSVP 配置记录
  const deleteResult = await prisma.rsvpFormConfigEntity.deleteMany({
    where: {
      id: {
        in: configIds,
      },
    },
  });

  return {
    viewLogsDeleted: viewLogsByFormConfig.count + viewLogsBySubmission.count,
    submissionsDeleted: submissionsResult.count,
    contactFormConfigsDeleted: contactFormConfigsResult.count,
    configsDeleted: deleteResult.count,
  };
}

async function fixRsvpWorksRelation(options: FixOptions = {}) {
  const {
    dryRun = false,
    deleteInvalid = true,
    fixDuplicates = true,
  } = options;

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
    // 步骤 1: 检查无效的 works_id
    // ============================================
    console.log('🔍 步骤 1: 检查无效的 works_id...\n');

    const allConfigs = await prisma.rsvpFormConfigEntity.findMany({
      select: {
        id: true,
        works_id: true,
        title: true,
        deleted: true,
        create_time: true,
      },
    });

    console.log(`   找到 ${allConfigs.length} 个 RSVP 配置记录`);

    // 获取所有有效的 works_id
    const allWorks = await prisma.worksEntity.findMany({
      select: {
        id: true,
      },
    });

    const validWorksIds = new Set(allWorks.map(w => w.id));
    console.log(`   找到 ${validWorksIds.size} 个有效的作品记录`);

    // 获取所有有效的 template_id（用于识别那些 works_id 实际上是 template_id 的情况）
    const allTemplates = await prisma.templateEntity.findMany({
      select: {
        id: true,
      },
    });

    const validTemplateIds = new Set(allTemplates.map(t => t.id));
    console.log(`   找到 ${validTemplateIds.size} 个有效的模板记录\n`);

    // 查找无效的 works_id
    const invalidConfigs = allConfigs.filter(
      config => !validWorksIds.has(config.works_id)
    );

    if (invalidConfigs.length > 0) {
      console.log(
        `   ⚠️  发现 ${invalidConfigs.length} 个无效的 works_id 记录:\n`
      );

      // 分类：哪些是 template_id，哪些是完全无效的
      const templateIdConfigs: typeof invalidConfigs = [];
      const completelyInvalidConfigs: typeof invalidConfigs = [];

      invalidConfigs.forEach(config => {
        if (validTemplateIds.has(config.works_id)) {
          templateIdConfigs.push(config);
          console.log(
            `   - ID: ${config.id}, works_id: ${config.works_id} (⚠️  这是模板ID，不是作品ID), title: ${config.title || 'N/A'}`
          );
        } else {
          completelyInvalidConfigs.push(config);
          console.log(
            `   - ID: ${config.id}, works_id: ${config.works_id} (❌ 完全无效，既不是作品ID也不是模板ID), title: ${config.title || 'N/A'}`
          );
        }
      });

      console.log('');
      console.log(`   统计:`);
      console.log(
        `   - works_id 是模板ID的记录: ${templateIdConfigs.length} 个`
      );
      console.log(
        `   - works_id 完全无效的记录: ${completelyInvalidConfigs.length} 个`
      );
      console.log('');

      if (deleteInvalid) {
        const invalidConfigIds = invalidConfigs.map(c => c.id);

        if (!dryRun) {
          console.log(
            '🗑️  删除无效的 RSVP 配置记录及其相关数据（不会删除作品或模板实体）...\n'
          );
          console.log('   1️⃣  删除相关的操作日志...');
          console.log('   2️⃣  删除相关的提交记录...');
          console.log('   3️⃣  删除相关的嘉宾与表单关联...');
          console.log('   4️⃣  删除 RSVP 配置记录...\n');

          const result = await deleteRsvpConfigsWithRelatedData(
            prisma,
            invalidConfigIds,
            false
          );

          console.log(`   ✅ 清理完成！`);
          console.log(`   - 已删除 ${result.viewLogsDeleted} 个操作日志`);
          console.log(`   - 已删除 ${result.submissionsDeleted} 个提交记录`);
          console.log(
            `   - 已删除 ${result.contactFormConfigsDeleted} 个嘉宾与表单关联记录`
          );
          console.log(
            `   - 已删除 ${result.configsDeleted} 个无效的 RSVP 配置记录\n`
          );
          console.log(
            '   ⚠️  注意: 只删除了 RSVP 相关记录，作品和模板实体未被删除\n'
          );
        } else {
          const result = await deleteRsvpConfigsWithRelatedData(
            prisma,
            invalidConfigIds,
            true
          );

          console.log('   [DRY-RUN] 将删除以下数据:');
          console.log(`   - ${result.viewLogsDeleted} 个操作日志`);
          console.log(`   - ${result.submissionsDeleted} 个提交记录`);
          console.log(
            `   - ${result.contactFormConfigsDeleted} 个嘉宾与表单关联记录`
          );
          console.log(`   - ${result.configsDeleted} 个 RSVP 配置记录`);
          console.log(
            '   ⚠️  注意: 只会删除 RSVP 相关记录，不会删除作品或模板实体\n'
          );
        }
      }
    } else {
      console.log('   ✅ 所有 works_id 都是有效的\n');
    }

    // ============================================
    // 步骤 2: 检查重复的 works_id
    // ============================================
    console.log('🔍 步骤 2: 检查重复的 works_id...\n');

    // 只检查未删除的配置
    const activeConfigs = allConfigs.filter(c => !c.deleted);

    // 按 works_id 分组
    const configsByWorksId = new Map<string, typeof allConfigs>();
    activeConfigs.forEach(config => {
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

      const configsToDelete: string[] = [];

      for (const worksId of duplicateWorksIds) {
        const configs = configsByWorksId.get(worksId)!;
        console.log(`   📋 works_id: ${worksId} (${configs.length} 个配置)`);

        // 重新获取完整配置信息，用于排序和决定保留哪个
        const fullConfigs = await prisma.rsvpFormConfigEntity.findMany({
          where: {
            id: {
              in: configs.map(c => c.id),
            },
          },
        });

        // 排序：优先保留 enabled = true 的，然后按 create_time 降序
        fullConfigs.sort((a, b) => {
          // enabled = true 优先
          if (a.enabled !== b.enabled) {
            return a.enabled ? -1 : 1;
          }
          // 然后按 create_time 降序（最新的优先）
          return b.create_time.getTime() - a.create_time.getTime();
        });

        // 保留第一个（优先级最高的），删除其他的
        const keepConfig = fullConfigs[0];
        const deleteConfigs = fullConfigs.slice(1);

        console.log(
          `      保留: ID ${keepConfig.id} (enabled: ${keepConfig.enabled}, create_time: ${keepConfig.create_time})`
        );
        deleteConfigs.forEach(config => {
          console.log(
            `      删除: ID ${config.id} (enabled: ${config.enabled}, create_time: ${config.create_time})`
          );
          configsToDelete.push(config.id);
        });
        console.log('');
      }

      if (fixDuplicates && configsToDelete.length > 0) {
        if (!dryRun) {
          console.log('🗑️  删除重复的 RSVP 配置记录及其相关数据...\n');
          console.log('   1️⃣  删除相关的操作日志...');
          console.log('   2️⃣  删除相关的提交记录...');
          console.log('   3️⃣  删除相关的嘉宾与表单关联...');
          console.log('   4️⃣  删除 RSVP 配置记录...\n');

          const result = await deleteRsvpConfigsWithRelatedData(
            prisma,
            configsToDelete,
            false
          );

          console.log(`   ✅ 清理完成！`);
          console.log(`   - 已删除 ${result.viewLogsDeleted} 个操作日志`);
          console.log(`   - 已删除 ${result.submissionsDeleted} 个提交记录`);
          console.log(
            `   - 已删除 ${result.contactFormConfigsDeleted} 个嘉宾与表单关联记录`
          );
          console.log(
            `   - 已删除 ${result.configsDeleted} 个重复的 RSVP 配置记录\n`
          );
        } else {
          const result = await deleteRsvpConfigsWithRelatedData(
            prisma,
            configsToDelete,
            true
          );

          console.log('   [DRY-RUN] 将删除以下数据:');
          console.log(`   - ${result.viewLogsDeleted} 个操作日志`);
          console.log(`   - ${result.submissionsDeleted} 个提交记录`);
          console.log(
            `   - ${result.contactFormConfigsDeleted} 个嘉宾与表单关联记录`
          );
          console.log(`   - ${result.configsDeleted} 个重复的 RSVP 配置记录\n`);
        }
      }
    } else {
      console.log('   ✅ 没有发现重复的 works_id\n');
    }

    // ============================================
    // 步骤 3: 验证修复结果
    // ============================================
    console.log('🔍 步骤 3: 验证修复结果...\n');

    const finalConfigs = await prisma.rsvpFormConfigEntity.findMany({
      where: {
        deleted: false,
      },
      select: {
        id: true,
        works_id: true,
      },
    });

    // 验证所有 works_id 都有效
    const finalInvalidConfigs = finalConfigs.filter(
      config => !validWorksIds.has(config.works_id)
    );

    if (finalInvalidConfigs.length > 0) {
      console.error(
        `   ❌ 验证失败！仍有 ${finalInvalidConfigs.length} 个无效的 works_id:`
      );
      finalInvalidConfigs.forEach(config => {
        console.error(`      - ID: ${config.id}, works_id: ${config.works_id}`);
      });
      process.exit(1);
    } else {
      console.log('   ✅ 所有 works_id 都是有效的');
    }

    // 验证没有重复的 works_id
    const finalConfigsByWorksId = new Map<string, number>();
    finalConfigs.forEach(config => {
      const count = finalConfigsByWorksId.get(config.works_id) || 0;
      finalConfigsByWorksId.set(config.works_id, count + 1);
    });

    const finalDuplicates = Array.from(finalConfigsByWorksId.entries()).filter(
      ([, count]) => count > 1
    );

    if (finalDuplicates.length > 0) {
      console.error(
        `   ❌ 验证失败！仍有 ${finalDuplicates.length} 个重复的 works_id:`
      );
      finalDuplicates.forEach(([worksId, count]) => {
        console.error(`      - works_id: ${worksId} (${count} 个配置)`);
      });
      process.exit(1);
    } else {
      console.log('   ✅ 没有重复的 works_id');
    }

    console.log('\n🎉 验证通过！数据已准备好进行迁移');
    console.log('\n📝 下一步: 执行 Prisma 迁移');
    console.log('   cd packages/jiantie/v11-database');
    console.log('   npx prisma migrate dev --name add_rsvp_works_foreign_key');
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
  deleteInvalid: !args.includes('--no-delete-invalid'),
  fixDuplicates: !args.includes('--no-fix-duplicates'),
};

// 执行修复
fixRsvpWorksRelation(options);
