//这是个补量回传的脚本，之前因为某些原因，导致补量回传请求失败，现在要根据日志补上

import * as fs from 'fs';
import * as path from 'path';
import { closeAllConnections, getMakaplatv4DB } from '../../../service/db-connections';

// 第一步：读取csv文件，文件名称为buliang_request_log.csv，参数在W列
// 数据例子：handleRegisterConversion: {"uid":605642791,"appid":"jiantie","conversionTime":1769069613000,"oaid":"","imei":"","idfa":"","idfv":"","androidid":"dbd4a0148af0528b","deviceid":"","bundleid":"im.maka.jiantie","device":"android","ip":"175.0.226.179","caid":""}
// 提取uid，appid，conversionTime，oaid，androidid,idfa,imei,idfv,bundleid,device,ip,caid参数
// 只保留appid为：jiantie的数据

// 第二步：检查是不是已经完成过归因
// 检查方法为：查询makaplatv4.promotion_event_conversions,看看conversion_type为reg的记录，看看有没有这个uid的数据

// 第三步：如果已经完成过归因，则跳过
// 第四步：如果未完成过归因，进行模拟归因，方法为：makaplatv4.promotion_events,device为android的匹配androidid或者oaid，ios的匹配idfv或者idfa

//第五步：输出模拟匹配结果

//第六步，构造请求，请求地址为：http://127.0.0.1:3000/v1/conversion/register，请求参数为：看readme

interface RegisterConversionRequest {
  appid?: string;
  uid?: number;
  imei?: string;
  idfa?: string;
  oaid?: string;
  caid?: string;
  androidid?: string;
  idfv?: string;
  device?: string;
  bundleid?: string;
  deviceid?: string;
  ip?: string;
  conversionTime: number;
  douyinH5Clickid?: string;
  baiduLogidUrl?: string;
}

interface RequestResult {
  success: boolean;
  match: AttributionMatch;
  error?: string;
  statusCode?: number;
}

interface ConversionData {
  uid: number;
  appid: string;
  conversionTime: number;
  oaid: string;
  imei: string;
  idfa: string;
  idfv: string;
  androidid: string;
  deviceid: string;
  bundleid: string;
  device: string;
  ip: string;
  caid: string;
}

/**
 * 解析 CSV 行，提取 message 列（W列，第23列）
 * 使用正则表达式匹配 CSV 格式
 */
function parseCsvLine(line: string): string | null {
  // CSV 格式：用引号包裹的字段，字段之间用逗号分隔
  // 需要找到 message 列（第23列，索引22）
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的引号（CSV 中用 "" 表示单个 "）
        currentField += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段结束
      fields.push(currentField);
      currentField = '';
      // 如果已经找到 message 列，可以提前退出
      if (fields.length === 23) {
        return fields[22];
      }
    } else {
      currentField += char;
    }
  }
  // 添加最后一个字段
  if (currentField) {
    fields.push(currentField);
  }

  // message 列是第23列（索引22）
  if (fields.length > 22) {
    return fields[22] || null;
  }
  return null;
}

/**
 * 从 message 字符串中提取 JSON 数据
 */
function extractJsonFromMessage(message: string): ConversionData | null {
  // 格式：handleRegisterConversion: {"uid":605642791,...}
  // 或者：handleRegisterConversion: {""uid"":605642791,...} (CSV 转义格式)
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) {
    return null;
  }

  const jsonStr = message.substring(jsonStart);
  try {
    // 处理双引号转义（CSV 中的 "" 表示单个 "）
    // 但需要小心，因为 JSON 字符串值中也可能包含转义的引号
    // 先尝试直接解析
    let data: ConversionData;
    try {
      data = JSON.parse(jsonStr) as ConversionData;
    } catch {
      // 如果直接解析失败，尝试处理转义的引号
      const normalizedJson = jsonStr.replace(/""/g, '"');
      data = JSON.parse(normalizedJson) as ConversionData;
    }
    return data;
  } catch (error) {
    // 只在调试时输出错误，避免日志过多
    if (process.env.DEBUG) {
      console.error('解析 JSON 失败:', error, '原始字符串:', jsonStr.substring(0, 100));
    }
    return null;
  }
}

/**
 * 读取并解析 CSV 文件
 */
