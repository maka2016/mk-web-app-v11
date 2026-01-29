/**
 * 检查用户作品类资源（user_resource）数据一致性
 *
 * 检查项：
 * 1. 旧系统 user_resources 表与新系统 user_resource 表的一致性
 * 2. 作品类资源（category_id=work -> resource_type=works）的映射正确性
 * 3. 时间字段一致性（created_at vs start_at, expiry_date vs expires_at）
 *
 * 默认只检查 jiantie 下的作品资源（category_id=work），可通过参数调整
 *
 * 特殊处理：
 * - 旧系统可能存在同一用户同一资源的多条记录（有效期不同）
 * - 新系统也可能存在同一用户同一资源的多条记录（有效期不同）
 * - 采用去重策略：按「uid + resource_id + resource_type」分组，只检查每组中最新的一条记录
 * - 最新记录的判断依据：优先比较生效时间（start_at/created_at 最晚），其次过期时间（expires_at/expiry_date 最晚），最后用 id 做兜底
 */

import dotenv from 'dotenv';
import {
  closeAllConnections,
  getPrisma,
  getUserAssetsDB,
} from '../../../service/db-connections';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 获取数据库连接
const prisma = getPrisma();
const userAssetsDB = getUserAssetsDB();

/**
 * 清理字符串中的空字节（PostgreSQL 不支持）
 */
function cleanString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  // 移除空字节（\0）
  return value.replace(/\0/g, '') || undefined;
}

/**
 * 映射 category_id 到 resource_type
 * work -> works
 */
function mapResourceType(
  categoryId: string | null | undefined
): string | undefined {
  const cleaned = cleanString(categoryId || undefined);
  if (!cleaned) {
    return undefined;
  }

  // work 映射成 works
  if (cleaned === 'work') {
    return 'works';
  }

  return cleaned;
}

/**
 * 处理日期时间，将 '0000-00-00 00:00:00' 转换为 undefined
 */
function parseDateTime(
  value: string | null | undefined | Date
): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const str = String(value);
  // 处理 MySQL 的无效日期
  if (
    str === '0000-00-00 00:00:00' ||
    str === '0000-00-00' ||
    str.startsWith('0000-')
  ) {
    return undefined;
  }

  try {
    const date = new Date(str);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  } catch {
    return undefined;
  }
}

/**
 * 比较两个日期是否相等（容忍5秒误差，因为数据库时区可能有微小差异）
 */
function isDateEqual(
  a: Date | undefined,
  b: Date | undefined
): { isEqual: boolean; diff?: number } {
  if (!a && !b) {
    return { isEqual: true };
  }
  if (!a || !b) {
    return { isEqual: false };
  }

  const diff = Math.abs(a.getTime() - b.getTime());
  // 容忍5秒误差
  return { isEqual: diff <= 15000, diff };
}

/**
 * 检查单条用户资源记录一致性
 */
function checkUserResourceConsistency(
  oldRecord: any,
  newRecord: any
): { isConsistent: boolean; differences: string[] } {
  const differences: string[] = [];

  // 检查 uid
  if (Number(oldRecord.uid) !== Number(newRecord.uid)) {
    differences.push(`uid 不匹配: 旧=${oldRecord.uid}, 新=${newRecord.uid}`);
  }

  // 检查 resource_id
  const oldResourceId = cleanString(oldRecord.resource_id);
  const newResourceId = cleanString(newRecord.resource_id);
  if (oldResourceId !== newResourceId) {
    differences.push(
      `resource_id 不匹配: 旧=${oldRecord.resource_id}, 新=${newRecord.resource_id}`
    );
  }

  // 检查 resource_type / category_id 映射
  const expectedResourceType = mapResourceType(oldRecord.category_id);
  const actualResourceType = cleanString(newRecord.resource_type);
  if (expectedResourceType !== actualResourceType) {
    differences.push(
      `resource_type 不匹配: 预期=${expectedResourceType}, 实际=${actualResourceType} (旧 category_id=${oldRecord.category_id})`
    );
  }

  // 检查时间字段
  const oldStartAt = parseDateTime(oldRecord.created_at);
  const newStartAt = newRecord.start_at
    ? new Date(newRecord.start_at)
    : undefined;
  const startAtCompare = isDateEqual(oldStartAt, newStartAt);
  if (!startAtCompare.isEqual) {
    differences.push(
      `start_at 不匹配: 旧=${oldStartAt?.toISOString()}, 新=${newStartAt?.toISOString()}, 差异=${startAtCompare.diff}ms`
    );
  }

  const oldExpiresAt = parseDateTime(oldRecord.expiry_date);
  const newExpiresAt = newRecord.expires_at
    ? new Date(newRecord.expires_at)
    : undefined;
  const expiresAtCompare = isDateEqual(oldExpiresAt, newExpiresAt);
  if (!expiresAtCompare.isEqual) {
    differences.push(
      `expires_at 不匹配: 旧=${oldExpiresAt?.toISOString()}, 新=${newExpiresAt?.toISOString()}, 差异=${expiresAtCompare.diff}ms`
    );
  }

  return {
    isConsistent: differences.length === 0,
    differences,
  };
}

