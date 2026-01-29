//读取所有挂上了筛选器的模板
//读取筛选id
//建立关系

import { initPrisma } from '@mk/jiantie/v11-database';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import knex from 'knex';
import {
  JTBitTables,
  TagItem,
  TemplateChannelItem,
} from './bit_tables/jiantie';
import { getAllRecord } from './lark';

dotenv.config({ path: '.env.local' });
const prisma = initPrisma({ connectionString: `${process.env.DATABASE_URL}` });

export const syncTemplatesTags = async () => {
  const templatesOnBit: TemplateChannelItem[] = await getAllRecord(
    JTBitTables['模版生产'],
    {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: '四级-标签',
            operator: 'isNotEmpty',
            value: [],
          },
        ],
      },
    }
  );

  const allTagsOnBit: TagItem[] = await getAllRecord(JTBitTables['模板标签']);
  const allTagsOnBitMap = new Map(
    allTagsOnBit.map(item => [item.record_id, item])
  );

  // 批量处理，每次100个
  const batchSize = 100;
  for (let i = 0; i < templatesOnBit.length; i += batchSize) {
    const batch = templatesOnBit.slice(i, i + batchSize);
    console.log(
      `处理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 个模板`
    );

    const updatePromises = batch.map(async template => {
      const templateData = template.fields;
      const templateTagBitIds =
        templateData['模板标签V3']?.link_record_ids || [];

      const templateTagIds = templateTagBitIds
        .map(id => allTagsOnBitMap.get(id)?.fields?.['id']?.[0]?.text || '')
        .filter(id => id !== ''); // 过滤掉空字符串

      const templateId = templateData['任务模板ID']?.[0]?.text || '';

      const appid = templateData['appid']?.value[0]?.text || '';

      let appids = templateData['appid']?.value?.map(item => item.text) || [];
      //去重
      appids = [...new Set(appids)];
      //去除字符长度低于2的
      appids = appids.filter(item => item.length >= 2);

      if (!templateId) {
        console.log('模板ID为空，跳过', template.record_id);
        return;
      }

      // 建立关系：使用 set 方法更新多对多关系
      try {
        await prisma.templateEntity.update({
          where: {
            id: templateId,
          },
          data: {
            appid: appid,
            appids: appids,
            tags: {
              set: templateTagIds.map(tagId => ({ id: tagId })),
            },
          },
        });
        console.log(`成功建立模板 ${templateId} 与标签的关系`);
      } catch (error) {
        console.error(`建立模板 ${templateId} 与标签关系失败:`, error);
      }
    });

    // 等待当前批次完成
    await Promise.all(updatePromises);
    console.log(`第 ${Math.floor(i / batchSize) + 1} 批处理完成`);
  }
};
const biAdb = knex({
  client: 'mysql',
  connection: {
    host: 'am-2zeo48x814d64lo93167330.ads.aliyuncs.com',
    user: 'report_api',
    password: 'j3E4h6NWBQ5U-',
    database: 'mk_datawork',
  },
});

interface TemplateSortDataRec {
  template_id: string;
  ageDays: number;
  impressions: number;
  impressions_uv: number;
  clicks: number;
  clicks_uv: number;
  creates: number;
  creates_uv: number;
  finishes: number;
  pays: number;
  // 近14天数据
  impressions_uv14?: number;
  clicks_uv14?: number;
  creates_uv14?: number;
  pays14?: number;
}

export const getTemplateStoreDataByIds = async (
  templateIds: string[],
  diff?: number,
  start?: string,
  end?: string
) => {
  let sql = biAdb('mk_template_store_data')
    .select('template_id')
    .whereIn('template_id', templateIds)
    .sum('show_pv as show_pv_sum')
    .sum('show_uv as show_uv_sum')
    .sum('click_pv as click_pv_sum')
    .sum('click_uv as click_uv_sum')
    .sum('creates as creates_sum')
    .sum('creates_uv as creates_uv_sum')
    .sum('pays as pays_sum')
    .sum('pub_pv as pub_pv_sum')
    .sum('pub_uv as pub_uv_sum')
    .sum('share_pv as share_pv_sum')
    .sum('share_uv as share_uv_sum')
    .min('date as date_min')
    .groupBy('template_id');

  if (diff) {
    sql = sql.where(
      'date',
      '>=',
      dayjs().subtract(diff, 'day').format('YYYY-MM-DD')
    );
  }

  if (start) {
    sql = sql.where('date', '>=', start);
  }

  if (end) {
    sql = sql.where('date', '<=', end);
  }

  let res = await sql;
  return res;
};