function readAndParseCsv(filePath: string): ConversionData[] {
  console.log(`开始读取 CSV 文件: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  console.log(`CSV 文件总行数: ${lines.length}`);

  const results: ConversionData[] = [];
  let skippedCount = 0;
  let parseErrorCount = 0;

  // 跳过表头（第1行）reg_buliang_request_log.csv
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

    const message = parseCsvLine(line);
    if (!message) {
      skippedCount++;
      continue;
    }

    const data = extractJsonFromMessage(message);
    if (!data) {
      parseErrorCount++;
      continue;
    }

    // 只保留 appid 为 "jiantie" 且 device 不为 "mini_program" 的数据
    if (data.device !== 'mini_program') {
      results.push(data);
    } else {
      skippedCount++;
    }
  }

  console.log(`解析完成:`);
  console.log(`  - 有效数据（device!=mini_program）: ${results.length} 条`);
  console.log(`  - 跳过/错误: ${skippedCount + parseErrorCount} 条`);

  return results;
}

/**
 * 批量检查哪些 uid 已经完成过归因
 * @returns 已归因的 uid 集合
 */
async function batchCheckAttributionExists(
  db: ReturnType<typeof getMakaplatv4DB>,
  uids: number[]
): Promise<Set<number>> {
  if (uids.length === 0) {
    return new Set();
  }

  // 去重
  const uniqueUids = Array.from(new Set(uids));

  // 批量查询，MySQL 的 whereIn 可以处理大量数据，但为了安全，可以分批查询
  const batchSize = 1000;
  const attributedUids = new Set<number>();
  const totalBatches = Math.ceil(uniqueUids.length / batchSize);

  for (let i = 0; i < uniqueUids.length; i += batchSize) {
    const batch = uniqueUids.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;

    const results = await db('promotion_event_conversions')
      .whereIn('uid', batch)
      .where('conversion_type', 'reg')
      .select('uid')
      .distinct();

    for (const row of results) {
      attributedUids.add(row.uid);
    }

    if (totalBatches > 1) {
      console.log(`  批量查询进度: ${batchIndex}/${totalBatches} (${batch.length} 个 uid)`);
    }
  }

  return attributedUids;
}

interface AttributionMatch {
  conversionData: ConversionData;
  matchedEventId: number | null;
  matchedChannel: string | null;
  matchType: string | null; // 'androidid' | 'oaid' | 'idfv' | 'idfa' | null
}

/**
 * 模拟归因：根据设备ID匹配 promotion_events
 */
async function simulateAttribution(
  db: ReturnType<typeof getMakaplatv4DB>,
  conversionDataList: ConversionData[]
): Promise<AttributionMatch[]> {
  console.log('\n开始模拟归因...');
  const matches: AttributionMatch[] = [];

  // 按设备类型分组处理
  const androidData = conversionDataList.filter(d => d.device === 'android');
  const iosData = conversionDataList.filter(d => d.device === 'ios');

  console.log(`  - Android 设备: ${androidData.length} 条`);
  console.log(`  - iOS 设备: ${iosData.length} 条`);

  // 处理 Android 设备
  if (androidData.length > 0) {
    // 收集所有有效的 androidid 和 oaid
    const androidIds = new Set<string>();
    const oaids = new Set<string>();

    for (const data of androidData) {
      if (data.androidid) {
        androidIds.add(data.androidid);
      }
      if (data.oaid) {
        oaids.add(data.oaid);
      }
    }

    console.log(`  正在匹配 Android 设备 (${androidIds.size} 个 androidid, ${oaids.size} 个 oaid)...`);

    // 批量查询匹配的 promotion_events
    const batchSize = 1000;
    const eventMap = new Map<string, { id: number; channel: string | null }>();

    // 匹配 androidid
    if (androidIds.size > 0) {
      const androidIdArray = Array.from(androidIds);
      for (let i = 0; i < androidIdArray.length; i += batchSize) {
        const batch = androidIdArray.slice(i, i + batchSize);
        const results = await db('promotion_events')
          .whereIn('androidid', batch)
          .where('androidid', '!=', '') // 排除空值
          .select('id', 'channel', 'androidid', 'event_time')
          .orderBy('event_time', 'desc'); // 按时间倒序，优先选择最近的事件

        for (const row of results) {
          const key = `androidid:${row.androidid}`;
          // 如果已存在，保留时间更近的
          if (!eventMap.has(key)) {
            eventMap.set(key, { id: row.id, channel: row.channel || null });
          }
        }
      }
    }

    // 匹配 oaid
    if (oaids.size > 0) {
      const oaidArray = Array.from(oaids);
      for (let i = 0; i < oaidArray.length; i += batchSize) {
        const batch = oaidArray.slice(i, i + batchSize);
        const results = await db('promotion_events')
          .whereIn('oaid', batch)
          .where('oaid', '!=', '') // 排除空值
          .select('id', 'channel', 'oaid', 'event_time')
          .orderBy('event_time', 'desc'); // 按时间倒序，优先选择最近的事件

        for (const row of results) {
          const key = `oaid:${row.oaid}`;
          // 如果已存在，保留时间更近的
          if (!eventMap.has(key)) {
            eventMap.set(key, { id: row.id, channel: row.channel || null });
          }
        }
      }
    }

    // 为每个 Android 数据查找匹配
    for (const data of androidData) {
      let matched: { id: number; channel: string | null } | null = null;
      let matchType: string | null = null;

      // 优先匹配 androidid
      if (data.androidid) {
        const key = `androidid:${data.androidid}`;
        matched = eventMap.get(key) || null;
        if (matched) {
          matchType = 'androidid';
        }
      }

      // 如果 androidid 没匹配到，尝试 oaid
      if (!matched && data.oaid) {
        const key = `oaid:${data.oaid}`;
        matched = eventMap.get(key) || null;
        if (matched) {
          matchType = 'oaid';
        }
      }

      matches.push({
        conversionData: data,
        matchedEventId: matched?.id || null,
        matchedChannel: matched?.channel || null,
        matchType,
      });
    }
  }

  // 处理 iOS 设备
  if (iosData.length > 0) {
    // 收集所有有效的 idfv 和 idfa
    const idfvs = new Set<string>();
    const idfas = new Set<string>();

    for (const data of iosData) {
      if (data.idfv) {
        idfvs.add(data.idfv);
      }
      if (data.idfa) {
        idfas.add(data.idfa);
      }
    }

    console.log(`  正在匹配 iOS 设备 (${idfvs.size} 个 idfv, ${idfas.size} 个 idfa)...`);

    // 批量查询匹配的 promotion_events
    const batchSize = 1000;
    const eventMap = new Map<string, { id: number; channel: string | null }>();

    // 匹配 idfv
    if (idfvs.size > 0) {
      const idfvArray = Array.from(idfvs);
      for (let i = 0; i < idfvArray.length; i += batchSize) {
        const batch = idfvArray.slice(i, i + batchSize);
        const results = await db('promotion_events')
          .whereIn('idfv', batch)
          .where('idfv', '!=', '') // 排除空值
          .select('id', 'channel', 'idfv', 'event_time')
          .orderBy('event_time', 'desc'); // 按时间倒序，优先选择最近的事件

        for (const row of results) {
          const key = `idfv:${row.idfv}`;
          // 如果已存在，保留时间更近的
          if (!eventMap.has(key)) {
            eventMap.set(key, { id: row.id, channel: row.channel || null });
          }
        }
      }
    }

    // 匹配 idfa
    if (idfas.size > 0) {
      const idfaArray = Array.from(idfas);
      for (let i = 0; i < idfaArray.length; i += batchSize) {
        const batch = idfaArray.slice(i, i + batchSize);
        const results = await db('promotion_events')
          .whereIn('idfa', batch)
          .where('idfa', '!=', '') // 排除空值
          .select('id', 'channel', 'idfa', 'event_time')
          .orderBy('event_time', 'desc'); // 按时间倒序，优先选择最近的事件

        for (const row of results) {
          const key = `idfa:${row.idfa}`;
          // 如果已存在，保留时间更近的
          if (!eventMap.has(key)) {
            eventMap.set(key, { id: row.id, channel: row.channel || null });
          }
        }
      }
    }

    // 为每个 iOS 数据查找匹配
    for (const data of iosData) {
      let matched: { id: number; channel: string | null } | null = null;
      let matchType: string | null = null;

      // 优先匹配 idfv
      if (data.idfv) {
        const key = `idfv:${data.idfv}`;
        matched = eventMap.get(key) || null;
        if (matched) {
          matchType = 'idfv';
        }
      }

      // 如果 idfv 没匹配到，尝试 idfa
      if (!matched && data.idfa) {
        const key = `idfa:${data.idfa}`;
        matched = eventMap.get(key) || null;
        if (matched) {
          matchType = 'idfa';
        }
      }

      matches.push({
        conversionData: data,
        matchedEventId: matched?.id || null,
        matchedChannel: matched?.channel || null,
        matchType,
      });
    }
  }

  const matchedCount = matches.filter(m => m.matchedEventId !== null).length;
  console.log(`模拟归因完成: ${matchedCount}/${matches.length} 条数据匹配成功`);

  return matches;
}

/**
 * 构造注册转化请求体
 */
function buildRegisterConversionRequest(data: ConversionData): RegisterConversionRequest {
  const request: RegisterConversionRequest = {
    conversionTime: data.conversionTime, // 必填字段
  };

  // 只添加非空字段
  if (data.appid) request.appid = data.appid;
  if (data.uid) request.uid = data.uid;
  if (data.imei) request.imei = data.imei;
  if (data.idfa) request.idfa = data.idfa;
  if (data.oaid) request.oaid = data.oaid;
  if (data.caid) request.caid = data.caid;
  if (data.androidid) request.androidid = data.androidid;
  if (data.idfv) request.idfv = data.idfv;
  if (data.device) request.device = data.device;
  if (data.bundleid) request.bundleid = data.bundleid;
  if (data.deviceid) request.deviceid = data.deviceid;
  if (data.ip) request.ip = data.ip;

  return request;
}

/**
 * 发送注册转化请求
 */
async function sendRegisterConversionRequest(
  url: string,
  request: RegisterConversionRequest,
  retries = 3
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        return { success: true, statusCode: response.status };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        if (attempt === retries) {
          return {
            success: false,
            statusCode: response.status,
            error: errorText,
          };
        }
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * 逐条发送注册转化请求
 */
async function sendRegisterConversionRequests(url: string, matchedList: AttributionMatch[]): Promise<RequestResult[]> {
  console.log(`\n开始发送注册转化请求...`);
  console.log(`  - 总请求数: ${matchedList.length}`);
  console.log(`  - 请求地址: ${url}`);

  const results: RequestResult[] = [];
  let successCount = 0;
  let failCount = 0;

  // 逐条发送请求
  for (let i = 0; i < matchedList.length; i++) {
    const match = matchedList[i];
    const request = buildRegisterConversionRequest(match.conversionData);

    const result = await sendRegisterConversionRequest(url, request);

    const requestResult: RequestResult = {
      success: result.success,
      match,
      error: result.error,
      statusCode: result.statusCode,
    };

    results.push(requestResult);

    if (result.success) {
      successCount++;
      console.log(`  [${i + 1}/${matchedList.length}] ✓ UID: ${match.conversionData.uid} - 请求成功`);
    } else {
      failCount++;
      console.log(
        `  [${i + 1}/${matchedList.length}] ✗ UID: ${match.conversionData.uid} - 请求失败: ${result.error || 'Unknown error'}`
      );
    }

    // 避免请求过快，添加小延迟
    if (i < matchedList.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n请求发送完成:`);
  console.log(`  - 成功: ${successCount} 条`);
  console.log(`  - 失败: ${failCount} 条`);

  return results;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 1. 读取 CSV 文件
    const csvPath = path.join(__dirname, 'reg_buliang_request_log.csv');
    const conversionDataList = readAndParseCsv(csvPath);

    if (conversionDataList.length === 0) {
      console.log('没有找到有效数据，退出');
      return;
    }

    // 2. 连接数据库
    const db = getMakaplatv4DB();
    console.log('\n开始检查归因状态...');

    // 3. 收集所有 uid（去重）
    const allUids = conversionDataList.map(data => data.uid);
    const uniqueUids = Array.from(new Set(allUids));
    console.log(`共需要检查 ${conversionDataList.length} 条数据，${uniqueUids.length} 个不同的 uid`);

    // 4. 批量查询已归因的 uid
    console.log('正在批量查询数据库...');
    const attributedUids = await batchCheckAttributionExists(db, uniqueUids);
    console.log(`批量查询完成，已归因的 uid 数量: ${attributedUids.size}`);

    // 5. 遍历数据列表，分类统计
    let alreadyAttributedCount = 0;
    let needAttributionCount = 0;
    const needAttributionList: ConversionData[] = [];

    for (const data of conversionDataList) {
      if (attributedUids.has(data.uid)) {
        alreadyAttributedCount++;
      } else {
        needAttributionCount++;
        needAttributionList.push(data);
      }
    }

    console.log('\n检查完成:');
    console.log(`  - 已归因: ${alreadyAttributedCount} 条`);
    console.log(`  - 待归因: ${needAttributionCount} 条`);

    // 6. 对未归因的数据进行模拟归因
    if (needAttributionList.length > 0) {
      const attributionMatches = await simulateAttribution(db, needAttributionList);

      // 7. 输出模拟匹配结果
      const matchedList = attributionMatches.filter(m => m.matchedEventId !== null);
      const unmatchedList = attributionMatches.filter(m => m.matchedEventId === null);

      console.log('\n模拟归因结果统计:');
      console.log(`  - 匹配成功: ${matchedList.length} 条`);
      console.log(`  - 匹配失败: ${unmatchedList.length} 条`);

      // 按渠道统计匹配结果
      const channelStats = new Map<string, number>();
      for (const match of matchedList) {
        const channel = match.matchedChannel || 'unknown';
        channelStats.set(channel, (channelStats.get(channel) || 0) + 1);
      }

      if (channelStats.size > 0) {
        console.log('\n按渠道统计:');
        const sortedChannels = Array.from(channelStats.entries()).sort((a, b) => b[1] - a[1]);
        for (const [channel, count] of sortedChannels) {
          console.log(`  - ${channel}: ${count} 条`);
        }
      }

      // 输出匹配成功的数据（前10条）
      if (matchedList.length > 0) {
        console.log('\n匹配成功的数据（前10条）:');
        matchedList.slice(0, 10).forEach((match, index) => {
          const data = match.conversionData;
          console.log(
            `  ${index + 1}. UID: ${data.uid}, 设备: ${data.device}, 匹配类型: ${match.matchType}, 事件ID: ${match.matchedEventId}, 渠道: ${match.matchedChannel || 'unknown'}`
          );
        });
        if (matchedList.length > 10) {
          console.log(`  ... 还有 ${matchedList.length - 10} 条匹配成功的数据`);
        }
      }

      // 输出匹配失败的数据（前10条）
      if (unmatchedList.length > 0) {
        console.log('\n匹配失败的数据（前10条）:');
        unmatchedList.slice(0, 10).forEach((match, index) => {
          const data = match.conversionData;
          console.log(
            `  ${index + 1}. UID: ${data.uid}, 设备: ${data.device}, AndroidID: ${data.androidid || 'N/A'}, OAID: ${data.oaid || 'N/A'}, IDFV: ${data.idfv || 'N/A'}, IDFA: ${data.idfa || 'N/A'}`
          );
        });
        if (unmatchedList.length > 10) {
          console.log(`  ... 还有 ${unmatchedList.length - 10} 条匹配失败的数据`);
        }
      }

      // 8. 对所有待归因的数据发送注册转化请求（模拟结果不影响请求发送）
      if (attributionMatches.length > 0) {
        const requestUrl = 'http://127.0.0.1:3000/v1/conversion/register';
        const requestResults = await sendRegisterConversionRequests(requestUrl, attributionMatches);

        // 统计请求结果
        const requestSuccessList = requestResults.filter(r => r.success);
        const requestFailList = requestResults.filter(r => !r.success);

        console.log('\n请求结果统计:');
        console.log(`  - 请求成功: ${requestSuccessList.length} 条`);
        console.log(`  - 请求失败: ${requestFailList.length} 条`);

        // 输出请求失败的数据（前10条）
        if (requestFailList.length > 0) {
          console.log('\n请求失败的数据（前10条）:');
          requestFailList.slice(0, 10).forEach((result, index) => {
            const data = result.match.conversionData;
            console.log(
              `  ${index + 1}. UID: ${data.uid}, 状态码: ${result.statusCode || 'N/A'}, 错误: ${result.error || 'Unknown'}`
            );
          });
          if (requestFailList.length > 10) {
            console.log(`  ... 还有 ${requestFailList.length - 10} 条请求失败的数据`);
          }
        }
      }
    } else {
      console.log('\n所有数据都已归因，无需处理');
    }
  } catch (error) {
    console.error('脚本执行失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await closeAllConnections();
    console.log('\n数据库连接已关闭');
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('脚本执行异常:', error);
      process.exit(1);
    });
}

export { main };
