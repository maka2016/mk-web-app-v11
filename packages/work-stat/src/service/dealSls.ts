import * as CredentialModule from '@alicloud/credentials';
import * as $OpenApi from '@alicloud/openapi-client';
import Sls20201230, * as $Sls20201230 from '@alicloud/sls20201230';
import * as $Util from '@alicloud/tea-util';
const Credential = (CredentialModule as any).default || CredentialModule;

import { initPrisma } from '@mk/jiantie/v11-database';
// import dotenv from 'dotenv';

// // 加载项目根目录的 .env.local 文件

// // 先尝试从当前工作目录（项目根目录）加载
// dotenv.config({ path: '.env' });

// console.log(process.env);
// 配置信息（请根据实际情况修改）
const CONFIG = {
  endpoint: process.env.SLS_ENDPOINT || 'cn-beijing.log.aliyuncs.com',
  project: process.env.SLS_PROJECT || '',
  logstore: process.env.SLS_LOGSTORE || '',
  accessKeyId: process.env.SLS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.SLS_ACCESS_KEY_SECRET || '',
};

// 初始化数据库连接
const prisma = initPrisma({
  connectionString: `${process.env.DATABASE_URL}`,
});

/**
 * 创建 SLS 客户端
 */
function createClient(): Sls20201230 {
  // 工程代码建议使用更安全的无AK方式，凭据配置方式请参见：https://help.aliyun.com/document_detail/378664.html
  let credential = new Credential();
  let config = new $OpenApi.Config({
    accessKeyId: CONFIG.accessKeyId,
    accessKeySecret: CONFIG.accessKeySecret,
  });
  config.endpoint = CONFIG.endpoint;
  return new Sls20201230(config);
}

//

