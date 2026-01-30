import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import {
  BitTempalteFilterItem,
  JTBitTables,
  TagItem,
  TemplateChannelItem,
} from './cms/bit_tables/jiantie';
import { batchCreateAndUpdate, getAllRecord } from './cms/lark';
dotenv.config({ path: '.env.local' });
const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });
export const syncTempalteFilters = async () => {
  const filtersOnBit: BitTempalteFilterItem[] = await getAllRecord(
    JTBitTables['模板筛选器'],
    {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '内部名称',
            operator: 'isNotEmpty',
            value: [],
          },
        ],
      },
    }
  );

  const templateOnBit: TemplateChannelItem[] = await getAllRecord(
    JTBitTables['模版生产']
  );
  const templateOnBitMap = new Map(
    templateOnBit.map(item => [item.record_id, item])
  );

  // const ch3onBit: BitChannelItem[] = await getAllRecord(
  //   JTBitTables['三级-热词']
  // );
  // const ch3onBitMap = new Map(ch3onBit.map(item => [item.record_id, item]));

  const tagsOnBit: TagItem[] = await getAllRecord(JTBitTables['模板标签']);
  console.log('tagsOnBit', tagsOnBit);
  const tagsOnBitMap = new Map(tagsOnBit.map(item => [item.record_id, item]));
  console.log('tagsOnBitMap', tagsOnBitMap);

  // 批量处理，每100个一组
  const batchSize = 100;
  for (let i = 0; i < filtersOnBit.length; i += batchSize) {
    const batch = filtersOnBit.slice(i, i + batchSize);

    // 准备批量数据
    const upsertPromises: Promise<any>[] = [];
    const updateRecords: any[] = [];

    for (const filter of batch) {
      const filterData = filter.fields;
      const templateIds = filterData['包含模版']?.link_record_ids || [];
      const templateArr = templateIds.map(
        id => templateOnBitMap.get(id)?.fields?.['任务模板ID']?.[0]?.text || ''
      );
      const alias = filterData['alias']?.value?.[0]?.text || '';

      const tagIds = filterData['模板标签V3选项']?.link_record_ids || [];
      console.log('tagIds', tagIds);
      const tagArr = tagIds.map(id => {
        return {
          name: tagsOnBitMap.get(id)?.fields?.['名称']?.[0]?.text || '',
          type: tagsOnBitMap.get(id)?.fields?.['类型']?.[0]?.text || '',
          id: tagsOnBitMap.get(id)?.fields?.['id']?.[0]?.text || '',
        };
      });

      console.log('tagArr', tagArr);

      const newData: any = {
        name: filterData['内部名称']?.[0]?.text || '',
        templateIds: templateArr,
        alias: alias,
        config: {
          tagFilterData: tagArr,
        },
        // config: filterData['筛选标签显示']?.[0]?.text || '',
      };

      // 收集upsert操作
      upsertPromises.push(
        prisma.templateFilterEntity.upsert({
          where: {
            alias: alias,
          },
          update: newData,
          create: newData,
        })
      );

      // 收集需要更新的记录
      updateRecords.push({
        record_id: filter.record_id,
        fields: {
          状态: '已同步',
        },
      });
    }

    // 批量执行upsert
    await Promise.all(upsertPromises);

    // 批量更新状态
    if (updateRecords.length > 0) {
      await batchCreateAndUpdate(
        [],
        updateRecords,
        JTBitTables['模板筛选器'],
        100
      );
    }
  }
};