export const syncTemplateSortMetrics = async () => {
  //读取knex biDB的mk_dws_template_sort_data
  console.log('开始从 BI 数据库读取模板排序数据...');

  // 先获取所有 template_entity 中的 template_id
  const templateIds = await prisma.templateEntity.findMany({
    select: {
      id: true,
    },
  });
  const templateIdList = templateIds.map(t => t.id);

  console.log(`template_entity 中共有 ${templateIdList.length} 个模板`);

  // 只查询 template_entity 内有的数据
  // 分批查询，每次最多2000个ID
  const inbatchSize = 2000;
  const templateSortData: TemplateSortDataRec[] = [];

  for (let i = 0; i < templateIdList.length; i += inbatchSize) {
    const batch = templateIdList.slice(i, i + inbatchSize);
    console.log(
      `查询第 ${Math.floor(i / inbatchSize) + 1} 批，共 ${batch.length} 个模板ID`
    );

    const batchData = await getTemplateStoreDataByIds(batch);

    const batchData14 = await getTemplateStoreDataByIds(batch, 14);

    // 将 getTemplateStoreDataByIds 返回的数据映射到 TemplateSortDataRec 结构
    const mappedData: TemplateSortDataRec[] = batchData.map((item: any) => ({
      template_id: item.template_id,
      ageDays: -dayjs(item.date_min).diff(dayjs(), 'day'),
      impressions: Number(item.show_pv_sum) || 0,
      impressions_uv: Number(item.show_uv_sum) || 0,
      clicks: Number(item.click_pv_sum) || 0,
      clicks_uv: Number(item.click_uv_sum) || 0,
      creates: Number(item.creates_sum) || 0,
      creates_uv: Number(item.creates_uv_sum) || 0,
      finishes: 0, // getTemplateStoreDataByIds 不返回此字段，使用默认值
      pays: Number(item.pays_sum) || 0,
      finishes14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)
            ?.finishes_sum
        ) || 0,
      pays14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)?.pays_sum
        ) || 0,
      creates14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)?.creates_sum
        ) || 0,
      creates_uv14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)
            ?.creates_uv_sum
        ) || 0,
      clicks14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)
            ?.click_pv_sum
        ) || 0,
      clicks_uv14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)
            ?.click_uv_sum
        ) || 0,
      impressions14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)?.show_pv_sum
        ) || 0,
      impressions_uv14:
        Number(
          batchData14.find(t => t.template_id === item.template_id)?.show_uv_sum
        ) || 0,
    }));

    templateSortData.push(...mappedData);
  }

  console.log(`读取到 ${templateSortData.length} 条排序数据`);

  // 第一步：计算所有模板的指标
  interface TemplateMetrics {
    template_id: string;
    clicks_uv: number;
    // 近14天uv曝光点击率
    ctr14: number; // 近14天uv曝光点击率 = clicks_uv14 / impressions_uv14
    // uv曝光创作率（近14天）
    creationRate14: number; // uv曝光创作率 = creates_uv14 / impressions_uv14
    // uv曝光购买率（近14天）
    purchaseRate14: number; // uv曝光购买率 = pays14 / impressions_uv14
    // 历史的uv点击购买率
    clickPurchaseRate: number; // 历史的uv点击购买率 = pays / clicks_uv
    freshness: number; // 新鲜度（基于 ageDays，天数越少越新鲜）
    sales_count: number;
    creation_count: number;
    data: Record<string, any>;
    ageDays: number;
    impressions: number;
    impressions_fixed: number;
    clicks: number;
    finishes: number;
    pays: number;
    creates: number;
    // 14天数据字段
    impressions_uv14: number;
    clicks_uv14: number;
    creates_uv14: number;
    pays14: number;
  }

  const metricsList: TemplateMetrics[] = templateSortData
    .map(record => {
      let {
        template_id,
        creates,
        finishes,
        clicks_uv,
        impressions,
        pays,
        ageDays,
        impressions_uv14 = 0,
        clicks_uv14 = 0,
        creates_uv14 = 0,
        pays14 = 0,
      } = record;

      if (!template_id) {
        return null;
      }

      let impressions_fixed = impressions;
      if (impressions < clicks_uv) {
        // console.log('曝光数小于点击数则修正', record);
        impressions = clicks_uv * 10;
        impressions_fixed = impressions;
      }

      // 1. 计算近14天uv曝光点击率 = clicks_uv14 / impressions_uv14
      const ctr14 = impressions_uv14 > 0 ? clicks_uv14 / impressions_uv14 : 0;

      // 2. 计算uv曝光创作率（近14天）= creates_uv14 / impressions_uv14
      const creationRate14 =
        impressions_uv14 > 0 ? creates_uv14 / impressions_uv14 : 0;

      // 3. 计算uv曝光购买率（近14天）= pays14 / impressions_uv14
      const purchaseRate14 =
        impressions_uv14 > 0 ? pays14 / impressions_uv14 : 0;

      // 4. 计算历史的uv点击购买率 = pays / clicks_uv
      const clickPurchaseRate = clicks_uv > 0 ? pays / clicks_uv : 0;

      // 5. 计算新鲜度：天数越少越新鲜，使用反比例函数
      const freshness = 10 / (12 + (ageDays || 0));

      return {
        ageDays,
        template_id,
        impressions,
        impressions_fixed,
        clicks_uv,
        finishes,
        pays,
        creates,
        ctr14,
        creationRate14,
        purchaseRate14,
        clickPurchaseRate,
        freshness,
        sales_count: pays || 0,
        creation_count: creates || 0,
        impressions_uv14,
        clicks_uv14,
        creates_uv14,
        pays14,
      };
    })
    .filter((item): item is TemplateMetrics => item !== null);

  console.log(`有效数据: ${metricsList.length} 条`);

  // 第二步：计算各指标的排名（使用 Z-Score 标准化）
  // 获取各指标的值，用于计算均值和标准差
  const ctr14Values = metricsList
    .map(m => m.ctr14)
    .filter(v => !isNaN(v) && isFinite(v));
  const creationRate14Values = metricsList
    .map(m => m.creationRate14)
    .filter(v => !isNaN(v) && isFinite(v));
  const purchaseRate14Values = metricsList
    .map(m => m.purchaseRate14)
    .filter(v => !isNaN(v) && isFinite(v));
  const clickPurchaseRateValues = metricsList
    .map(m => m.clickPurchaseRate)
    .filter(v => !isNaN(v) && isFinite(v));
  const freshnessValues = metricsList
    .map(m => m.freshness)
    .filter(v => !isNaN(v) && isFinite(v));

  // 计算均值的辅助函数
  const mean = (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  // 计算标准差的辅助函数
  const stdDev = (values: number[]): number => {
    if (values.length === 0) return 0;
    const avg = mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  };

  // 计算各指标的均值和标准差
  const ctr14Mean = mean(ctr14Values);
  const ctr14Std = stdDev(ctr14Values);
  const creationRate14Mean = mean(creationRate14Values);
  const creationRate14Std = stdDev(creationRate14Values);
  const purchaseRate14Mean = mean(purchaseRate14Values);
  const purchaseRate14Std = stdDev(purchaseRate14Values);
  const clickPurchaseRateMean = mean(clickPurchaseRateValues);
  const clickPurchaseRateStd = stdDev(clickPurchaseRateValues);
  const freshnessMean = mean(freshnessValues);
  const freshnessStd = stdDev(freshnessValues);

  // Z-Score 标准化归一化函数：z = (x - μ) / σ，然后使用 sigmoid 映射到 0-1
  const normalize = (value: number, mean: number, std: number): number => {
    if (!isFinite(value) || isNaN(value) || std === 0) return 0;
    // 先进行 Z-Score 标准化
    const zScore = (value - mean) / std;
    // 使用 sigmoid 函数将 Z-Score 映射到 0-1 范围：sigmoid(z) = 1 / (1 + e^(-z))
    return 1 / (1 + Math.exp(-zScore));
  };

  let data = {};
  // 第三步：计算综合排序分（基于排名）
  // 权重：近14天uv曝光点击率、uv曝光创作率、uv曝光购买率、历史的uv点击购买率、freshness
  // 权重分配可以根据业务需求调整
  const metricsWithScore = metricsList.map(metrics => {
    const ctr14Rank = normalize(metrics.ctr14, ctr14Mean, ctr14Std);
    const creationRate14Rank = normalize(
      metrics.creationRate14,
      creationRate14Mean,
      creationRate14Std
    );
    const purchaseRate14Rank = normalize(
      metrics.purchaseRate14,
      purchaseRate14Mean,
      purchaseRate14Std
    );
    const clickPurchaseRateRank = normalize(
      metrics.clickPurchaseRate,
      clickPurchaseRateMean,
      clickPurchaseRateStd
    );
    const freshnessRank = normalize(
      metrics.freshness,
      freshnessMean,
      freshnessStd
    );

    data = {
      近14天曝光UV: metrics.impressions_uv14 || 0,
      近14天点击UV: metrics.clicks_uv14 || 0,
      近14天创作UV: metrics.creates_uv14 || 0,
      近14天支付数: metrics.pays14 || 0,
      历史点击量UV: metrics.clicks_uv,
      历史支付数: metrics.pays,
      新鲜度分: metrics.freshness,
      近14天uv曝光点击率: metrics.ctr14,
      uv曝光创作率: metrics.creationRate14,
      uv曝光购买率: metrics.purchaseRate14,
      历史的uv点击购买率: metrics.clickPurchaseRate,
      上架天数: metrics.ageDays,
      近14天uv曝光点击率排名分: ctr14Rank,
      uv曝光创作率排名分: creationRate14Rank,
      uv曝光购买率排名分: purchaseRate14Rank,
      历史的uv点击购买率排名分: clickPurchaseRateRank,
      新鲜度排名分: freshnessRank,
    };

    // 综合排序分：基于排名加权计算
    // 权重可以根据业务需求调整，这里使用均等权重作为示例
    let compositeScore =
      ctr14Rank * 0.2 +
      creationRate14Rank * 0.2 +
      purchaseRate14Rank * 0.2 +
      clickPurchaseRateRank * 0.2 +
      freshnessRank * 0.2;

    data = {
      ...data,
      综合排名分: compositeScore,
    };

    return {
      ...metrics,
      compositeScore,
      data,
    };
  });

  // 第四步：批量写入数据库
  const batchSize = 1000;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < metricsWithScore.length; i += batchSize) {
    const batch = metricsWithScore.slice(i, i + batchSize);
    console.log(
      `批量写入第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 条数据`
    );

    const updatePromises = batch.map(async item => {
      try {
        // 使用 upsert 更新或创建记录
        await prisma.templateSortMetricsEntity.upsert({
          where: {
            template_id: item.template_id,
          },
          update: {
            sales_count: item.sales_count,
            creation_count: item.creation_count,
            composite_score: item.compositeScore,
            data: item.data,
          },
          create: {
            template_id: item.template_id,
            sales_count: item.sales_count,
            creation_count: item.creation_count,
            composite_score: item.compositeScore,
            data: item.data,
            pin_weight: 0, // 默认不置顶
          },
        });
        successCount++;
      } catch (error) {
        console.error(
          `写入模板 ${item.template_id} 排序数据失败:`,
          error instanceof Error ? error.message : error
        );
        errorCount++;
      }
    });

    // 等待当前批次完成
    await Promise.all(updatePromises);
    console.log(`第 ${Math.floor(i / batchSize) + 1} 批处理完成`);
  }

  console.log('\n同步完成统计:');
  console.log(`- 总数据量: ${templateSortData.length}`);
  console.log(`- 有效数据: ${metricsList.length}`);
  console.log(`- 成功: ${successCount}`);
  console.log(`- 失败: ${errorCount}`);
  console.log(`\n指标统计 (Z-Score 标准化):`);
  console.log(
    `- 近14天uv曝光点击率 均值: ${ctr14Mean.toFixed(4)}, 标准差: ${ctr14Std.toFixed(4)}`
  );
  console.log(
    `- uv曝光创作率 均值: ${creationRate14Mean.toFixed(4)}, 标准差: ${creationRate14Std.toFixed(4)}`
  );
  console.log(
    `- uv曝光购买率 均值: ${purchaseRate14Mean.toFixed(4)}, 标准差: ${purchaseRate14Std.toFixed(4)}`
  );
  console.log(
    `- 历史的uv点击购买率 均值: ${clickPurchaseRateMean.toFixed(4)}, 标准差: ${clickPurchaseRateStd.toFixed(4)}`
  );
  console.log(
    `- 新鲜度 均值: ${freshnessMean.toFixed(4)}, 标准差: ${freshnessStd.toFixed(4)}`
  );
};
