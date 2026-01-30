import * as fs from 'fs';
import * as path from 'path';
import { closeAllConnections, getMakaplatv4DB } from '../../../service/db-connections';

// 第一步：读取csv文件，文件名称为active.csv，参数在W列
// 数据例子：handleActiveConversion: {"conversionTime":1769132542800,"idfa":"","imei":"","oaid":"","idfv":"","androidid":"b9a5874b449298d8","bundleid":"im.maka.jiantie","device":"android","appid":"jiantie","ip":"222.244.209.76","caid":""}
// 提取appid，conversionTime，oaid，androidid,idfa,imei,idfv,bundleid,device,ip,caid参数

// 第二步：检查是不是已经完成过归因
// 检查方法为：查询makaplatv4.promotion_event_conversions,看看conversion_type为active的记录，idfa、idfv、androidid、oaid任何一个匹配的

// 第三步：如果已经完成过归因，则跳过
// 第四步：输出统计结果

//第五步：进行模拟归因，从方法为：makaplatv4.promotion_events（不要管appid）,device为android的匹配androidid或者oaid，ios的匹配idfv或者idfa

//第六步，构造请求，请求地址为：http://127.0.0.1:3000/v1/conversion/active

interface ActiveConversionRequest {
  appid?: string;
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
  asaToken?: string;
  gclid?: string;
}

interface RequestResult {
  success: boolean;
  match: AttributionMatch;
  error?: string;
  statusCode?: number;
}

interface ConversionData {
  appid?: string;
  conversionTime: number;
  oaid?: string;
  imei?: string;
  idfa?: string;
  idfv?: string;
  androidid?: string;
  bundleid?: string;
  device?: string;
  ip?: string;
  caid?: string;
  asaToken?: string;
  gclid?: string;
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
  // 格式：handleActiveConversion: {"conversionTime":1769132542800,...}
  // 或者：handleActiveConversion: {""conversionTime"":1769132542800,...} (CSV 转义格式)
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

  // 跳过表头（第1行）
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

    results.push(data);
  }

  console.log(`解析完成:`);
  console.log(`  - 有效数据: ${results.length} 条`);
  console.log(`  - 跳过: ${skippedCount} 条`);
  console.log(`  - 错误数据: ${parseErrorCount} 条`);

  return results;
}

/**
 * 批量检查哪些设备ID已经完成过归因
 * 通过 idfa、idfv、androidid、oaid 匹配 conversion_type='active' 的记录
 * @returns 已归因的设备ID集合（格式：deviceType:deviceId）
 */
async function batchCheckAttributionExists(
  db: ReturnType<typeof getMakaplatv4DB>,
  conversionDataList: ConversionData[]
): Promise<Set<string>> {
  if (conversionDataList.length === 0) {
    return new Set();
  }

  // 收集所有需要检查的设备ID
  const androidIds = new Set<string>();
  const oaids = new Set<string>();
  const idfvs = new Set<string>();
  const idfas = new Set<string>();

  for (const data of conversionDataList) {
    if (data.androidid) {
      androidIds.add(data.androidid);
    }
    if (data.oaid) {
      oaids.add(data.oaid);
    }
    if (data.idfv) {
      idfvs.add(data.idfv);
    }
    if (data.idfa) {
      idfas.add(data.idfa);
    }
  }

  const attributedDeviceIds = new Set<string>();

  // 批量查询 androidid
  if (androidIds.size > 0) {
    const batchSize = 1000;
    const androidIdArray = Array.from(androidIds);
    for (let i = 0; i < androidIdArray.length; i += batchSize) {
      const batch = androidIdArray.slice(i, i + batchSize);
      const results = await db('promotion_event_conversions')
        .whereIn('androidid', batch)
        .where('conversion_type', 'active')
        .where('androidid', '!=', '')
        .select('androidid')
        .distinct();

      for (const row of results) {
        attributedDeviceIds.add(`androidid:${row.androidid}`);
      }
    }
  }

  // 批量查询 oaid
  if (oaids.size > 0) {
    const batchSize = 1000;
    const oaidArray = Array.from(oaids);
    for (let i = 0; i < oaidArray.length; i += batchSize) {
      const batch = oaidArray.slice(i, i + batchSize);
      const results = await db('promotion_event_conversions')
        .whereIn('oaid', batch)
        .where('conversion_type', 'active')
        .where('oaid', '!=', '')
        .select('oaid')
        .distinct();

      for (const row of results) {
        attributedDeviceIds.add(`oaid:${row.oaid}`);
      }
    }
  }

  // 批量查询 idfv
  if (idfvs.size > 0) {
    const batchSize = 1000;
    const idfvArray = Array.from(idfvs);
    for (let i = 0; i < idfvArray.length; i += batchSize) {
      const batch = idfvArray.slice(i, i + batchSize);
      const results = await db('promotion_event_conversions')
        .whereIn('idfv', batch)
        .where('conversion_type', 'active')
        .where('idfv', '!=', '')
        .select('idfv')
        .distinct();

      for (const row of results) {
        attributedDeviceIds.add(`idfv:${row.idfv}`);
      }
    }
  }

  // 批量查询 idfa
  if (idfas.size > 0) {
    const batchSize = 1000;
    const idfaArray = Array.from(idfas);
    for (let i = 0; i < idfaArray.length; i += batchSize) {
      const batch = idfaArray.slice(i, i + batchSize);
      const results = await db('promotion_event_conversions')
        .whereIn('idfa', batch)
        .where('conversion_type', 'active')
        .where('idfa', '!=', '')
        .select('idfa')
        .distinct();

      for (const row of results) {
        attributedDeviceIds.add(`idfa:${row.idfa}`);
      }
    }
  }

  return attributedDeviceIds;
}

