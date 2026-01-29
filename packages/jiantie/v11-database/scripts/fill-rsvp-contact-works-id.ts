/**
 * 填充 RsvpContactEntity 的 works_id 字段
 *
 * 问题：
 * - RsvpContactEntity 表新增了 works_id 字段，但现有数据（310行）没有该值
 * - 需要通过 contact_form_configs 关系找到对应的 works_id
 *
 * 解决方案：
 * 1. 通过 RsvpContactFormConfigEntity -> RsvpFormConfigEntity -> works_id 找到对应的作品ID
 * 2. 如果一个联系人关联了多个表单，使用第一个找到的 works_id（或最新的）
 * 3. 如果联系人没有关联任何表单，保持 works_id 为 null（后续需要手动处理或删除）
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/fill-rsvp-contact-works-id.ts
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 使用 --dry-run 参数可以只查看需要填充的数据，不实际执行
 */

import { initPrisma } from '../index';

interface FillOptions {
  dryRun?: boolean; // 仅查看，不实际填充
}

async function fillRsvpContactWorksId(options: FillOptions = {}) {
  const { dryRun = false } = options;

  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL! });

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 运行模式: 仅查看（dry-run），不会实际修改数据\n');
  } else {
    console.log('⚠️  运行模式: 实际填充模式，将修改数据库\n');
  }

  try {
    // ============================================
    // 步骤 1: 查找所有需要填充的联系人
    // ============================================
    console.log('🔍 步骤 1: 查找所有需要填充的联系人...\n');

    // 先获取所有未删除的联系人，然后在代码中过滤 works_id 为 null 的
    const allContactsRaw = await prisma.rsvpContactEntity.findMany({
      where: {
        deleted: false,
      },
      include: {
        contact_form_configs: {
          include: {
            form_config: {
              select: {
                id: true,
                works_id: true,
                create_time: true,
              },
            },
          },
          orderBy: {
            create_time: 'desc', // 按创建时间降序，优先使用最新的表单
          },
        },
      },
    });

    // 过滤出 works_id 为 null 的联系人
    const allContacts = allContactsRaw.filter(
      contact => contact.works_id === null || contact.works_id === undefined
    );

    console.log(`   找到 ${allContacts.length} 个需要填充的联系人\n`);

    if (allContacts.length === 0) {
      console.log('   ✅ 所有联系人都已有 works_id，无需填充\n');
      return;
    }

    // ============================================
    // 步骤 2: 分析每个联系人的情况
    // ============================================
    console.log('🔍 步骤 2: 分析每个联系人的情况...\n');

    const contactsWithFormConfigs: Array<{
      contactId: string;
      contactName: string;
      worksId: string;
      formConfigId: string;
    }> = [];

    const contactsWithoutFormConfigs: Array<{
      contactId: string;
      contactName: string;
    }> = [];

    for (const contact of allContacts) {
      if (contact.contact_form_configs.length > 0) {
        // 使用第一个（最新的）表单配置的 works_id
        const firstFormConfig = contact.contact_form_configs[0];
        const worksId = firstFormConfig.form_config.works_id;

        contactsWithFormConfigs.push({
          contactId: contact.id,
          contactName: contact.name,
          worksId,
          formConfigId: firstFormConfig.form_config.id,
        });

        // 如果有多个表单配置，记录一下
        if (contact.contact_form_configs.length > 1) {
          console.log(
            `   ⚠️  联系人 "${contact.name}" (ID: ${contact.id}) 关联了 ${contact.contact_form_configs.length} 个表单，将使用最新的表单的 works_id: ${worksId}`
          );
        }
      } else {
        contactsWithoutFormConfigs.push({
          contactId: contact.id,
          contactName: contact.name,
        });
      }
    }

    console.log(`   统计:`);
    console.log(
      `   - 可以通过表单配置找到 works_id 的联系人: ${contactsWithFormConfigs.length} 个`
    );
    console.log(
      `   - 没有关联任何表单配置的联系人: ${contactsWithoutFormConfigs.length} 个\n`
    );

    // ============================================
    // 步骤 3: 验证找到的 works_id 是否有效
    // ============================================
    if (contactsWithFormConfigs.length > 0) {
      console.log('🔍 步骤 3: 验证找到的 works_id 是否有效...\n');

      // 获取所有有效的 works_id
      const allWorks = await prisma.worksEntity.findMany({
        select: {
          id: true,
        },
      });

      const validWorksIds = new Set(allWorks.map(w => w.id));
      console.log(`   找到 ${validWorksIds.size} 个有效的作品记录\n`);

      // 验证所有找到的 works_id
      const invalidContacts: typeof contactsWithFormConfigs = [];
      const validContacts: typeof contactsWithFormConfigs = [];

      for (const contact of contactsWithFormConfigs) {
        if (validWorksIds.has(contact.worksId)) {
          validContacts.push(contact);
        } else {
          invalidContacts.push(contact);
        }
      }

      if (invalidContacts.length > 0) {
        console.log(
          `   ⚠️  发现 ${invalidContacts.length} 个联系人的 works_id 无效:\n`
        );
        invalidContacts.forEach(contact => {
          console.log(
            `   - 联系人 "${contact.contactName}" (ID: ${contact.contactId}), works_id: ${contact.worksId} (无效)`
          );
        });
        console.log('');
        console.log('   ⚠️  这些联系人将不会被填充，需要手动处理\n');
      }

      if (validContacts.length > 0) {
        console.log(
          `   ✅ ${validContacts.length} 个联系人的 works_id 有效，可以填充\n`
        );
      }
    }

    // ============================================
    // 步骤 4: 填充数据
    // ============================================
    if (contactsWithFormConfigs.length > 0) {
      const validContacts = contactsWithFormConfigs.filter(contact => {
        // 这里需要验证 works_id 是否有效
        // 为了简化，我们在实际更新时再验证
        return true;
      });

      if (validContacts.length > 0) {
        console.log('🔧 步骤 4: 填充 works_id...\n');

        if (!dryRun) {
          // 批量更新
          let updatedCount = 0;
          let errorCount = 0;

          for (const contact of validContacts) {
            try {
              // 再次验证 works_id 是否有效
              const works = await prisma.worksEntity.findUnique({
                where: { id: contact.worksId },
                select: { id: true },
              });

              if (works) {
                await prisma.rsvpContactEntity.update({
                  where: { id: contact.contactId },
                  data: { works_id: contact.worksId },
                });
                updatedCount++;
              } else {
                console.log(
                  `   ⚠️  跳过联系人 "${contact.contactName}" (ID: ${contact.contactId})，works_id ${contact.worksId} 无效`
                );
                errorCount++;
              }
            } catch (error) {
              console.error(
                `   ❌ 更新联系人 "${contact.contactName}" (ID: ${contact.contactId}) 失败:`,
                error
              );
              errorCount++;
            }
          }

          console.log(`   ✅ 成功填充 ${updatedCount} 个联系人`);
          if (errorCount > 0) {
            console.log(`   ⚠️  ${errorCount} 个联系人填充失败`);
          }
          console.log('');
        } else {
          console.log(
            `   [DRY-RUN] 将填充 ${validContacts.length} 个联系人:\n`
          );
          validContacts.slice(0, 10).forEach(contact => {
            console.log(
              `   - "${contact.contactName}" (ID: ${contact.contactId}) -> works_id: ${contact.worksId}`
            );
          });
          if (validContacts.length > 10) {
            console.log(`   ... 还有 ${validContacts.length - 10} 个联系人\n`);
          }
        }
      }
    }

    // ============================================
    // 步骤 5: 处理没有关联表单的联系人
    // ============================================
    if (contactsWithoutFormConfigs.length > 0) {
      console.log('⚠️  步骤 5: 处理没有关联表单配置的联系人...\n');
      console.log(
        `   发现 ${contactsWithoutFormConfigs.length} 个联系人没有关联任何表单配置，这些联系人的 works_id 将保持为 null\n`
      );

      if (contactsWithoutFormConfigs.length <= 20) {
        console.log('   这些联系人列表:');
        contactsWithoutFormConfigs.forEach(contact => {
          console.log(
            `   - "${contact.contactName}" (ID: ${contact.contactId})`
          );
        });
        console.log('');
      } else {
        console.log('   前 20 个联系人:');
        contactsWithoutFormConfigs.slice(0, 20).forEach(contact => {
          console.log(
            `   - "${contact.contactName}" (ID: ${contact.contactId})`
          );
        });
        console.log(
          `   ... 还有 ${contactsWithoutFormConfigs.length - 20} 个联系人\n`
        );
      }

      console.log(
        '   💡 建议: 这些联系人可能需要手动处理，或者根据业务逻辑删除\n'
      );
    }

    // ============================================
    // 步骤 6: 验证填充结果
    // ============================================
    console.log('🔍 步骤 6: 验证填充结果...\n');

    const finalStats = await prisma.rsvpContactEntity.groupBy({
      by: ['works_id'],
      where: {
        deleted: false,
      },
      _count: {
        id: true,
      },
    });

    const withWorksId = finalStats.filter(s => s.works_id !== null);
    const withoutWorksId = finalStats.filter(s => s.works_id === null);

    const totalWithWorksId = withWorksId.reduce(
      (sum, s) => sum + s._count.id,
      0
    );
    const totalWithoutWorksId = withoutWorksId.reduce(
      (sum, s) => sum + s._count.id,
      0
    );

    console.log(`   统计结果:`);
    console.log(`   - 有 works_id 的联系人: ${totalWithWorksId} 个`);
    console.log(`   - 没有 works_id 的联系人: ${totalWithoutWorksId} 个\n`);

    if (totalWithoutWorksId > 0) {
      console.log(
        '   ⚠️  仍有部分联系人没有 works_id，这些联系人没有关联任何表单配置\n'
      );
    } else {
      console.log('   ✅ 所有联系人都已填充 works_id\n');
    }

    console.log('🎉 填充完成！');
    if (!dryRun && totalWithoutWorksId > 0) {
      console.log('\n📝 下一步: 处理没有 works_id 的联系人（手动处理或删除）');
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
const options: FillOptions = {
  dryRun: args.includes('--dry-run'),
};

// 执行填充
fillRsvpContactWorksId(options);
