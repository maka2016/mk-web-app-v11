//第一步，从bi mk_datawork_sls_events 查询出今天有访问量的作品，读取作品id，uid
//如果当日uv<5则跳过
//第二部，从platv5_works_x中读取作品基础信息（   'works_id','uid','title', 'create_time','update_time','thumb','status'），update_time作为ReviewTask的snapshot_time
//第三步，从DB.makadata("works_daily_statistics")读取历史数据（结构为uid，works_id,data,pv,uv,share）
//第四步，如果ReviewTask存在works_id和snapshot_time与作品update_time相同且pv差值小于100的记录，则跳过
//第五步，如果ReviewTask不存在works_id和snapshot_time与作品update_time相同的记录，则创建
//注意，用dayjs来处理时间

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as WorkRcPrismaClient } from '../../generated/client/client';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import DB from '../utils/db';

// 加载环境变量
dotenv.config();
dotenv.config({ path: '.env.local' });

// 从 object_id 提取 uid（从第9位开始）
// 例子：AXXO9I03W600078570，uid 为 600078570
function extractUidFromObjectId(objectId: string): number | null {
  if (!objectId || objectId.length < 10) {
    return null;
  }
  // 从第9位开始提取
  const uidStr = objectId.substring(9);
  // 提取数字部分作为 uid
  const uidMatch = uidStr.match(/^\d+/);
  if (!uidMatch) {
    return null;
  }
  const uid = parseInt(uidMatch[0], 10);
  return isNaN(uid) ? null : uid;
}

// 初始化数据库连接
function initWorkRcPrisma(): WorkRcPrismaClient {
  const connectionString = process.env.RC_DB_URL;
  if (!connectionString) {
    throw new Error('RC_DB_URL 环境变量未设置');
  }
  const adapter = new PrismaPg({ connectionString });
  return new WorkRcPrismaClient({ adapter });
}

/**
 * 主函数：生成审核任务
 */
