import { initPrisma } from '@mk/jiantie/v11-database';

// 初始化数据库连接
const prisma = initPrisma({
  connectionString: `${process.env.DATABASE_URL}`,
});

const statDailyWork = async (date: string) => {
  //注意时区问题，date为东八区时间日期
  //读取sls_works_session_entity表中的数据，统计每个作品的pv和uv（pv为按session_id统计，uv为按distinct_id统计），然后按照省份（在metadata中）进行分组，统计每个省份的pv和uv
  //将数据更新到prisma的sls_works_daily_statistics_entity表中

  try {
    // 将东八区日期转换为UTC时间范围
    // 东八区 00:00:00 对应 UTC 前一天的 16:00:00
    // 东八区 23:59:59.999 对应 UTC 当天的 15:59:59.999
    const startTime = new Date(`${date}T00:00:00+08:00`); // 东八区当天的00:00:00，自动转换为UTC
    const endTime = new Date(`${date}T23:59:59.999+08:00`); // 东八区当天的23:59:59.999，自动转换为UTC

    console.log(
      `开始统计日期 ${date} (东八区) 的数据，UTC时间范围: ${startTime.toISOString()} 到 ${endTime.toISOString()}`
    );

    // 查询该日期范围内的所有session数据
    // 只要start_time或end_time在该日期范围内就包含
    const sessions = await prisma.slsWorksSessionEntity.findMany({
      where: {
        start_time: {
          gte: startTime,
          lte: endTime,
        },
      },
      select: {
        works_id: true,
        session_id: true,
        distinct_id: true,
        metadata: true,
        start_time: true,
        end_time: true,
      },
    });

    console.log(`查询到 ${sessions.length} 条session记录`);

    if (sessions.length === 0) {
      console.log('没有数据需要统计');
      return;
    }

    // 统计数据结构
    // worksStats[works_id] = {
    //   pv: Set<session_id>,
    //   uv: Set<distinct_id>,
    //   provinceStats: {
    //     [province]: {
    //       pv: Set<session_id>,
    //       uv: Set<distinct_id>
    //     }
    //   }
    // }
    interface ProvinceStat {
      pv: Set<string>;
      uv: Set<string>;
    }

    interface WorksStat {
      pv: Set<string>;
      uv: Set<string>;
      provinceStats: Record<string, ProvinceStat>;
      totalDuration: number; // 总访问时长（秒）
      sessionCount: number; // session数量，用于计算平均值
    }

    const worksStats = new Map<string, WorksStat>();

    // 遍历所有session，进行统计
    for (const session of sessions) {
      const {
        works_id,
        session_id,
        distinct_id,
        metadata,
        start_time,
        end_time,
      } = session;

      // 过滤掉 works_id 为 null、空字符串或包含 "T_" 的数据
      if (
        !works_id ||
        works_id === null ||
        !session_id ||
        works_id.includes('T_')
      ) {
        continue;
      }

      // 获取或创建作品统计对象
      if (!worksStats.has(works_id)) {
        worksStats.set(works_id, {
          pv: new Set(),
          uv: new Set(),
          provinceStats: {},
          totalDuration: 0,
          sessionCount: 0,
        });
      }

      const workStat = worksStats.get(works_id)!;

      // 统计PV（按session_id）
      workStat.pv.add(session_id);

      // 计算访问时长（秒）
      if (start_time && end_time) {
        const duration = Math.max(
          1,
          Math.round((end_time.getTime() - start_time.getTime()) / 1000)
        );
        workStat.totalDuration += duration;
        workStat.sessionCount += 1;
      }

      // 统计UV（按distinct_id，如果有的话）
      if (distinct_id) {
        workStat.uv.add(distinct_id);
      }

      // 从metadata中提取省份
      let province: string | null = null;
      if (metadata && typeof metadata === 'object') {
        const meta = metadata as Record<string, any>;
        province = meta.province || meta.Province || null;
      }

      // 如果省份为空，使用"未知"
      const provinceKey = province || '未知';

      // 初始化省份统计
      if (!workStat.provinceStats[provinceKey]) {
        workStat.provinceStats[provinceKey] = {
          pv: new Set(),
          uv: new Set(),
        };
      }

      const provinceStat = workStat.provinceStats[provinceKey];

      // 统计省份PV
      provinceStat.pv.add(session_id);

      // 统计省份UV
      if (distinct_id) {
        provinceStat.uv.add(distinct_id);
      }
    }

    console.log(`统计了 ${worksStats.size} 个作品的数据`);

    // 将统计结果转换为数据库格式并更新
    // date字段应该存储东八区的日期，所以直接使用date字符串
    // 但需要转换为Date对象，使用东八区时间，然后数据库会存储日期部分
    const dateForDb = new Date(`${date}T00:00:00+08:00`);

    // 准备批量更新数据
    const upsertData = Array.from(worksStats.entries()).map(
      ([works_id, stat]) => {
        // 构建省份统计数据
        const provinceData: Record<string, { pv: number; uv: number }> = {};
        for (const [province, provinceStat] of Object.entries(
          stat.provinceStats
        )) {
          provinceData[province] = {
            pv: provinceStat.pv.size,
            uv: provinceStat.uv.size,
          };
        }

        // 计算平均访问时长（秒）
        const avgDuration =
          stat.sessionCount > 0
            ? Math.round(stat.totalDuration / stat.sessionCount)
            : 0;

        return {
          works_id,
          date: dateForDb,
          viewer_pv: stat.pv.size,
          viewer_uv: stat.uv.size,
          data: {
            provinces: provinceData,
            avgDuration,
          } as any,
          metadata: {} as any,
        };
      }
    );

    // 先批量删除该日期的所有统计数据
    console.log(`删除日期 ${date} 的现有统计数据`);
    const deleteResult = await prisma.slsWorksDailyStatisticsEntity.deleteMany({
      where: {
        date: dateForDb,
      },
    });
    console.log(`删除了 ${deleteResult.count} 条现有记录`);

    // 批量插入新的统计数据
    console.log(`批量插入统计数据，共 ${upsertData.length} 条`);
    if (upsertData.length > 0) {
      try {
        // 分批插入，每批最多 200 条
        const batchSize = 200;
        let insertCount = 0;
        for (let i = 0; i < upsertData.length; i += batchSize) {
          const batch = upsertData.slice(i, i + batchSize);
          await prisma.slsWorksDailyStatisticsEntity.createMany({
            data: batch,
          });
          insertCount += batch.length;
        }
        console.log(`成功插入了 ${insertCount} 个作品的统计数据`);
      } catch (error: any) {
        console.error('批量插入统计数据失败:', error.message);
        throw error;
      }
    } else {
      console.log('没有数据需要插入');
    }
    console.log('数据统计完成');
  } catch (error: any) {
    console.error('统计作品数据失败:', error.message);
    throw error;
  }
};

export { statDailyWork };