const dealSls = async (from: number, to: number) => {
  //读取sls的日志，query查询
  //将数据更新到prisma的sls_works_session_entity表中
  //如果sls_works_session_entity表中存在，则更新end_time，但是end_time不能小于原有数据

  const client = createClient();
  const query =
    '* | SELECT distinct(sessionId ),eventId, min(distincId) as distinctID ,min(__source__) as ip,min(ua),appId,ip_to_province(min(__source__)) AS Province,max(__time__) as endTime,min(__time__) as startTime  group by (sessionId,appId,eventId) limit 100000';

  try {
    // 构建查询请求
    const getLogsV2Request = new $Sls20201230.GetLogsV2Request({
      project: CONFIG.project,
      logstore: CONFIG.logstore,
      query: query,
      from: from,
      to: to,
      reverse: false,
    });

    const getLogsV2Headers = new $Sls20201230.GetLogsV2Headers({});
    const runtime = new $Util.RuntimeOptions({});

    // 执行查询
    const response = await client.getLogsV2WithOptions(
      CONFIG.project,
      CONFIG.logstore,
      getLogsV2Request,
      getLogsV2Headers,
      runtime
    );

    if (!response.body?.data || response.body.data.length === 0) {
      console.log('未查询到日志数据');
      return;
    }

    console.log(`查询到 ${response.body.data.length} 条日志记录`);

    // 第一步：解析所有日志数据
    const parsedLogs: Array<{
      sessionId: string;
      worksId: string; // eventId 作为 works_id
      appId: string;
      distinctId?: string;
      ip?: string;
      ua?: string;
      province?: string;
      startTime: Date;
      endTime: Date;
      data: any;
      metadata: Record<string, any>;
    }> = [];

    for (const log of response.body.data) {
      try {
        // 解析日志数据（SLS 返回的是键值对数组）
        const logData: Record<string, any> = {};
        if (Array.isArray(log)) {
          log.forEach((item: any) => {
            if (item.key && item.value !== undefined) {
              logData[item.key] = item.value;
            }
          });
        } else if (typeof log === 'object') {
          Object.assign(logData, log);
        }

        // 提取字段
        const sessionId = logData.sessionId || logData.SessionId;
        const eventId = logData.eventId || logData.EventId; // eventId 才是 works_id
        const distinctId = logData.distinctID || logData.distinctId;
        const appId = logData.appId || logData.AppId;
        const ip = logData.ip;
        const ua = logData.ua;
        const province = logData.Province || logData.province;
        const endTime = logData.endTime || logData.end_time;
        const startTime = logData.startTime || logData.start_time;

        if (!sessionId || !eventId) {
          console.warn('跳过无效记录：缺少 sessionId 或 eventId', logData);
          continue;
        }

        // 排除 works_id 为 null 或包含 "T_" 的数据
        if (!eventId || eventId == 'null' || eventId.includes('T_')) {
          continue;
        }

        // 转换时间戳（秒）为 Date 对象
        const startTimeDate = startTime
          ? new Date(Number(startTime) * 1000)
          : new Date();
        const endTimeDate = endTime
          ? new Date(Number(endTime) * 1000)
          : new Date();

        // 构建 metadata
        const metadata: Record<string, any> = {};
        if (ip) metadata.ip = ip;
        if (ua) metadata.ua = ua;
        if (province) metadata.province = province;

        // 构建 data
        const data = {
          ...metadata,
        };

        parsedLogs.push({
          sessionId,
          worksId: eventId, // eventId 作为 works_id
          appId,
          distinctId,
          ip,
          ua,
          province,
          startTime: startTimeDate,
          endTime: endTimeDate,
          data,
          metadata,
        });
      } catch (error: any) {
        console.error('解析单条日志记录时出错:', error.message, log);
        continue;
      }
    }

    if (parsedLogs.length === 0) {
      console.log('没有有效的日志记录需要处理');
      return;
    }

    // 第二步：批量查询已存在的记录（分批200条）
    const existingRecordsMap = new Map<
      string,
      {
        id: string;
        end_time: Date;
        distinct_id: string | null;
        metadata: any;
      }
    >();

    const batchSize = 300;
    for (let i = 0; i < parsedLogs.length; i += batchSize) {
      const batch = parsedLogs.slice(i, i + batchSize);
      const sessionIds = batch.map(log => log.sessionId);

      try {
        const existingRecords = await prisma.slsWorksSessionEntity.findMany({
          where: {
            session_id: {
              in: sessionIds,
            },
          },
        });

        // 构建 Map，key 为 "sessionId|worksId"
        existingRecords.forEach(record => {
          const key = `${record.session_id}|${record.works_id}`;
          existingRecordsMap.set(key, {
            id: record.id,
            end_time: record.end_time,
            distinct_id: record.distinct_id,
            metadata: record.metadata,
          });
        });
      } catch (error: any) {
        console.error(
          `批量查询第 ${i / batchSize + 1} 批记录时出错:`,
          error.message
        );
      }
    }

    console.log(`预加载了 ${existingRecordsMap.size} 条已存在的记录`);

    // 第三步：准备更新和创建的数据
    const updateData: Array<{
      id: string;
      newEndTime: Date;
      distinctId?: string;
      data: any;
      metadata: any;
    }> = [];
    const createData: Array<{
      works_id: string;
      session_id: string;
      distinct_id: string | null;
      data: any;
      metadata: any;
      start_time: Date;
      end_time: Date;
    }> = [];

    for (const log of parsedLogs) {
      try {
        const key = `${log.sessionId}|${log.worksId}`; // eventId 作为 works_id
        const existing = existingRecordsMap.get(key);

        if (existing) {
          if (log.endTime > existing.end_time) {
            // 如果存在，更新 end_time，但不能小于原有数据
            const newEndTime =
              log.endTime > existing.end_time ? log.endTime : existing.end_time;

            updateData.push({
              id: existing.id,
              newEndTime,
              distinctId: log.distinctId,
              data: log.data,
              metadata:
                Object.keys(log.metadata).length > 0
                  ? (log.metadata as any)
                  : (existing.metadata as any),
            });
          }
        } else {
          // 如果不存在，创建新记录
          createData.push({
            works_id: log.worksId, // eventId 作为 works_id
            session_id: log.sessionId,
            distinct_id: log.distinctId || null,
            data: log.data,
            metadata:
              Object.keys(log.metadata).length > 0
                ? (log.metadata as any)
                : undefined,
            start_time: log.startTime,
            end_time: log.endTime,
          });
        }
      } catch (error: any) {
        console.error('处理单条日志记录时出错:', error.message, log);
        continue;
      }
    }

    // 分批执行更新操作（每批最多 20 条）
    const updateBatchSize = 20;
    let updateCount = 0;
    for (let i = 0; i < updateData.length; i += updateBatchSize) {
      const batch = updateData.slice(i, i + updateBatchSize);
      try {
        await Promise.all(
          batch.map(item =>
            prisma.slsWorksSessionEntity.update({
              where: {
                id: item.id,
              },
              data: {
                end_time: item.newEndTime,
                distinct_id: item.distinctId || undefined,
                data: item.data,
                metadata: item.metadata,
                update_time: new Date(),
              },
            })
          )
        );
        updateCount += batch.length;
      } catch (error: any) {
        console.error(
          `批量更新第 ${Math.floor(i / updateBatchSize) + 1} 批记录时出错:`,
          error.message
        );
      }
    }

    if (updateCount > 0) {
      console.log(`更新了 ${updateCount} 条记录`);
    }

    // 分批执行创建操作（每批最多 200 条）
    const createBatchSize = 200;
    let createCount = 0;
    for (let i = 0; i < createData.length; i += createBatchSize) {
      const batch = createData.slice(i, i + createBatchSize);
      try {
        await prisma.slsWorksSessionEntity.createMany({
          data: batch.map(item => ({
            works_id: item.works_id,
            session_id: item.session_id,
            distinct_id: item.distinct_id,
            data: item.data,
            metadata: item.metadata,
            start_time: item.start_time,
            end_time: item.end_time,
          })),
        });
        createCount += batch.length;
      } catch (error: any) {
        console.error(
          `批量创建第 ${Math.floor(i / createBatchSize) + 1} 批记录时出错:`,
          error.message
        );
      }
    }

    if (createCount > 0) {
      console.log(`创建了 ${createCount} 条新记录`);
    }

    console.log('数据更新完成');
  } catch (error: any) {
    console.error('查询 SLS 日志失败:', error.message);
    if (error.data?.['Recommend']) {
      console.error('诊断地址:', error.data['Recommend']);
    }
    throw error;
  }
};

export { dealSls };