async function main() {
  const workRcPrisma = initWorkRcPrisma();

  try {
    // 获取今天的日期范围
    const today = dayjs();
    const startOfDay = today.startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const endOfDay = today.endOf('day').format('YYYY-MM-DD HH:mm:ss');

    console.log(`开始生成审核任务，日期: ${today.format('YYYY-MM-DD')}`);
    console.log(`时间范围: ${startOfDay} 到 ${endOfDay}`);

    // 第一步：从bi mk_datawork_sls_events 查询出今天有访问量的作品，读取作品id，uid
    console.log('\n第一步：查询今天有访问量的作品...');
    const todayVisitData = await DB.biAdb('mk_datawork_sls_events')
      .select(
        'object_id',
        DB.biAdb.raw('COUNT(*) as pv'),
        DB.biAdb.raw('COUNT(DISTINCT distinct_id) as uv')
      )
      .where('event_type', 'page_view')
      .whereIn('parent_type', ['h5', 'website', 'longH5'])
      .where('event_time', '>=', startOfDay)
      .where('event_time', '<=', endOfDay)
      .groupBy('object_id')
      .havingRaw('COUNT(DISTINCT distinct_id) >= ?', [5]) // 如果当日uv<5则跳过
      .orderByRaw('COUNT(DISTINCT distinct_id) DESC');

    console.log(`查询到 ${todayVisitData.length} 个作品访问记录（UV >= 5）`);

    if (todayVisitData.length === 0) {
      console.log('今天没有符合条件的作品访问量，结束。');
      return;
    }

    // 从 object_id 提取 uid 并构建作品数据映射
    const worksDataMap = new Map<
      string,
      { object_id: string; pv: number; uv: number; uid: number }
    >();

    for (const item of todayVisitData) {
      const objectId = String(item.object_id || '');
      if (!objectId || objectId.length < 10) {
        continue;
      }

      const uid = extractUidFromObjectId(objectId);
      if (uid === null) {
        continue;
      }

      worksDataMap.set(objectId, {
        object_id: objectId,
        pv: Number(item.pv) || 0,
        uv: Number(item.uv) || 0,
        uid: uid,
      });
    }

    console.log(`提取到 ${worksDataMap.size} 个有效的作品ID和UID`);

    // 按 uid % 16 分组，以便批量查询分表
    const worksByTable = new Map<
      number,
      Array<{ object_id: string; pv: number; uv: number; uid: number }>
    >();

    for (const [, data] of worksDataMap.entries()) {
      const tableIndex = data.uid % 16;
      if (!worksByTable.has(tableIndex)) {
        worksByTable.set(tableIndex, []);
      }
      worksByTable.get(tableIndex)!.push(data);
    }

    console.log(`需要查询 ${worksByTable.size} 个分表`);

    // 收集所有作品信息
    const allWorks: Array<{
      works_id: string;
      uid: number;
      title: string;
      create_time: Date | string;
      update_time: Date | string;
      thumb: string | null;
      status: number;
      pv: number;
      uv: number;
    }> = [];

    // 第二步：从platv5_works_x中读取作品基础信息
    for (const [tableIndex, worksList] of worksByTable.entries()) {
      const tableName = `platv5_works_${tableIndex}`;
      const uids = worksList.map(w => w.uid);
      const objectIds = worksList.map(w => w.object_id);

      console.log(`\n查询表 ${tableName}，共 ${worksList.length} 条记录`);

      try {
        const worksInfo = await DB.makadb(tableName)
          .select(
            'works_id',
            'uid',
            'title',
            'create_time',
            'update_time',
            'thumb',
            'status'
          )
          .whereIn('uid', uids)
          .whereIn('works_id', objectIds);

        console.log(`从 ${tableName} 查询到 ${worksInfo.length} 条 works 信息`);

        // 收集作品信息
        for (const work of worksInfo) {
          const visitData = worksList.find(w => w.object_id === work.works_id);

          allWorks.push({
            works_id: work.works_id,
            uid: work.uid,
            title: work.title || '',
            create_time: work.create_time,
            update_time: work.update_time,
            thumb: work.thumb || null,
            status: work.status || 0,
            pv: visitData?.pv || 0,
            uv: visitData?.uv || 0,
          });
        }
      } catch (error) {
        console.error(`查询表 ${tableName} 时出错:`, error);
      }
    }

    console.log(`\n总共收集到 ${allWorks.length} 个作品需要处理`);

    if (allWorks.length === 0) {
      console.log('没有找到有效的作品信息，结束。');
      return;
    }

    // 第三步：从DB.makadata("works_daily_statistics")读取历史数据
    console.log('\n第三步：读取历史统计数据...');
    const worksIds = allWorks.map(w => w.works_id);
    const uids = allWorks.map(w => w.uid);

    // 查询历史统计数据（假设表结构为 uid, works_id, data, pv, uv, share）
    // 注意：这里需要根据实际表结构调整查询字段
    const historyStats = await DB.makadata('works_daily_statistics')
      .select('uid', 'works_id', 'pv', 'uv', 'share')
      .whereIn('works_id', worksIds)
      .whereIn('uid', uids);

    console.log(`查询到 ${historyStats.length} 条历史统计数据`);

    // 建立 works_id -> historyStats 的映射
    const historyStatsMap = new Map<
      string,
      { pv: number; uv: number; share: number }
    >();

    for (const stat of historyStats) {
      const worksId = String(stat.works_id || '');
      if (!worksId) continue;

      // 计算历史累计数据（可能需要聚合多天的数据）
      const existing = historyStatsMap.get(worksId);
      if (existing) {
        existing.pv += Number(stat.pv) || 0;
        existing.uv += Number(stat.uv) || 0;
        existing.share += Number(stat.share) || 0;
      } else {
        historyStatsMap.set(worksId, {
          pv: Number(stat.pv) || 0,
          uv: Number(stat.uv) || 0,
          share: Number(stat.share) || 0,
        });
      }
    }

    // 第四步和第五步：检查并创建 ReviewTask
    console.log('\n第四步和第五步：检查并创建 ReviewTask...');

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 批量查询已存在的 ReviewTask
    // @ts-ignore - ReviewTask 模型可能尚未在生成的 client 中
    const existingTasks = await workRcPrisma.reviewTask.findMany({
      where: {
        workId: {
          in: worksIds,
        },
      },
      select: {
        id: true,
        workId: true,
        snapshotTime: true,
        pv: true,
      },
    });

    // 建立 workId -> { snapshotTime: pv } 的映射（用于快速查找）
    const existingTasksMap = new Map<string, Map<string, number>>();
    for (const task of existingTasks) {
      const snapshotTimeStr = dayjs(task.snapshotTime).format(
        'YYYY-MM-DD HH:mm:ss'
      );
      if (!existingTasksMap.has(task.workId)) {
        existingTasksMap.set(task.workId, new Map());
      }
      existingTasksMap.get(task.workId)!.set(snapshotTimeStr, task.pv);
    }

    // 处理每个作品
    for (const work of allWorks) {
      try {
        // 转换作品的 update_time 为 Date 对象和字符串格式
        const updateTime =
          work.update_time instanceof Date
            ? work.update_time
            : new Date(work.update_time);
        const snapshotTime = updateTime;
        const snapshotTimeStr = dayjs(snapshotTime).format(
          'YYYY-MM-DD HH:mm:ss'
        );

        // 第四步：如果ReviewTask存在works_id和snapshot_time与作品update_time相同且pv差值小于100的记录，则跳过
        const existingSnapshots = existingTasksMap.get(work.works_id);
        if (existingSnapshots && existingSnapshots.has(snapshotTimeStr)) {
          const existingPv = existingSnapshots.get(snapshotTimeStr)!;
          const pvDiff = Math.abs(work.pv - existingPv);
          if (pvDiff < 100) {
            console.log(
              `跳过作品 ${work.works_id}，已存在相同 snapshot_time 的记录，pv差值 ${pvDiff} < 100`
            );
            skippedCount++;
            continue;
          }
        }

        // 获取历史统计数据
        const historyStat = historyStatsMap.get(work.works_id) || {
          pv: 0,
          uv: 0,
          share: 0,
        };

        // 第五步：如果ReviewTask不存在works_id和snapshot_time与作品update_time相同的记录，则创建
        // @ts-ignore - ReviewTask 模型可能尚未在生成的 client 中
        await workRcPrisma.reviewTask.create({
          data: {
            workId: work.works_id,
            uid: work.uid,
            type: 'makav7', // 从 platv5_works_x 查询的是 makav7 作品
            pv: work.pv,
            uv: work.uv,
            share: historyStat.share,
            historyPv: historyStat.pv,
            historyUv: historyStat.uv,
            snapshotTime: snapshotTime,
            status: 'pending', // 默认状态为待审核
          },
        });

        console.log(
          `创建 ReviewTask: works_id=${work.works_id}, snapshot_time=${snapshotTimeStr}`
        );
        createdCount++;
      } catch (error) {
        console.error(`处理作品 ${work.works_id} 时出错:`, error);
        errorCount++;
      }
    }

    console.log('\n处理完成！');
    console.log(`创建成功: ${createdCount} 个`);
    console.log(`跳过: ${skippedCount} 个`);
    console.log(`错误: ${errorCount} 个`);
  } catch (error) {
    console.error('执行失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await workRcPrisma.$disconnect();
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

export { main };
