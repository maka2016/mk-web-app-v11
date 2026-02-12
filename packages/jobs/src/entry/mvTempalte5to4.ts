import dotenv from 'dotenv';
import { BitChannelItem, JTBitTables } from '../service/cms/bit_tables/jiantie';
import { batchCreateAndUpdate, getAllRecord } from '../service/cms/lark';
dotenv.config({ path: '.env.local' });
const main = async () => {
  const ch4Data: BitChannelItem[] = await getAllRecord(
    JTBitTables['四级-楼层'],
    {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '子级',
            operator: 'isNotEmpty',
            value: [],
          },
        ],
      },
    }
  );
  const ch5Data: BitChannelItem[] = await getAllRecord(
    JTBitTables['五级-集合']
  );

  // const templateData: TemplateChannelItem[] = await getAllRecord(
  //   JTBitTables['模版生产']
  // );
  // const templateDataMap = new Map(
  //   templateData.map(item => [item.record_id, item])
  // );

  const ch5DataMap = new Map(ch5Data.map(item => [item.record_id, item]));

  for (const item of ch4Data) {
    const ch5Ids = item.fields?.['子级']?.link_record_ids || [];
    const ch5Data = ch5Ids.map(id => ch5DataMap.get(id));
    const tempalteBitIds = ch5Data
      .map(item => item?.fields?.['包含模版']?.link_record_ids || [])
      .flat();

    console.log(item.fields?.['显示名']?.[0]?.text, tempalteBitIds);
    await batchCreateAndUpdate(
      [],
      [
        {
          record_id: item.record_id,
          fields: {
            关联模板: tempalteBitIds,
          },
        },
      ],
      JTBitTables['四级-楼层'],
      100
    );
  }
  //   const tempalteIds = tempalteBitIds.map(
  //     id => templateDataMap.get(id)?.fields?.['任务模板ID']?.[0]?.text || ''
  //   );
  //   console.log(item.fields?.['显示名']?.[0]?.text, tempalteIds);
  // }
};

if (require.main === module) {
  try {
    (async function run() {
      await main();
      // await buildExcercise();
      // await syncTagFromBit2cms();
      process.exit(1);
    })();
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}
