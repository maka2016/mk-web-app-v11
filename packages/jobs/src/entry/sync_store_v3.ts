import dotenv from 'dotenv';
import { syncChannel } from '../service/chanels';

import { JTBitTables } from '../service/cms/bit_tables/jiantie';
import { syncTemplatesTags } from '../service/cms/template';

dotenv.config({ path: '.env.local' });
const buildJStoreV2 = async () => {
  // await syncTemplateSortMetrics();

  // await syncTags();
  await syncTemplatesTags();
  // await syncTempalteFilters();

  // console.log('buildJStoreV3 start');
  await syncChannel(JTBitTables['一级-栏目'], '一级栏目');
  // // return;
  await syncChannel(
    JTBitTables['二级-频道'],
    '二级频道',
    JTBitTables['一级-栏目'],
    'production',
    { needThumb: true, needParent: true }
  );
  await syncChannel(
    JTBitTables['三级-热词'],
    '三级热词',
    JTBitTables['二级-频道'],
    'production',
    { needParent: true, needFilter: true }
  );

  await syncChannel(
    JTBitTables['四级-标签'],
    '四级标签',
    JTBitTables['三级-热词'],
    'production',
    { needParent: true, needTemplate: true }
  );
};

// ES 模块中直接执行主逻辑
(async function run() {
  await buildJStoreV2();
  // await runRegenTemplateCoverV3();
  // await buildExcercise();
  // await syncTagFromBit2cms();
  process.exit(0);
})();
