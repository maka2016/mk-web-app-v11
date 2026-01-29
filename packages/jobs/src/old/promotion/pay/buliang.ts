// 第一步：读取csv文件，文件名称为pay.csv，参数在W列
// 数据例子：handlePaymentConversion: {"appid":"jiantie","uid":605644527,"conversionTime":1769132325615,"payAmount":2900,"orderId":"20260123013834850838268250531"}

// 第二步：检查是不是已经完成过归因
// 检查方法为：查询makaplatv4.promotion_event_conversions,看看conversion_type为pay的记录，uid匹配的

// 第三步：如果已经完成过归因，则跳过
// 第四步：输出统计结果

// 第五步：构造请求，请求地址为：http://127.0.0.1:3000/v1/conversion/pay，请求参数为：看readme

import * as fs from 'fs';
import * as path from 'path';
import { closeAllConnections, getMakaplatv4DB } from '../../../service/db-connections';

interface PayConversionData {
  appid?: string;
  uid: number;
  conversionTime: number;
  payAmount: number;
  orderId: string;
}

interface PayConversionRequest {
  uid: number;
  conversionTime: number;
  payAmount: number;
  orderId: string;
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
function extractJsonFromMessage(message: string): PayConversionData | null {
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) {
    return null;
  }
  const jsonStr = message.substring(jsonStart);
  try {
    let data: PayConversionData;
    try {
      data = JSON.parse(jsonStr) as PayConversionData;
    } catch {
      const normalizedJson = jsonStr.replace(/""/g, '"');
      data = JSON.parse(normalizedJson) as PayConversionData;
    }
    return data;
  } catch {
    if (process.env.DEBUG) {
      console.error('解析 JSON 失败:', jsonStr.substring(0, 100));
    }
    return null;
  }
}

/**
 * 读取并解析 CSV 文件
 */
function readAndParseCsv(filePath: string): PayConversionData[] {
  console.log(`开始读取 CSV 文件: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  console.log(`CSV 文件总行数: ${lines.length}`);

  const results: PayConversionData[] = [];
  let skippedCount = 0;
  let parseErrorCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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

    if (data.appid === 'jiantie' && data.uid != null && data.orderId) {
      results.push(data);
    } else {
      skippedCount++;
    }
  }

  console.log(`解析完成:`);
  console.log(`  - 有效数据（appid=jiantie）: ${results.length} 条`);
  console.log(`  - 跳过/错误: ${skippedCount + parseErrorCount} 条`);
  return results;
}

/**
 * 批量检查哪些 uid 已在 promotion_event_conversions 中有 pay 归因
 */
async function batchCheckPayAttributionExists(
  db: ReturnType<typeof getMakaplatv4DB>,
  uids: number[]
): Promise<Set<number>> {
  if (uids.length === 0) return new Set();

  const uniqueUids = Array.from(new Set(uids));
  const attributedUids = new Set<number>();
  const batchSize = 1000;
  const totalBatches = Math.ceil(uniqueUids.length / batchSize);

  for (let i = 0; i < uniqueUids.length; i += batchSize) {
    const batch = uniqueUids.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;

    const rows = await db('promotion_event_conversions')
      .whereIn('uid', batch)
      .where('conversion_type', 'pay')
      .select('uid')
      .distinct();

    for (const row of rows) {
      attributedUids.add(row.uid);
    }
    if (totalBatches > 1) {
      console.log(`  批量查询进度: ${batchIndex}/${totalBatches} (${batch.length} 个 uid)`);
    }
  }
  return attributedUids;
}

function buildPayConversionRequest(data: PayConversionData): PayConversionRequest {
  return {
    uid: data.uid,
    conversionTime: data.conversionTime,
    payAmount: data.payAmount,
    orderId: data.orderId,
  };
}

/**
 * 发送支付转化请求
 */
async function sendPayConversionRequest(
  url: string,
  body: PayConversionRequest,
  retries = 3
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        return { success: true, statusCode: response.status };
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      if (attempt === retries) {
        return { success: false, statusCode: response.status, error: errorText };
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * 逐条发送支付转化请求
 */
async function sendPayConversionRequests(
  url: string,
  list: PayConversionData[]
): Promise<{ data: PayConversionData; success: boolean; error?: string; statusCode?: number }[]> {
  console.log(`\n开始发送支付转化请求...`);
  console.log(`  - 总请求数: ${list.length}`);
  console.log(`  - 请求地址: ${url}`);

  const results: { data: PayConversionData; success: boolean; error?: string; statusCode?: number }[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < list.length; i++) {
    const data = list[i];
    const request = buildPayConversionRequest(data);
    const result = await sendPayConversionRequest(url, request);

    results.push({
      data,
      success: result.success,
      error: result.error,
      statusCode: result.statusCode,
    });

    if (result.success) {
      successCount++;
      console.log(`  [${i + 1}/${list.length}] ✓ UID: ${data.uid} orderId: ${data.orderId} - 请求成功`);
    } else {
      failCount++;
      console.log(
        `  [${i + 1}/${list.length}] ✗ UID: ${data.uid} orderId: ${data.orderId} - 请求失败: ${result.error || 'Unknown error'}`
      );
    }
    if (i < list.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n请求发送完成:`);
  console.log(`  - 成功: ${successCount} 条`);
  console.log(`  - 失败: ${failCount} 条`);
  return results;
}

