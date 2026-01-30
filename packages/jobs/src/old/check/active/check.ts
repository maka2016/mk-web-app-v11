// 读取active事件
// 读取promotion_events里面2026年的channel为xiaohongshu的事件
// 根据idfa、oaid、androidid、idfa_md5、oaid_md5 分布进行匹配
// 输出匹配结果

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { closeAllConnections, getMakaplatv4DB } from '../../../service/db-connections';

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

interface PromotionEvent {
  id: number;
  channel: string;
  androidid?: string;
  oaid?: string;
  idfa?: string;
  idfv?: string;
  androidid_md5?: string;
  oaid_md5?: string;
  idfa_md5?: string;
  event_time: Date;
}

interface MatchResult {
  conversionData: ConversionData;
  matchedEvent: PromotionEvent | null;
  matchType: string | null; // 'androidid' | 'oaid' | 'idfa' | 'androidid_md5' | 'oaid_md5' | 'idfa_md5' | null
}

/**
 * 计算 MD5 哈希值
 */
function md5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex').toLowerCase();
}

/**
 * 解析 CSV 行，提取 message 列（W列，第23列）
 */
function parseCsvLine(line: string): string | null {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
      if (fields.length === 23) {
        return fields[22];
      }
    } else {
      currentField += char;
    }
  }

  if (currentField) {
    fields.push(currentField);
  }

  if (fields.length > 22) {
    return fields[22] || null;
  }
  return null;
}

/**
 * 从 message 字符串中提取 JSON 数据
 */
