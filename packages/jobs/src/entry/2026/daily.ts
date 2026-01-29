//appid:jiantie,maka,wenzy,preschool,gov
//执行最近7天的数据

import dayjs from 'dayjs';
import { statBiTemplateChannelDaily } from './dwd_bi_channel';
import { statBiTemplateDaily } from './dwd_bi_template';
import { statBiProductDaily } from './dwd_bi_product';
import { statBiProductUserTypeDaily } from './dwd_bi_product_uni';
import { statBiSearchTermDaily } from './dwd_bi_search';
import { syncUserInfoByDate } from '../../jiantie/entry/sync_user_data';
import { statBiGainDaily } from './dwd_bi_gain';
import { syncOrderData } from '../../jiantie/entry/sync_order_data';
import { statBiAbtestDaily } from './dwd_bi_abtest';

const appids = ['jiantie', 'maka', 'wenzy', 'preschool', 'gov'];

// 生成最近7天的日期列表（包含今天）
const dates = Array.from({ length: 7 }, (_, i) =>
  dayjs().subtract(i, 'day').format('YYYY-MM-DD')
);

async function main() {
  const dates2 = Array.from({ length: 3 }, (_, i) =>
    dayjs().subtract(i, 'day').format('YYYY-MM-DD')
  );
  for (const date of dates2) {
    await syncUserInfoByDate(new Date(date));
    await statBiSearchTermDaily('maka', date);
    await syncOrderData(date);
  }

  for (const date of dates) {
    for (const appid of appids) {
      await statBiProductDaily(appid, date);
      await statBiProductUserTypeDaily(appid, date);

      //
    }
  }

  for (const date of dates) {
    for (const appid of ['maka', 'jiantie']) {
      await statBiTemplateChannelDaily(appid, date);
      await statBiTemplateDaily(appid, date);
      await statBiGainDaily(appid, date);
      await statBiAbtestDaily(appid, date);
    }
  }

  process.exit(0);
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}