/**
 * 检查用户作品类资源数据一致性
 * @param options 检查选项
 */
async function checkUserWorkConsistency(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startTime?: string | Date;
    endTime?: string | Date;
    limit?: number;
    resourceType?: string; // 旧表中的 category_id，默认只检查 work（作品）
  } = {}
) {
  const {
    batchSize = 1000,
    appid,
    startTime,
    endTime,
    limit,
    resourceType = 'work',
  } = options;

  console.log('开始检查用户作品类资源数据一致性...');
  console.log('检查选项:', {
    batchSize,
    appid,
    startTime,
    endTime,
    limit,
    resourceType,
  });

  // 构建查询条件
  let query = userAssetsDB('user_resources').select('*');

  // 过滤 appid（默认只检查 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      query = query.whereIn('appid', appid);
    } else {
      query = query.where('appid', appid);
    }
  } else {
    query = query.where('appid', 'jiantie');
  }

  query = query.where('type', '<>', 'trial');

  // 过滤时间范围（使用 created_at 字段）
  if (startTime) {
    const startDate =
      startTime instanceof Date ? startTime : new Date(startTime);
    query = query.where('created_at', '>=', startDate);
  }
  if (endTime) {
    const endDate = endTime instanceof Date ? endTime : new Date(endTime);
    query = query.where('created_at', '<=', endDate);
  }

  // 过滤资源类型（旧表的 category_id）
  if (resourceType) {
    query = query.where('category_id', resourceType);
  }

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 created_at, id 排序
  query = query.orderBy('created_at', 'asc').orderBy('id', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条用户资源记录需要检查`);

  if (total === 0) {
    console.log('没有需要检查的用户资源记录');
    return;
  }

  let processed = 0;
  let consistent = 0;
  let inconsistent = 0;
  let notFound = 0;
  const inconsistentDetails: Array<{
    uid: number;
    appid: string;
    resourceId: string;
    categoryId: string | null;
    type: 'not_found' | 'inconsistent';
    differences: string[];
  }> = [];

  // 分批处理
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await query.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `\n处理批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    // 获取这批记录的 uid 列表
    const uids = batch.map((r: any) => Number(r.uid));

    // 查询这批用户在新系统中的资源数据
    const newUserResources = await prisma.userResource.findMany({
      where: { uid: { in: uids } },
    });

    /**
     * 新系统可能存在同一用户同一资源的多条记录（有效期不同）
     * 这里按「uid + resource_id + resource_type」分组，只保留每组中最新的一条记录进行校验
     */
    const latestNewRecordMap = new Map<string, any>();
    for (const record of newUserResources) {
      const uid = Number(record.uid);
      const resourceId = cleanString(record.resource_id);
      const resourceTypeNew = cleanString(record.resource_type);
      if (!uid || !resourceId || !resourceTypeNew) {
        continue;
      }
      const groupKey = `${uid}###${resourceId}###${resourceTypeNew}`;

      const currentBest = latestNewRecordMap.get(groupKey);
      if (!currentBest) {
        latestNewRecordMap.set(groupKey, record);
        continue;
      }

      const curFrom = parseDateTime(currentBest.start_at);
      const curTo = parseDateTime(currentBest.expires_at);
      const newFrom = parseDateTime(record.start_at);
      const newTo = parseDateTime(record.expires_at);

      let isNewer = false;
      if (curFrom && newFrom) {
        isNewer = newFrom.getTime() > curFrom.getTime();
      } else if (!curFrom && newFrom) {
        isNewer = true;
      } else if (curTo && newTo) {
        isNewer = newTo.getTime() > curTo.getTime();
      } else if (!curTo && newTo) {
        isNewer = true;
      } else if (record.id && currentBest.id) {
        isNewer = Number(record.id) > Number(currentBest.id);
      }

      if (isNewer) {
        latestNewRecordMap.set(groupKey, record);
      }
    }

    console.log(
      `  本批次新系统按 uid+resource 分组后记录数=${latestNewRecordMap.size}`
    );

    /**
     * 旧系统同一用户同一资源也可能有多条记录
     * 同样按「uid + resource_id + 映射后的 resource_type」分组，只保留最新的一条记录
     */
    const latestOldRecordMap = new Map<string, any>();
    for (const oldRecord of batch) {
      const uid = Number(oldRecord.uid);
      const resourceId = cleanString(oldRecord.resource_id);
      const mappedType = mapResourceType(oldRecord.category_id);
      if (!uid || !resourceId || !mappedType) {
        continue;
      }

      const groupKey = `${uid}###${resourceId}###${mappedType}`;
      const currentBest = latestOldRecordMap.get(groupKey);
      if (!currentBest) {
        latestOldRecordMap.set(groupKey, oldRecord);
        continue;
      }

      const curFrom = parseDateTime(currentBest.created_at);
      const curTo = parseDateTime(currentBest.expiry_date);
      const newFrom = parseDateTime(oldRecord.created_at);
      const newTo = parseDateTime(oldRecord.expiry_date);

      let isNewer = false;
      if (curFrom && newFrom) {
        isNewer = newFrom.getTime() > curFrom.getTime();
      } else if (!curFrom && newFrom) {
        isNewer = true;
      } else if (curTo && newTo) {
        isNewer = newTo.getTime() > curTo.getTime();
      } else if (!curTo && newTo) {
        isNewer = true;
      } else if (oldRecord.id && currentBest.id) {
        isNewer = Number(oldRecord.id) > Number(currentBest.id);
      }

      if (isNewer) {
        latestOldRecordMap.set(groupKey, oldRecord);
      }
    }

    console.log(
      `  本批次旧系统按 uid+resource 分组后需检查记录数=${latestOldRecordMap.size}`
    );

    // 只检查每个分组中最新的一条旧记录
    for (const oldRecord of latestOldRecordMap.values()) {
      processed++;
      const uid = Number(oldRecord.uid);
      const appidValue = cleanString(oldRecord.appid) || oldRecord.appid;
      const resourceId =
        cleanString(oldRecord.resource_id) || oldRecord.resource_id;
      const mappedType = mapResourceType(oldRecord.category_id);

      if (!uid || !resourceId || !mappedType) {
        console.warn(
          `  跳过无效记录: id=${oldRecord.id}, uid=${uid}, appid=${appidValue}, resource_id=${resourceId}, category_id=${oldRecord.category_id}`
        );
        continue;
      }

      const key = `${uid}###${resourceId}###${mappedType}`;
      const newRecord = latestNewRecordMap.get(key);

      if (!newRecord) {
        notFound++;
        inconsistent++;
        inconsistentDetails.push({
          uid,
          appid: String(appidValue),
          resourceId,
          categoryId: oldRecord.category_id,
          type: 'not_found',
          differences: [
            `用户资源在新系统中不存在: uid=${uid}, resource_id=${resourceId}, resource_type=${mappedType}`,
          ],
        });
        continue;
      }

      // 检查一致性
      const checkResult = checkUserResourceConsistency(oldRecord, newRecord);
      if (checkResult.isConsistent) {
        consistent++;
      } else {
        inconsistent++;
        inconsistentDetails.push({
          uid,
          appid: String(appidValue),
          resourceId,
          categoryId: oldRecord.category_id,
          type: 'inconsistent',
          differences: checkResult.differences,
        });
      }
    }

    console.log(
      `批次 ${batchNum} 完成: 一致=${consistent}, 不一致=${inconsistent}, 未找到=${notFound}, 总计=${processed}/${total}`
    );
  }

  // 输出检查结果
  console.log('\n========== 检查完成 ==========');
  console.log(`总计: ${processed}`);
  console.log(`一致: ${consistent}`);
  console.log(`不一致: ${inconsistent}`);
  console.log(`未找到: ${notFound}`);

  // 输出不一致的详细信息
  if (inconsistentDetails.length > 0) {
    console.log('\n========== 不一致详情 ==========');
    for (const detail of inconsistentDetails.slice(0, 50)) {
      // 只显示前50个不一致的详情
      console.log(
        `\nUID: ${detail.uid}, AppID: ${detail.appid}, ResourceID: ${detail.resourceId}, CategoryID: ${detail.categoryId}, 类型: ${detail.type}`
      );
      for (const diff of detail.differences) {
        console.log(`  - ${diff}`);
      }
    }
    if (inconsistentDetails.length > 50) {
      console.log(
        `\n... 还有 ${inconsistentDetails.length - 50} 个不一致的详情未显示`
      );
    }
  }

  return {
    total: processed,
    consistent,
    inconsistent,
    notFound,
    details: inconsistentDetails,
  };
}

