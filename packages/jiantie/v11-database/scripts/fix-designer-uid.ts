/**
 * 修复 designer_uid 外键约束问题
 *
 * 问题：template_entity 表中存在 designer_uid 值，但这些值在 designer_entity 表中不存在对应的 uid 记录
 * 解决方案：为所有孤立的 designer_uid 值在 designer_entity 表中创建对应的记录
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   npx tsx scripts/fix-designer-uid.ts
 */

import { initPrisma } from '../index';

async function fixDesignerUid() {
  const prisma = initPrisma({ connectionString: process.env.DATABASE_URL! });

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 请设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  try {
    console.log('🔍 步骤 1: 检查孤立数据...\n');

    // 1. 查找所有在 template_entity 中存在但在 designer_entity 中不存在的 designer_uid
    const templates = await prisma.templateEntity.findMany({
      where: {
        designer_uid: {
          not: {
            equals: undefined,
          },
        },
      },
      select: {
        designer_uid: true,
      },
      distinct: ['designer_uid'],
    });

    const designerUids = templates
      .map(t => t.designer_uid)
      .filter((uid): uid is number => uid !== null);

    console.log(`   找到 ${designerUids.length} 个唯一的 designer_uid 值`);

    // 2. 检查哪些 designer_uid 在 designer_entity 中不存在
    const existingDesigners = await prisma.designerEntity.findMany({
      where: {
        uid: {
          in: designerUids,
        },
      },
      select: {
        uid: true,
      },
    });

    const existingUids = new Set(existingDesigners.map(d => d.uid));
    const missingUids = designerUids.filter(uid => !existingUids.has(uid));

    console.log(`   已存在的 designer_uid: ${existingUids.size} 个`);
    console.log(`   缺失的 designer_uid: ${missingUids.length} 个\n`);

    if (missingUids.length === 0) {
      console.log('✅ 所有 designer_uid 都有对应的设计师记录，无需修复！');
      return;
    }

    console.log('📋 缺失的 designer_uid 列表:');
    missingUids.forEach(uid => console.log(`   - ${uid}`));
    console.log('');

    // 3. 统计每个缺失的 designer_uid 关联了多少个模板
    const templateCounts = await prisma.templateEntity.groupBy({
      by: ['designer_uid'],
      where: {
        designer_uid: {
          in: missingUids,
        },
      },
      _count: {
        id: true,
      },
    });

    console.log('📊 每个缺失的 designer_uid 关联的模板数量:');
    templateCounts.forEach(item => {
      console.log(
        `   - designer_uid ${item.designer_uid}: ${item._count.id} 个模板`
      );
    });
    console.log('');

    console.log('🔧 步骤 2: 为缺失的 designer_uid 创建设计师记录...\n');

    // 4. 为每个缺失的 designer_uid 创建设计师记录
    let createdCount = 0;
    for (const uid of missingUids) {
      try {
        await prisma.designerEntity.create({
          data: {
            name: `设计师_${uid}`, // 临时名称，后续可手动更新
            uid: uid,
            deleted: false,
          },
        });
        createdCount++;
        console.log(`   ✅ 已创建 designer_uid ${uid} 的设计师记录`);
      } catch (error: any) {
        // 如果是因为唯一约束冲突（可能并发创建），则忽略
        if (error.code === 'P2002') {
          console.log(
            `   ⚠️  designer_uid ${uid} 的设计师记录已存在（可能由并发创建）`
          );
        } else {
          console.error(
            `   ❌ 创建 designer_uid ${uid} 的设计师记录失败:`,
            error.message
          );
        }
      }
    }

    console.log(`\n✅ 成功创建 ${createdCount} 个设计师记录\n`);

    console.log('🔍 步骤 3: 验证修复结果...\n');

    // 5. 再次检查是否还有孤立的 designer_uid
    const remainingTemplates = await prisma.templateEntity.findMany({
      where: {
        designer_uid: {
          not: {
            equals: undefined,
          },
        },
      },
      select: {
        designer_uid: true,
      },
      distinct: ['designer_uid'],
    });

    const remainingUids = remainingTemplates
      .map(t => t.designer_uid)
      .filter((uid): uid is number => uid !== null);

    const finalExistingDesigners = await prisma.designerEntity.findMany({
      where: {
        uid: {
          in: remainingUids,
        },
      },
      select: {
        uid: true,
      },
    });

    const finalExistingUids = new Set(finalExistingDesigners.map(d => d.uid));
    const finalMissingUids = remainingUids.filter(
      uid => !finalExistingUids.has(uid)
    );

    if (finalMissingUids.length === 0) {
      console.log('✅ 验证通过！所有 designer_uid 都有对应的设计师记录');
      console.log('\n🎉 修复完成！现在可以执行 `npx prisma db push` 了');
    } else {
      console.error(
        `❌ 验证失败！仍有 ${finalMissingUids.length} 个 designer_uid 缺少对应的设计师记录:`
      );
      finalMissingUids.forEach(uid => console.error(`   - ${uid}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行修复
fixDesignerUid();
