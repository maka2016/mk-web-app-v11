import { initPrisma } from '@mk/jiantie/v11-database';

// 初始化数据库连接
const prisma = initPrisma({
  connectionString: `${process.env.DATABASE_URL}`,
});

// {"provinces": {"上海市": {"pv": 1, "uv": 1}, "江西省": {"pv": 1, "uv": 1}, "福建省": {"pv": 1, "uv": 1}, "贵州省": {"pv": 35, "uv": 26}}}

const dealWorkHistoryStat = async (date: string) => {
  //step1:根据时间范围查询sls_works_daily_statistics_entity（updatetime）获得需要更新的worksId
  //step2:根据worksId查询sls_works_daily_statistics_entity（pv,uv）获得需要累加pv和uv
  //将数据更新到sls_works_cumulative_pv_uv_entity表中

  try {
    // 将日期字符串（YYYY-MM-DD）转换为当天的开始和结束时间（东八区）
    // 开始时间：当天的 00:00:00
    // 结束时间：当天的 23:59:59.999
    const dateStr = date.trim();
    const startTimeDate = new Date(`${dateStr}T00:00:00+08:00`);
    const endTimeDate = new Date(`${dateStr}T23:59:59.999+08:00`);

    console.log(
      `开始处理历史统计数据，时间范围: ${startTimeDate.toISOString()} 到 ${endTimeDate.toISOString()}`
    );

    // Step1: 根据时间范围查询 sls_works_daily_statistics_entity（update_time）获得需要更新的 worksId
    const updatedDailyStats =
      await prisma.slsWorksDailyStatisticsEntity.findMany({
        where: {
          date: {
            gte: startTimeDate,
            lte: endTimeDate,
          },
        },
        select: {
          works_id: true,
        },
        distinct: ['works_id'],
      });

    const worksIds = updatedDailyStats.map(stat => stat.works_id);
    console.log(`查询到 ${worksIds.length} 个需要更新的作品ID`);

    if (worksIds.length === 0) {
      console.log('没有数据需要更新');
      return;
    }

    // Step2: 根据 worksId 查询 sls_works_daily_statistics_entity（viewer_pv, viewer_uv）获得需要累加的 pv 和 uv
    // 对于每个作品，累加所有历史日期的 pv 和 uv，以及各省份的 pv 和 uv
    const cumulativeStats = new Map<
      string,
      {
        pv: number;
        uv: number;
        provinces: Record<string, { pv: number; uv: number }>;
      }
    >();

    // 分批查询，每批最多 200 个 works_id
    const batchSize = 200;
    for (let i = 0; i < worksIds.length; i += batchSize) {
      const batch = worksIds.slice(i, i + batchSize);

      const dailyStats = await prisma.slsWorksDailyStatisticsEntity.findMany({
        where: {
          works_id: {
            in: batch,
          },
        },
        select: {
          works_id: true,
          viewer_pv: true,
          viewer_uv: true,
          data: true,
        },
      });

      // 累加每个作品的 pv 和 uv，以及各省份的 pv 和 uv
      for (const stat of dailyStats) {
        if (!cumulativeStats.has(stat.works_id)) {
          cumulativeStats.set(stat.works_id, {
            pv: 0,
            uv: 0,
            provinces: {},
          });
        }

        const cumulative = cumulativeStats.get(stat.works_id)!;
        cumulative.pv += stat.viewer_pv;
        cumulative.uv += stat.viewer_uv;

        // 累加省份数据
        if (stat.data && typeof stat.data === 'object') {
          const data = stat.data as Record<string, any>;
          const provinces = data.provinces;
          if (provinces && typeof provinces === 'object') {
            for (const [province, provinceStat] of Object.entries(provinces)) {
              if (
                provinceStat &&
                typeof provinceStat === 'object' &&
                'pv' in provinceStat &&
                'uv' in provinceStat
              ) {
                const provinceData = provinceStat as { pv: number; uv: number };
                if (!cumulative.provinces[province]) {
                  cumulative.provinces[province] = { pv: 0, uv: 0 };
                }
                cumulative.provinces[province].pv += provinceData.pv || 0;
                cumulative.provinces[province].uv += provinceData.uv || 0;
              }
            }
          }
        }
      }
    }

    console.log(`统计了 ${cumulativeStats.size} 个作品的累计数据`);

    // Step3: 将数据更新到 sls_works_cumulative_pv_uv_entity 表中
    // 先批量删除，然后批量创建
    const createData = Array.from(cumulativeStats.entries()).map(
      ([works_id, stat]) => ({
        works_id,
        pv: stat.pv,
        uv: stat.uv,
        data: {
          provinces: stat.provinces,
        } as any,
      })
    );

    // 分批执行删除和创建操作，每批最多 200 条
    const deleteCreateBatchSize = 200;
    let processCount = 0;
    for (let i = 0; i < createData.length; i += deleteCreateBatchSize) {
      const batch = createData.slice(i, i + deleteCreateBatchSize);
      const batchWorksIds = batch.map(item => item.works_id);

      try {
        // 先批量删除
        await prisma.slsWorksCumulativePvUvEntity.deleteMany({
          where: {
            works_id: {
              in: batchWorksIds,
            },
          },
        });

        // 然后批量创建
        await prisma.slsWorksCumulativePvUvEntity.createMany({
          data: batch,
        });

        processCount += batch.length;
      } catch (error: any) {
        console.error(
          `批量处理第 ${Math.floor(i / deleteCreateBatchSize) + 1} 批记录时出错:`,
          error.message
        );
      }
    }

    console.log(`成功更新了 ${processCount} 个作品的累计统计数据`);
    console.log('历史统计数据更新完成');
  } catch (error: any) {
    console.error('处理历史统计数据失败:', error.message);
    throw error;
  }
};

export { dealWorkHistoryStat };
