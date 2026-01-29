//一次性脚本用于构建四级标签楼层的多维表格数据

//映射关系：
// 旧数据为三级热词绑定一个模板筛选器，每个模版筛选器绑定了若干模板和模板标签V3选项
// 新数据为四级标签楼层本身就需要绑定模板，显示名为模板标签V3选项，包含的模板为模版筛选器绑定的若干模板中含有该标签的模板，四级标签楼层的父级为三级热词

import dotenv from 'dotenv';
import {
  BitChannelItem,
  BitTempalteFilterItem,
  JTBitTables,
  TagItem,
  TemplateChannelItem,
} from '../service/cms/bit_tables/jiantie';
import { batchCreateAndUpdate, getAllRecord } from '../service/cms/lark';

dotenv.config({ path: '.env.local' });

const main = async () => {
  // 1. 读取三级热词数据，筛选有模板筛选器的
  const ch3Data: BitChannelItem[] = await getAllRecord(
    JTBitTables['三级-热词'],
    {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '模板筛选器',
            operator: 'isNotEmpty',
            value: [],
          },
        ],
      },
    }
  );

  // 2. 读取模板筛选器数据
  const filterData: BitTempalteFilterItem[] = await getAllRecord(
    JTBitTables['模板筛选器']
  );
  const filterDataMap = new Map(filterData.map(item => [item.record_id, item]));

  // 3. 读取模版生产数据
  const templateData: TemplateChannelItem[] = await getAllRecord(
    JTBitTables['模版生产']
  );
  const templateDataMap = new Map(
    templateData.map(item => [item.record_id, item])
  );

  // 4. 读取模板标签数据
  const tagData: TagItem[] = await getAllRecord(JTBitTables['模板标签']);
  const tagDataMap = new Map(tagData.map(item => [item.record_id, item]));

  // 5. 准备要创建的四级标签记录
  // 注意：创建新记录时不需要 record_id，但为了符合 FeishuRecord 类型，我们使用类型断言
  const insertRecords: Array<{
    fields: Record<string, any>;
  }> = [];

  // 6. 遍历每个三级热词
  for (const ch3Item of ch3Data) {
    const filterIds = ch3Item.fields?.['模板筛选器']?.link_record_ids || [];
    if (filterIds.length === 0) {
      console.log(
        `三级热词 ${ch3Item.fields?.['显示名']?.[0]?.text} 没有绑定模板筛选器，跳过`
      );
      continue;
    }

    // 对于每个三级热词，可能有多个模板筛选器，但通常只有一个
    for (const filterId of filterIds) {
      const filterItem = filterDataMap.get(filterId);
      if (!filterItem) {
        console.log(`模板筛选器 ${filterId} 不存在，跳过`);
        continue;
      }

      // 获取模板筛选器绑定的模板
      const templateIds =
        filterItem.fields?.['包含模版']?.link_record_ids || [];
      if (templateIds.length === 0) {
        console.log(
          `模板筛选器 ${filterItem.fields?.['内部名称']?.[0]?.text} 没有绑定模板，跳过`
        );
        continue;
      }

      // 获取模板筛选器绑定的模板标签V3选项
      const tagIds =
        filterItem.fields?.['模板标签V3选项']?.link_record_ids || [];

      if (tagIds.length === 0) {
        // 如果筛选器没有绑定模板标签V3选项，则统一归为"全部"
        console.log(
          `模板筛选器 ${filterItem.fields?.['内部名称']?.[0]?.text} 没有绑定模板标签V3选项，创建"全部"标签`
        );

        insertRecords.push({
          fields: {
            显示名: '全部',
            内部名称: `${ch3Item.fields?.['显示名']?.[0]?.text}-全部`,
            父级: [ch3Item.record_id],
            包含模版: templateIds,
          },
        });
        continue;
      }

      // 对于每个模板标签V3选项，创建一个四级标签记录
      for (const tagId of tagIds) {
        const tagItem = tagDataMap.get(tagId);
        if (!tagItem) {
          console.log(`模板标签 ${tagId} 不存在，跳过`);
          continue;
        }

        // 找到模版筛选器绑定的模板中，包含该标签的模板
        const matchedTemplateIds = templateIds.filter(templateId => {
          const templateItem = templateDataMap.get(templateId);
          if (!templateItem) return false;
          const templateTagIds =
            templateItem.fields?.['模板标签V3']?.link_record_ids || [];
          return templateTagIds.includes(tagId);
        });

        if (matchedTemplateIds.length === 0) {
          console.log(
            `标签 ${tagItem.fields?.['名称']?.[0]?.text} 在模板筛选器的模板中没有匹配的模板，跳过`
          );
          continue;
        }

        // 创建四级标签记录
        const tagName = tagItem.fields?.['名称']?.[0]?.text || '';
        console.log(
          `创建四级标签: ${tagName}, 父级: ${ch3Item.fields?.['显示名']?.[0]?.text}, 包含模板数: ${matchedTemplateIds.length}`
        );

        insertRecords.push({
          fields: {
            显示名: tagName,
            内部名称: `${ch3Item.fields?.['显示名']?.[0]?.text}-${tagName}`,
            父级: [ch3Item.record_id],
            包含模版: matchedTemplateIds,
          },
        });
      }
    }
  }

  // 7. 批量创建四级标签记录
  if (insertRecords.length > 0) {
    console.log(`准备创建 ${insertRecords.length} 条四级标签记录`);
    // 创建新记录时不需要 record_id，使用类型断言
    await batchCreateAndUpdate(
      insertRecords as any,
      [],
      JTBitTables['四级-标签'],
      100
    );
    console.log('迁移完成！');
  } else {
    console.log('没有需要创建的四级标签记录');
  }
};

if (require.main === module) {
  try {
    (async function run() {
      await main();
      process.exit(0);
    })();
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}