/**
 * 主函数
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    // 解析命令行参数
    const options: any = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (!arg?.startsWith('--')) {
        continue;
      }

      // 支持 --key=value 格式
      if (arg.includes('=')) {
        const [key, value] = arg.split('=');
        const paramKey = key.replace('--', '');
        if (paramKey === 'appid') {
          options.appid = value.split(',').map((v: string) => v.trim());
        } else if (paramKey === 'resourceType') {
          options.resourceType = value;
        } else if (paramKey === 'batchSize' || paramKey === 'limit') {
          options[paramKey] = parseInt(value, 10);
        } else if (paramKey === 'startTime' || paramKey === 'endTime') {
          options[paramKey] = value;
        }
        continue;
      }

      // 支持 --key value 格式
      const key = arg.replace('--', '');
      const value = args[i + 1];
      if (key && value) {
        if (key === 'appid') {
          options.appid = value.split(',').map((v: string) => v.trim());
          i++; // 跳过下一个参数
        } else if (key === 'resourceType') {
          options.resourceType = value;
          i++; // 跳过下一个参数
        } else if (key === 'batchSize' || key === 'limit') {
          options[key] = parseInt(value, 10);
          i++; // 跳过下一个参数
        } else if (key === 'startTime' || key === 'endTime') {
          options[key] = value;
          i++; // 跳过下一个参数
        }
      }
    }

    await checkUserWorkConsistency(options);
  } catch (error) {
    console.error('检查过程出错:', error);
    process.exit(1);
  } finally {
    await closeAllConnections();
    process.exit(0);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { checkUserWorkConsistency };
