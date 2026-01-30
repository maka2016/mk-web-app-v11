//template_entity的desiner_uid是错误的，需要从多维表格中重新同步过来，这个是清洗脚本
//第一步读取多维表格的模版生产表的主题包链接（BitTemplateItem）
//主题包链接：https://www.jiantieapp.com/editor-designer?works_id=KZT8RMYY_605318172&designer_tool=2&uid=605318172&appid=jiantie&themePackV3=KZT8RMYY_605318172&form_config_id=undefined&tab=theme3
//uid=xxx为真实的designer_uid
//从主题包链接的URL参数中提取uid，将计算出来的designer_uid同步回template_entity

import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import {
  BitTemplateItem,
  JTBitTables,
} from '../../service/cms/bit_tables/jiantie';
import { getAllRecord } from '../../service/cms/lark';

dotenv.config({ path: '.env.local' });
const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

/**
 * 从主题包链接的URL中提取designer_uid
 * 从URL的查询参数中提取uid参数，例如：https://www.jiantieapp.com/editor-designer?uid=605318172&...
 */
function extractDesignerUidFromUrl(url: string): number | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // 尝试使用 URL 对象解析
    const urlObj = new URL(url);
    const uidStr = urlObj.searchParams.get('uid');
    if (!uidStr) {
      return null;
    }
    const uid = parseInt(uidStr, 10);
    if (isNaN(uid)) {
      return null;
    }
    return uid;
  } catch {
    // 如果URL解析失败，尝试正则匹配
    const match = url.match(/[?&]uid=(\d+)/);
    if (!match) {
      return null;
    }
    const uid = parseInt(match[1], 10);
    if (isNaN(uid)) {
      return null;
    }
    return uid;
  }
}

/**
 * 清洗template_entity的designer_uid
 */