function extractJsonFromMessage(message: string): ConversionData | null {
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) {
    return null;
  }

  const jsonStr = message.substring(jsonStart);
  try {
    let data: ConversionData;
    try {
      data = JSON.parse(jsonStr) as ConversionData;
    } catch {
      const normalizedJson = jsonStr.replace(/""/g, '"');
      data = JSON.parse(normalizedJson) as ConversionData;
    }
    return data;
  } catch (error) {
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
 * 查询 2026 年小红书渠道的 promotion_events
 */
async function fetchXiaohongshuEvents(db: ReturnType<typeof getMakaplatv4DB>): Promise<PromotionEvent[]> {
  console.log('\n开始查询小红书渠道事件...');

  const events = await db('promotion_events')
    .where('channel', 'xiaohongshu')
    .where('event_time', '>=', '2026-01-01 00:00:00')
    .where('event_time', '<', '2027-01-01 00:00:00')
    .select(
      'id',
      'channel',
      'androidid',
      'oaid',
      'idfa',
      'idfv',
      'androidid_md5',
      'oaid_md5',
      'idfa_md5',
      'event_time'
    );

  console.log(`查询完成: ${events.length} 条小红书事件`);
  return events;
}

/**
 * 执行匹配分析
 */
function performMatching(conversionDataList: ConversionData[], xiaohongshuEvents: PromotionEvent[]): MatchResult[] {
  console.log('\n开始匹配分析...');

  // 为小红书事件建立索引，便于快速查找
  const eventIndexes = {
    androidid: new Map<string, PromotionEvent>(),
    oaid: new Map<string, PromotionEvent>(),
    idfa: new Map<string, PromotionEvent>(),
    androidid_md5: new Map<string, PromotionEvent>(),
    oaid_md5: new Map<string, PromotionEvent>(),
    idfa_md5: new Map<string, PromotionEvent>(),
  };

  // 建立索引
  for (const event of xiaohongshuEvents) {
    if (event.androidid) {
      eventIndexes.androidid.set(event.androidid.toLowerCase(), event);
    }
    if (event.oaid) {
      eventIndexes.oaid.set(event.oaid.toLowerCase(), event);
    }
    if (event.idfa) {
      eventIndexes.idfa.set(event.idfa.toLowerCase(), event);
    }
    if (event.androidid_md5) {
      eventIndexes.androidid_md5.set(event.androidid_md5.toLowerCase(), event);
    }
    if (event.oaid_md5) {
      eventIndexes.oaid_md5.set(event.oaid_md5.toLowerCase(), event);
    }
    if (event.idfa_md5) {
      eventIndexes.idfa_md5.set(event.idfa_md5.toLowerCase(), event);
    }
  }

  console.log('索引统计:');
  console.log(`  - androidid: ${eventIndexes.androidid.size} 条`);
  console.log(`  - oaid: ${eventIndexes.oaid.size} 条`);
  console.log(`  - idfa: ${eventIndexes.idfa.size} 条`);
  console.log(`  - androidid_md5: ${eventIndexes.androidid_md5.size} 条`);
  console.log(`  - oaid_md5: ${eventIndexes.oaid_md5.size} 条`);
  console.log(`  - idfa_md5: ${eventIndexes.idfa_md5.size} 条`);

  const results: MatchResult[] = [];

  for (const data of conversionDataList) {
    let matchedEvent: PromotionEvent | null = null;
    let matchType: string | null = null;

    // 按优先级进行匹配
    // 1. 先尝试直接匹配
    if (!matchedEvent && data.androidid) {
      matchedEvent = eventIndexes.androidid.get(data.androidid.toLowerCase()) || null;
      if (matchedEvent) matchType = 'androidid';
    }

    if (!matchedEvent && data.oaid) {
      matchedEvent = eventIndexes.oaid.get(data.oaid.toLowerCase()) || null;
      if (matchedEvent) matchType = 'oaid';
    }

    if (!matchedEvent && data.idfa) {
      matchedEvent = eventIndexes.idfa.get(data.idfa.toLowerCase()) || null;
      if (matchedEvent) matchType = 'idfa';
    }

    // 2. 尝试 MD5 匹配
    if (!matchedEvent && data.androidid) {
      const androididMd5 = md5(data.androidid.toLowerCase());
      matchedEvent = eventIndexes.androidid_md5.get(androididMd5) || null;
      if (matchedEvent) matchType = 'androidid_md5';
    }

    if (!matchedEvent && data.oaid) {
      const oaidMd5 = md5(data.oaid.toLowerCase());
      matchedEvent = eventIndexes.oaid_md5.get(oaidMd5) || null;
      if (matchedEvent) matchType = 'oaid_md5';
    }

    if (!matchedEvent && data.idfa) {
      const idfaMd5 = md5(data.idfa.toLowerCase());
      matchedEvent = eventIndexes.idfa_md5.get(idfaMd5) || null;
      if (matchedEvent) matchType = 'idfa_md5';
    }

    results.push({
      conversionData: data,
      matchedEvent,
      matchType,
    });
  }

  const matchedCount = results.filter(r => r.matchedEvent !== null).length;
  console.log(`匹配完成: ${matchedCount}/${results.length} 条数据匹配成功`);

  return results;
}

/**
 * 输出统计结果
 */
function outputStatistics(matchResults: MatchResult[]): void {
  console.log('\n=== 匹配结果统计 ===');
  console.log(`总激活事件数: ${matchResults.length} 条`);

  const matched = matchResults.filter(r => r.matchedEvent !== null);
  const unmatched = matchResults.filter(r => r.matchedEvent === null);

  console.log(`匹配成功: ${matched.length} 条 (${((matched.length / matchResults.length) * 100).toFixed(2)}%)`);
  console.log(`未匹配: ${unmatched.length} 条 (${((unmatched.length / matchResults.length) * 100).toFixed(2)}%)`);

  // 按匹配类型统计
  const matchTypeStats = new Map<string, number>();
  for (const result of matched) {
    const type = result.matchType || 'unknown';
    matchTypeStats.set(type, (matchTypeStats.get(type) || 0) + 1);
  }

  console.log('\n按匹配类型统计:');
  for (const [type, count] of Array.from(matchTypeStats.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${type}: ${count} 条 (${((count / matched.length) * 100).toFixed(2)}%)`);
  }

  // 按设备类型统计
  const deviceStats = {
    android: { matched: 0, total: 0 },
    ios: { matched: 0, total: 0 },
  };

  for (const result of matchResults) {
    const device = result.conversionData.device?.toLowerCase();
    if (device === 'android') {
      deviceStats.android.total++;
      if (result.matchedEvent) deviceStats.android.matched++;
    } else if (device === 'ios') {
      deviceStats.ios.total++;
      if (result.matchedEvent) deviceStats.ios.matched++;
    }
  }

  console.log('\n按设备类型统计:');
  console.log(
    `  - Android: ${deviceStats.android.matched}/${deviceStats.android.total} (${deviceStats.android.total > 0 ? ((deviceStats.android.matched / deviceStats.android.total) * 100).toFixed(2) : 0}%)`
  );
  console.log(
    `  - iOS: ${deviceStats.ios.matched}/${deviceStats.ios.total} (${deviceStats.ios.total > 0 ? ((deviceStats.ios.matched / deviceStats.ios.total) * 100).toFixed(2) : 0}%)`
  );

  // 输出匹配成功的样例（前10条）
  if (matched.length > 0) {
    console.log('\n匹配成功的样例（前10条）:');
    matched.slice(0, 10).forEach((result, index) => {
      const data = result.conversionData;
      console.log(
        `  ${index + 1}. 设备: ${data.device}, 匹配类型: ${result.matchType}, ` +
          `事件ID: ${result.matchedEvent?.id}, ` +
          `AndroidID: ${data.androidid || 'N/A'}, ` +
          `OAID: ${data.oaid || 'N/A'}, ` +
          `IDFA: ${data.idfa || 'N/A'}`
      );
    });
    if (matched.length > 10) {
      console.log(`  ... 还有 ${matched.length - 10} 条匹配成功的数据`);
    }
  }

  // 输出未匹配的样例（前10条）
  if (unmatched.length > 0) {
    console.log('\n未匹配的样例（前10条）:');
    unmatched.slice(0, 10).forEach((result, index) => {
      const data = result.conversionData;
      console.log(
        `  ${index + 1}. 设备: ${data.device}, ` +
          `AndroidID: ${data.androidid || 'N/A'}, ` +
          `OAID: ${data.oaid || 'N/A'}, ` +
          `IDFA: ${data.idfa || 'N/A'}, ` +
          `IDFV: ${data.idfv || 'N/A'}`
      );
    });
    if (unmatched.length > 10) {
      console.log(`  ... 还有 ${unmatched.length - 10} 条未匹配的数据`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 1. 读取 active.csv 文件
    const csvPath = path.join(__dirname, 'active.csv');
    const conversionDataList = readAndParseCsv(csvPath);

    if (conversionDataList.length === 0) {
      console.log('没有找到有效数据，退出');
      return;
    }

    // 2. 连接数据库并查询小红书事件
    const db = getMakaplatv4DB();
    const xiaohongshuEvents = await fetchXiaohongshuEvents(db);

    if (xiaohongshuEvents.length === 0) {
      console.log('没有找到小红书渠道事件，退出');
      return;
    }

    // 3. 执行匹配分析
    const matchResults = performMatching(conversionDataList, xiaohongshuEvents);

    // 4. 输出统计结果
    outputStatistics(matchResults);
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
