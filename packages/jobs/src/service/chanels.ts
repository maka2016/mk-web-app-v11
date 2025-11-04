import { prisma } from '@workspace/database';
import _ from 'lodash';
import { BitChannelItem } from './cms/bit_tables/jiantie';
import { DatasheetItem, batchCreateAndUpdate, getAllRecord } from './cms/lark';

export const syncChannel = async (
  sonBitTable: DatasheetItem,
  ChClassName: string,
  parentBit?: DatasheetItem
) => {
  const sonCh1RawOnbit: BitChannelItem[] = await getAllRecord(sonBitTable);

  const parentCh1RawOnbit: BitChannelItem[] = parentBit
    ? await getAllRecord(parentBit, undefined, true)
    : [];

  const parentMap = _.keyBy(parentCh1RawOnbit, 'record_id');
  // const ch2OnbitMap = keyBy(ch2Onbit, "record_id");
  const inserData = sonCh1RawOnbit
    .filter(
      item =>
        !!item.fields['内部唯一名称'] &&
        !!item.fields['显示名'] &&
        !!item.fields['语言']
    )
    .map(item => {
      console.log('item', item);
      // 提取内部唯一名称（bitTextRef 类型）
      const aliasField = item.fields['内部唯一名称'];
      const alias = aliasField?.[0]?.text || '';
      // 提取显示名（bitTextRaw[] 类型）
      const displayNameField = item.fields['显示名'];
      const displayName = displayNameField?.[0]?.text || '';

      // 提取语言（string 类型）
      const language = item.fields['语言'] || 'zh-CN';

      console.log(`处理栏目: ${alias} - ${displayName}`);

      const parent = item.fields['父级']?.link_record_ids?.[0];
      console.log('parent', parent);
      const parentData = parent ? parentMap[parent] : null;
      console.log('parentData', parentData);
      const parentId = parentData?.fields['id']?.[0]?.text || null;

      console.log('parentId', parentId);

      const newData: any = {
        alias, // 使用内部唯一名称作为 alias
        display_name: displayName, // 显示名
        class: ChClassName, // 一级栏目
        locale: language, // 语言类型
        appid: 'jiantie', // 应用ID
      };
      if (parentId) {
        newData.parent_id = Number(parentId);
      }
      return {
        record_id: item.record_id,
        data: newData,
      };
    });

  //feishuArr用于回写
  const feishuArr: any[] = [];

  // 批量 upsert 数据
  for (const data of inserData) {
    console.log('data', data);
    const upsertRes = await prisma.templateMarketChannelEntity.upsert({
      where: {
        alias: data.data.alias,
      },
      update: {
        display_name: data.data.display_name,
        locale: data.data.locale,
        class: data.data.class,
      },
      create: data.data,
    });
    console.log('upsertRes', upsertRes);
    if (upsertRes.id) {
      feishuArr.push({
        record_id: data.record_id,
        fields: {
          状态: '已同步',
          id: `${upsertRes.id}`,
        },
      });
    }
  }

  await batchCreateAndUpdate([], feishuArr, sonBitTable, 100);
  console.log(`已同步 ${inserData.length} 条一级栏目数据`);
};
