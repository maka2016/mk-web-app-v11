import dotenv from 'dotenv';
import { syncChannel } from '../service/chanels';
import { JTBitTables } from '../service/cms/bit_tables/jiantie';

dotenv.config({ path: '.env.local' });
const buildJStoreV2 = async () => {
  await syncChannel(JTBitTables['一级-栏目'], '一级-栏目');
  await syncChannel(
    JTBitTables['二级-频道'],
    '二级-频道',
    JTBitTables['一级-栏目'],
    { needThumb: true, needParent: true }
  );
  await syncChannel(
    JTBitTables['三级-热词'],
    '三级-热词',
    JTBitTables['二级-频道']
  );
  await syncChannel(
    JTBitTables['四级-集合'],
    '四级-集合',
    JTBitTables['三级-热词'],
    {
      needThumb: true,
      needTemplate: true,
      templateBit: JTBitTables['模版生产'],
    }
  );
  // const { data } = await getLarkClient().datasheet.v2.sheets.get({
  //   sheet_id: 'tblQHmefOcyLQ9Mg',
  // });
};

if (require.main === module) {
  // 当前文件是被直接执行
  console.log('Running directly');

  (async function run() {
    await buildJStoreV2();
    // await buildExcercise();
    // await syncTagFromBit2cms();
    process.exit(1);
  })();
} else {
  // 当前文件是被其他文件引用
  console.log('Imported zhutuWin as a module');
}