/**
 * 检查单个数据是否已完成归因
 */
function isAlreadyAttributed(data: ConversionData, attributedDeviceIds: Set<string>): boolean {
  if (data.androidid && attributedDeviceIds.has(`androidid:${data.androidid}`)) {
    return true;
  }
  if (data.oaid && attributedDeviceIds.has(`oaid:${data.oaid}`)) {
    return true;
  }
  if (data.idfv && attributedDeviceIds.has(`idfv:${data.idfv}`)) {
    return true;
  }
  if (data.idfa && attributedDeviceIds.has(`idfa:${data.idfa}`)) {
    return true;
  }
  return false;
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
 * 构造激活转化请求体
 */
function buildActiveConversionRequest(data: ConversionData): ActiveConversionRequest {
  const request: ActiveConversionRequest = {
    conversionTime: data.conversionTime,
  };

  if (data.appid) request.appid = data.appid;
  if (data.imei) request.imei = data.imei;
  if (data.idfa) request.idfa = data.idfa;
  if (data.oaid) request.oaid = data.oaid;
  if (data.caid) request.caid = data.caid;
  if (data.androidid) request.androidid = data.androidid;
  if (data.idfv) request.idfv = data.idfv;
  if (data.device) request.device = data.device;
  if (data.bundleid) request.bundleid = data.bundleid;
  if (data.ip) request.ip = data.ip;
  if (data.asaToken) request.asaToken = data.asaToken;
  if (data.gclid) request.gclid = data.gclid;

  return request;
}

/**
 * 发送单条激活转化请求
 */
async function sendActiveConversionRequest(
  url: string,
  request: ActiveConversionRequest,
  retries = 3
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      if (attempt === retries) {
        return { success: false, statusCode: response.status, error: errorText };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * 逐条发送激活转化请求
 */
async function sendActiveConversionRequests(url: string, matchedList: AttributionMatch[]): Promise<RequestResult[]> {
  console.log('\n开始发送激活转化请求...');
  console.log(`  - 总请求数: ${matchedList.length}`);
  console.log(`  - 请求地址: ${url}`);

  const results: RequestResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < matchedList.length; i++) {
    const match = matchedList[i];
    const request = buildActiveConversionRequest(match.conversionData);
    const result = await sendActiveConversionRequest(url, request);

    const requestResult: RequestResult = {
      success: result.success,
      match,
      error: result.error,
      statusCode: result.statusCode,
    };
    results.push(requestResult);

    if (result.success) {
      successCount++;
      const d = match.conversionData;
      console.log(
        `  [${i + 1}/${matchedList.length}] ✓ 设备: ${JSON.stringify(d)}, 匹配: ${match.matchType} - 请求成功`
      );
    } else {
      failCount++;
      const d = match.conversionData;
      console.log(
        `  [${i + 1}/${matchedList.length}] ✗ 设备: ${d.device}, 匹配: ${match.matchType} - 失败: ${result.error || 'Unknown'}`
      );
    }

    if (i < matchedList.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n请求发送完成:');
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
    const csvPath = path.join(__dirname, 'active.csv');
    const conversionDataList = readAndParseCsv(csvPath);

    if (conversionDataList.length === 0) {
      console.log('没有找到有效数据，退出');
      return;
    }

    // 2. 连接数据库
    const db = getMakaplatv4DB();
    console.log('\n开始检查归因状态...');

    // 3. 批量查询已归因的设备ID
    console.log('正在批量查询数据库...');
    const attributedDeviceIds = await batchCheckAttributionExists(db, conversionDataList);
    console.log(`批量查询完成，已归因的设备ID数量: ${attributedDeviceIds.size}`);

    // 4. 遍历数据列表，分类统计
    let alreadyAttributedCount = 0;
    let needAttributionCount = 0;
    const needAttributionList: ConversionData[] = [];

    for (const data of conversionDataList) {
      if (isAlreadyAttributed(data, attributedDeviceIds)) {
        alreadyAttributedCount++;
      } else {
        needAttributionCount++;
        needAttributionList.push(data);
      }
    }

    console.log('\n检查完成:');
    console.log(`  - 已归因: ${alreadyAttributedCount} 条`);
    console.log(`  - 待归因: ${needAttributionCount} 条`);

    // 5. 对未归因的数据进行模拟归因
    if (needAttributionList.length > 0) {
      const attributionMatches = await simulateAttribution(db, needAttributionList);

      // 6. 输出统计结果
      const matchedList = attributionMatches.filter(m => m.matchedEventId !== null);
      const unmatchedList = attributionMatches.filter(m => m.matchedEventId === null);

      console.log('\n=== 统计结果 ===');
      console.log(`总数据量: ${conversionDataList.length} 条`);
      console.log(`已归因: ${alreadyAttributedCount} 条`);
      console.log(`待归因: ${needAttributionCount} 条`);
      console.log(`模拟归因 - 匹配成功: ${matchedList.length} 条`);
      console.log(`模拟归因 - 匹配失败: ${unmatchedList.length} 条`);

      // 按渠道统计匹配结果
      const channelStats = new Map<string, number>();
      for (const match of matchedList) {
        const channel = match.matchedChannel || 'unknown';
        channelStats.set(channel, (channelStats.get(channel) || 0) + 1);
      }

      if (channelStats.size > 0) {
        console.log('\n按渠道统计（模拟归因匹配成功）:');
        const sortedChannels = Array.from(channelStats.entries()).sort((a, b) => b[1] - a[1]);
        for (const [channel, count] of sortedChannels) {
          console.log(`  - ${channel}: ${count} 条`);
        }
      }

      // 按匹配类型统计
      const matchTypeStats = new Map<string, number>();
      for (const match of matchedList) {
        const matchType = match.matchType || 'unknown';
        matchTypeStats.set(matchType, (matchTypeStats.get(matchType) || 0) + 1);
      }

      if (matchTypeStats.size > 0) {
        console.log('\n按匹配类型统计:');
        for (const [matchType, count] of Array.from(matchTypeStats.entries()).sort((a, b) => b[1] - a[1])) {
          console.log(`  - ${matchType}: ${count} 条`);
        }
      }

      // 输出匹配成功的数据（前10条）
      if (matchedList.length > 0) {
        console.log('\n匹配成功的数据（前10条）:');
        matchedList.slice(0, 10).forEach((match, index) => {
          const data = match.conversionData;
          console.log(
            `  ${index + 1}. 设备: ${data.device}, 匹配类型: ${match.matchType}, 事件ID: ${match.matchedEventId}, 渠道: ${match.matchedChannel || 'unknown'}, AndroidID: ${data.androidid || 'N/A'}, OAID: ${data.oaid || 'N/A'}, IDFV: ${data.idfv || 'N/A'}, IDFA: ${data.idfa || 'N/A'}`
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
            `  ${index + 1}. data: ${JSON.stringify(data)}, AndroidID: ${data.androidid || 'N/A'}, OAID: ${data.oaid || 'N/A'}, IDFV: ${data.idfv || 'N/A'}, IDFA: ${data.idfa || 'N/A'}`
          );
        });
        if (unmatchedList.length > 10) {
          console.log(`  ... 还有 ${unmatchedList.length - 10} 条匹配失败的数据`);
        }
      }

      // 第六步：对所有待归因的数据发送激活转化请求（模拟结果不影响数据发送）
      if (needAttributionList.length > 0) {
        // 将所有待归因的数据转换为 AttributionMatch 格式（匹配信息仅用于统计，不影响发送）
        const allAttributionMatches: AttributionMatch[] = needAttributionList.map(data => ({
          conversionData: data,
          matchedEventId: null,
          matchedChannel: null,
          matchType: null,
        }));

        const requestUrl = 'http://127.0.0.1:3000/v1/conversion/active';
        const requestResults = await sendActiveConversionRequests(requestUrl, allAttributionMatches);

        const requestSuccessList = requestResults.filter(r => r.success);
        const requestFailList = requestResults.filter(r => !r.success);

        console.log('\n请求结果统计:');
        console.log(`  - 成功: ${requestSuccessList.length} 条`);
        console.log(`  - 失败: ${requestFailList.length} 条`);

        if (requestFailList.length > 0) {
          console.log('\n请求失败的数据（前10条）:');
          requestFailList.slice(0, 10).forEach((result, index) => {
            const data = result.match.conversionData;
            console.log(
              `  ${index + 1}. 设备: ${data.device}, 状态码: ${result.statusCode ?? 'N/A'}, 错误: ${result.error ?? 'Unknown'}`
            );
          });
          if (requestFailList.length > 10) {
            console.log(`  ... 还有 ${requestFailList.length - 10} 条请求失败`);
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