async function main() {
  try {
    const csvPath = path.join(__dirname, 'pay.csv');
    const allData = readAndParseCsv(csvPath);

    if (allData.length === 0) {
      console.log('没有找到有效数据，退出');
      return;
    }

    const db = getMakaplatv4DB();
    console.log('\n开始检查 pay 归因状态...');

    const allUids = allData.map(d => d.uid);
    const uniqueUids = Array.from(new Set(allUids));
    console.log(`共 ${allData.length} 条数据，${uniqueUids.length} 个不同 uid`);

    const attributedUids = await batchCheckPayAttributionExists(db, uniqueUids);
    console.log(`已归因 uid 数量: ${attributedUids.size}`);

    const toSend: PayConversionData[] = [];
    let skippedCount = 0;

    for (const d of allData) {
      if (attributedUids.has(d.uid)) {
        skippedCount++;
      } else {
        toSend.push(d);
      }
    }

    console.log('\n检查完成:');
    console.log(`  - 已归因跳过: ${skippedCount} 条`);
    console.log(`  - 待补量: ${toSend.length} 条`);

    if (toSend.length === 0) {
      console.log('\n所有数据均已归因，无需处理');
      return;
    }

    const url = 'http://127.0.0.1:3000/v1/conversion/pay';
    const requestResults = await sendPayConversionRequests(url, toSend);

    const okList = requestResults.filter(r => r.success);
    const failList = requestResults.filter(r => !r.success);

    console.log('\n统计结果:');
    console.log(`  - 解析总数: ${allData.length}`);
    console.log(`  - 已归因跳过: ${skippedCount}`);
    console.log(`  - 本次请求成功: ${okList.length}`);
    console.log(`  - 本次请求失败: ${failList.length}`);

    if (failList.length > 0) {
      console.log('\n请求失败的数据（前10条）:');
      failList.slice(0, 10).forEach((r, idx) => {
        console.log(
          `  ${idx + 1}. UID: ${r.data.uid}, orderId: ${r.data.orderId}, 状态码: ${r.statusCode ?? 'N/A'}, 错误: ${r.error ?? 'Unknown'}`
        );
      });
      if (failList.length > 10) {
        console.log(`  ... 还有 ${failList.length - 10} 条失败`);
      }
    }
  } catch (error) {
    console.error('脚本执行失败:', error);
    throw error;
  } finally {
    await closeAllConnections();
    console.log('\n数据库连接已关闭');
  }
}

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
