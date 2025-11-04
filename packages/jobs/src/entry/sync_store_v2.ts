import { JTBitTables } from '../service/cms/bit_tables/jiantie';
import { getAllRecord } from '../service/cms/lark';

const buildJStoreV2 = async () => {
  const ch1Onbit = await getAllRecord(JTBitTables['一级-栏目']);
  console.log(ch1Onbit);
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