async function washDesignerUid() {
  console.log('开始清洗 template_entity 的 designer_uid...\n');

  try {
    // 第一步：读取多维表格的模版生产表
    console.log('步骤 1: 读取多维表格的模版生产表...');
    const templatesOnBit: BitTemplateItem[] = await getAllRecord(
      JTBitTables['模版生产'],
      {
        noCache: true, // 不使用缓存，确保获取最新数据
        // filter: {
        //   conjunction: 'and',
        //   conditions: [
        //     {
        //       field_name: '任务模板ID',
        //       operator: 'is',
        //       value: ['T_WX7BA1ATRLT5'],
        //     },
        //   ],
        // },
      }
    );

    console.log(`   读取到 ${templatesOnBit.length} 条记录\n`);

    // 第二步：统一聚合处理作者
    console.log('步骤 2: 统一聚合处理作者...');
    const designerMap = new Map<number, string>(); // Map<designerUid, authorName>
    const authorToFirstUid = new Map<string, number>(); // Map<authorName, firstDesignerUid>
    const uidMapping = new Map<number, number>(); // Map<designerUid, firstDesignerUid> 用于合并同一作者的不同uid

    // 收集所有有效的designer信息
    for (const item of templatesOnBit) {
      const templateData = item.fields;
      const authorName = templateData['主题作者']?.value?.[0]?.name || '';
      const themePackUrl = templateData['主题包链接']?.value?.[0]?.text || '';

      if (!themePackUrl) {
        continue;
      }

      const designerUid = extractDesignerUidFromUrl(themePackUrl);
      if (designerUid !== null) {
        // 如果作者名不为空，检查是否需要合并uid
        if (authorName) {
          if (!authorToFirstUid.has(authorName)) {
            // 第一次遇到这个作者，记录为第一个uid
            authorToFirstUid.set(authorName, designerUid);
            uidMapping.set(designerUid, designerUid); // 自己映射到自己
          } else {
            // 同一个作者使用了不同的uid，映射到第一个uid
            const firstUid = authorToFirstUid.get(authorName)!;
            uidMapping.set(designerUid, firstUid);
          }
        } else {
          // 作者名为空，自己映射到自己
          if (!uidMapping.has(designerUid)) {
            uidMapping.set(designerUid, designerUid);
          }
        }

        // 更新designerMap，使用统一后的uid
        const unifiedUid = uidMapping.get(designerUid) || designerUid;
        if (!designerMap.has(unifiedUid) || !designerMap.get(unifiedUid)) {
          designerMap.set(unifiedUid, authorName);
        }
      }
    }

    // 统计合并情况
    const mergedUids = Array.from(uidMapping.entries()).filter(
      ([uid, unifiedUid]) => uid !== unifiedUid
    );
    if (mergedUids.length > 0) {
      console.log(
        `   检测到 ${mergedUids.length} 个uid需要合并（同一作者使用多个uid）:`
      );
      for (const [uid, unifiedUid] of mergedUids) {
        const authorName = designerMap.get(unifiedUid) || '';
        console.log(`     - uid ${uid} -> ${unifiedUid} (作者: ${authorName})`);
      }
    }

    console.log(`   收集到 ${designerMap.size} 个唯一作者\n`);

    // 批量检查并创建designer
    const existingDesigners = await prisma.designerEntity.findMany({
      where: {
        uid: {
          in: Array.from(designerMap.keys()),
        },
      },
      select: { uid: true },
    });

    const existingUids = new Set(existingDesigners.map(d => d.uid));
    const designersToCreate = Array.from(designerMap.entries())
      .filter(([uid]) => !existingUids.has(uid))
      .map(([uid, name]) => ({
        uid,
        name,
      }));

    if (designersToCreate.length > 0) {
      console.log(`   需要创建 ${designersToCreate.length} 个新作者...`);
      // 批量创建designer
      for (const designer of designersToCreate) {
        await prisma.designerEntity.create({
          data: { uid: designer.uid, name: designer.name },
        });
      }
      console.log(`   ✅ 已创建 ${designersToCreate.length} 个新作者\n`);
    } else {
      console.log(`   ✓ 所有作者已存在，无需创建\n`);
    }

    // 第三步：处理每条记录
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    const errors: Array<{ templateId: string; error: string }> = [];

    // 批量处理，每100个一组
    const batchSize = 100;
    for (let i = 0; i < templatesOnBit.length; i += batchSize) {
      const batch = templatesOnBit.slice(i, i + batchSize);
      console.log(
        `处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(templatesOnBit.length / batchSize)} (${batch.length} 条记录)`
      );

      const updatePromises = batch.map(async item => {
        const templateData = item.fields;

        try {
          const templateId = templateData['任务模板ID']?.[0]?.text || '';
          // 主题包链接 是 bitTextRef 类型，需要通过 value[0].text 访问
          const themePackUrl =
            templateData['主题包链接']?.value?.[0]?.text || '';

          // 检查必要字段
          if (!templateId) {
            console.log(
              `   ⚠️  跳过：任务模板ID为空 (record_id: ${item.record_id})`
            );
            skipCount++;
            return;
          }

          if (!themePackUrl) {
            console.log(
              `   ⚠️  跳过：主题包链接为空 (templateId: ${templateId})`
            );
            skipCount++;
            return;
          }

          // 从主题包链接中提取designer_uid
          const designerUid = extractDesignerUidFromUrl(themePackUrl);
          if (designerUid === null) {
            console.log(
              `   ⚠️  跳过：无法从主题包链接中提取designer_uid (templateId: ${templateId}, url: ${themePackUrl})`
            );
            skipCount++;
            return;
          }

          // 使用统一后的uid（如果同一作者使用了多个uid，使用第一个uid）
          const unifiedDesignerUid = uidMapping.get(designerUid) || designerUid;

          // 检查模板是否存在
          const template = await prisma.templateEntity.findUnique({
            where: { id: templateId },
            select: { id: true, designer_uid: true },
          });

          if (!template) {
            console.log(`   ⚠️  跳过：模板不存在 (templateId: ${templateId})`);
            skipCount++;
            return;
          }

          // 如果designer_uid已经正确，跳过
          if (template.designer_uid === unifiedDesignerUid) {
            console.log(
              `   ✓ 跳过：designer_uid已正确 (templateId: ${templateId}, designer_uid: ${unifiedDesignerUid})`
            );
            skipCount++;
            return;
          }

          // 更新designer_uid（使用统一后的uid）
          await prisma.templateEntity.update({
            where: { id: templateId },
            data: { designer_uid: unifiedDesignerUid },
          });

          const logMessage =
            designerUid !== unifiedDesignerUid
              ? `   ✅ 更新成功 (templateId: ${templateId}, 旧值: ${template.designer_uid || 'null'}, 原始uid: ${designerUid}, 统一后uid: ${unifiedDesignerUid})`
              : `   ✅ 更新成功 (templateId: ${templateId}, 旧值: ${template.designer_uid || 'null'}, 新值: ${unifiedDesignerUid})`;
          console.log(logMessage);
          successCount++;
        } catch (error: any) {
          const themePackUrl =
            templateData['主题包链接']?.value?.[0]?.text || '';

          const templateId =
            item.fields['任务模板ID']?.[0]?.text || item.record_id;
          const designerUid = extractDesignerUidFromUrl(themePackUrl);
          const unifiedDesignerUid =
            designerUid !== null
              ? uidMapping.get(designerUid) || designerUid
              : null;
          const errorMsg = error?.message || String(error);
          console.error(
            `   ❌ 更新失败 (templateId: ${templateId}，designerUid: ${unifiedDesignerUid || designerUid}):`,
            errorMsg
          );
          errors.push({ templateId, error: errorMsg });
          errorCount++;
        }
      });

      // 等待当前批次完成
      await Promise.all(updatePromises);
    }

    // 第四步：输出统计信息
    console.log('\n' + '='.repeat(60));
    console.log('清洗完成统计:');
    console.log(`- 总记录数: ${templatesOnBit.length}`);
    console.log(`- 成功更新: ${successCount}`);
    console.log(`- 跳过: ${skipCount}`);
    console.log(`- 失败: ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n失败记录详情:');
      errors.forEach(({ templateId, error }) => {
        console.log(`  - templateId: ${templateId}, 错误: ${error}`);
      });
    }
  } catch (error) {
    console.error('清洗过程发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 主函数
async function main() {
  try {
    await washDesignerUid();
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { washDesignerUid };
