/**
 * 检查用户角色数据一致性
 *
 * 检查项：
 * 1. 用户角色基本信息一致性（旧系统 user_roles 表 vs 新系统 user_roles 表）
 * 2. 角色映射正确性（role_alias 到 role_id）
 * 3. 时间字段一致性（valid_from vs start_at, valid_to vs expires_at）
 */

import dotenv from 'dotenv';
import {
  closeAllConnections,
  getPrisma,
  getUsercenterDB,
} from '../../../service/db-connections';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 获取数据库连接
const prisma = getPrisma();
const usercenterDB = getUsercenterDB();

/**
 * role_alias 映射关系
 * 将旧系统的 role_alias 映射到新系统的 role.alias
 */
const ROLE_ALIAS_MAP: Record<string, string> = {
  jiantie_base: 'person_vip',
  jiantie_custom: 'person_vip',
  jiantie_enterprise: 'enterprise_vip',
  jiantie_flagship: 'person_vip',
  jiantie_infinite: 'person_vip',
  jiantie_personal_lifelong: 'person_vip',
  jiantie_personal_month: 'person_vip',
  jiantie_personal_year: 'person_vip',
  jiantie_senior: 'person_vip',
  jiantie_svip_super: 'enterprise_vip',
  jiantie_vip_senior: 'person_vip',
  // maka_operator: 'person_vip',
};

/**
 * 清理字符串中的空字节
 */
function cleanString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value.replace(/\0/g, '') || undefined;
}

/**
 * 将旧系统的 role_alias 映射到新系统的 role.alias
 */
function mapRoleAlias(oldRoleAlias: string): string | undefined {
  const cleaned = cleanString(oldRoleAlias);
  if (!cleaned) {
    return undefined;
  }
  return ROLE_ALIAS_MAP[cleaned] || cleaned;
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
 * 比较两个日期是否相等（容忍1秒误差，因为数据库时区可能有微小差异）
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
  // 容忍1秒误差
  return { isEqual: diff <= 10000, diff };
}

/**
 * 检查单个用户角色记录的一致性
 */
function checkUserRoleConsistency(
  oldRecord: any,
  newRecord: any,
  roleMap: Map<string, { appid: string; roleAlias: string; roleId: number }>
): { isConsistent: boolean; differences: string[] } {
  const differences: string[] = [];

  // 检查 uid
  if (oldRecord.uid !== newRecord.uid) {
    differences.push(`uid 不匹配: 旧=${oldRecord.uid}, 新=${newRecord.uid}`);
  }

  // 检查 role_id
  const appid = cleanString(oldRecord.appid);
  const oldRoleAlias = cleanString(oldRecord.role_alias);
  if (!appid || !oldRoleAlias) {
    differences.push(`无效的 appid 或 role_alias`);
    return { isConsistent: false, differences };
  }

  const newRoleAlias = mapRoleAlias(oldRoleAlias);
  if (!newRoleAlias) {
    differences.push(`无法映射 role_alias: ${oldRoleAlias}`);
    return { isConsistent: false, differences };
  }

  const key = `${appid}###${newRoleAlias}`;
  const roleInfo = roleMap.get(key);

  if (!roleInfo) {
    console.log('key:', key);
    console.log('roleMap:', roleMap);
    differences.push(
      `未找到角色映射::: appid=${appid}, roleAlias=${newRoleAlias}`
    );
    return { isConsistent: false, differences };
  }

  if (newRecord.role_id !== roleInfo.roleId) {
    differences.push(
      `role_id 不匹配: 预期=${roleInfo.roleId}, 实际=${newRecord.role_id} (appid=${appid}, roleAlias=${newRoleAlias})`
    );
  }

  // 检查时间字段
  const oldStartAt = parseDateTime(oldRecord.valid_from);
  const newStartAt = newRecord.start_at
    ? new Date(newRecord.start_at)
    : undefined;
  const startAtCompare = isDateEqual(oldStartAt, newStartAt);
  if (!startAtCompare.isEqual) {
    differences.push(
      `start_at 不匹配: 旧=${oldStartAt?.toISOString()}, 新=${newStartAt?.toISOString()}, 差异=${startAtCompare.diff}ms`
    );
  }

  const oldExpiresAt = parseDateTime(oldRecord.valid_to);
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
 * 检查用户角色数据一致性
 * @param options 检查选项
 */
async function checkUserRolesConsistency(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startUid?: number;
    endUid?: number;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startUid, endUid, limit } = options;

  console.log('开始检查用户角色数据一致性...');
  console.log('检查选项:', {
    batchSize,
    appid,
    startUid,
    endUid,
    limit,
  });

  // 构建查询条件
  let query = usercenterDB('user_roles').select('*');

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

  // 只检查状态为 0（正常）的记录
  query = query.where('status', 0);

  // 过滤 uid 范围
  if (startUid) {
    query = query.where('uid', '>=', startUid);
  }
  if (endUid) {
    query = query.where('uid', '<=', endUid);
  }

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 uid, id 排序
  query = query.orderBy('uid', 'asc').orderBy('id', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条用户角色记录需要检查\n`);

  if (total === 0) {
    console.log('没有需要检查的用户角色记录');
    return;
  }

  // 预先加载所有需要的 role 映射（优化性能）
  console.log('预加载角色映射...');
  const roleMap = new Map<
    string,
    { appid: string; roleAlias: string; roleId: number }
  >();

  // 收集所有需要查询的 role
  const allRecords = await query.clone().select('appid', 'role_alias');
  const roleQueries = new Set<string>();
  for (const record of allRecords) {
    const appid = cleanString(record.appid);
    const oldRoleAlias = cleanString(record.role_alias);
    if (appid && oldRoleAlias) {
      // 跳过 maka_operator 角色
      if (oldRoleAlias === 'maka_operator') {
        continue;
      }
      const newRoleAlias = mapRoleAlias(oldRoleAlias);
      if (newRoleAlias) {
        // 使用 ### 作为分隔符，避免与 roleAlias 中的下划线冲突
        roleQueries.add(`${appid}###${newRoleAlias}`);
      }
    }
  }

  // 批量查询所有需要的 role_id
  console.log(`需要查询 ${roleQueries.size} 个角色映射...`);
  console.log('查询的角色列表:', Array.from(roleQueries).join(', '));

  for (const key of roleQueries) {
    // 使用 ### 分隔符，只分割一次
    const parts = key.split('###');
    if (parts.length === 2) {
      const [appid, roleAlias] = parts;
      try {
        console.log(
          `  正在查询角色: appid="${appid}" (长度=${appid.length}), alias="${roleAlias}" (长度=${roleAlias.length})`
        );

        const role = await prisma.role.findFirst({
          where: {
            appid: appid,
            alias: roleAlias,
          },
          select: {
            id: true,
            appid: true,
            alias: true,
          },
        });

        if (role?.id) {
          roleMap.set(key, {
            appid: appid,
            roleAlias: roleAlias,
            roleId: role.id,
          });
          console.log(
            `  ✓ 找到角色: appid=${role.appid}, alias=${role.alias}, id=${role.id}`
          );
        } else {
          console.warn(
            `  ✗ 未找到角色: appid="${appid}", alias="${roleAlias}"`
          );
          // 尝试查询所有可能匹配的角色
          const similarRoles = await prisma.role.findMany({
            where: {
              OR: [{ appid: appid }, { alias: roleAlias }],
            },
            select: {
              id: true,
              appid: true,
              alias: true,
            },
            take: 5,
          });
          if (similarRoles.length > 0) {
            console.warn(
              `  可能的匹配角色:`,
              similarRoles
                .map(
                  r => `[id=${r.id}, appid="${r.appid}", alias="${r.alias}"]`
                )
                .join(', ')
            );
          }
        }
      } catch (error) {
        console.error(
          `  查找角色失败: appid=${appid}, alias=${roleAlias}`,
          error
        );
      }
    }
  }

  let processed = 0;
  let consistent = 0;
  let inconsistent = 0;
  let notFound = 0;
  const inconsistentDetails: Array<{
    uid: number;
    appid: string;
    oldRoleAlias: string;
    type: 'not_found' | 'inconsistent';
    differences: string[];
  }> = [];

  /**
   * 阶段一：全局去重 - 收集所有批次的数据并去重
   * 旧系统可能存在同一用户同一映射后角色的多条记录（有效期不同）
   * 这里按「uid + 映射后角色」分组，只保留每组中最新的一条记录进行校验
   */
  console.log('\n========== 阶段一：收集并去重所有记录 ==========');
  const latestOldRecordMap = new Map<string, any>();

  // 分批读取所有记录并进行全局去重
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await query.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `读取批次 ${batchNum}/${totalBatches}，数量=${batch.length}，总进度=${offset + batch.length}/${total}`
    );

    for (const oldRecord of batch) {
      const uid = Number(oldRecord.uid);
      const appid = cleanString(oldRecord.appid);
      const oldRoleAlias = cleanString(oldRecord.role_alias);

      if (!appid || !oldRoleAlias) {
        continue;
      }

      // 跳过 maka_operator 角色
      if (oldRoleAlias === 'maka_operator') {
        continue;
      }

      const newRoleAlias = mapRoleAlias(oldRoleAlias);
      if (!newRoleAlias) {
        continue;
      }

      const groupKey = `${uid}###${appid}###${newRoleAlias}`;

      // 按有效期选择「最新」的一条记录：
      // 优先比较 valid_to（过期时间越晚越新），其次 valid_from，最后用 id 做兜底
      const currentBest = latestOldRecordMap.get(groupKey);
      if (!currentBest) {
        latestOldRecordMap.set(groupKey, oldRecord);
        continue;
      }

      const curFrom = parseDateTime(currentBest.valid_from);
      const curTo = parseDateTime(currentBest.valid_to);
      const newFrom = parseDateTime(oldRecord.valid_from);
      const newTo = parseDateTime(oldRecord.valid_to);

      let isNewer = false;
      // 优先比较 valid_to：过期时间越晚说明是更新的会员状态
      if (curTo && newTo) {
        isNewer = newTo.getTime() > curTo.getTime();
      } else if (!curTo && newTo) {
        // 当前记录没有过期时间，新记录有，则新记录更新
        isNewer = true;
      } else if (curTo && !newTo) {
        // 新记录没有过期时间，当前记录有，则当前记录更新
        isNewer = false;
      } else if (curFrom && newFrom) {
        // 都没有过期时间，比较开始时间
        isNewer = newFrom.getTime() > curFrom.getTime();
      } else if (!curFrom && newFrom) {
        isNewer = true;
      } else if (oldRecord.id && currentBest.id) {
        // 时间都没有，用 id 做兜底
        isNewer = Number(oldRecord.id) > Number(currentBest.id);
      }

      if (isNewer) {
        latestOldRecordMap.set(groupKey, oldRecord);
      }
    }
  }

  console.log(
    `\n全局去重完成，共 ${latestOldRecordMap.size} 条唯一记录需要检查（原始记录 ${total} 条）`
  );

  /**
   * 阶段二：批量检查去重后的记录
   */
  console.log('\n========== 阶段二：检查去重后的记录 ==========');

  // 将去重后的记录转为数组，方便分批处理
  const uniqueRecords = Array.from(latestOldRecordMap.values());
  const checkBatchSize = batchSize; // 使用相同的批次大小
  const totalCheckBatches = Math.ceil(uniqueRecords.length / checkBatchSize);

  for (let i = 0; i < uniqueRecords.length; i += checkBatchSize) {
    const batchRecords = uniqueRecords.slice(i, i + checkBatchSize);
    const batchNum = Math.floor(i / checkBatchSize) + 1;

    console.log(
      `\n检查批次 ${batchNum}/${totalCheckBatches}，数量=${batchRecords.length}，进度=${processed}/${uniqueRecords.length}`
    );

    // 获取这批记录的 uid 列表
    const uids = batchRecords.map((r: any) => Number(r.uid));

    // 查询这批用户在新系统中的角色数据
    const newUserRoles = await prisma.userRole.findMany({
      where: { uid: { in: uids } },
    });

    // 构建新系统用户角色映射：key = "uid_roleId"
    const newUserRoleMap = new Map<string, any>();
    for (const userRole of newUserRoles) {
      const key = `${userRole.uid}_${userRole.role_id}`;
      newUserRoleMap.set(key, userRole);
    }

    // 检查每条记录
    for (const oldRecord of batchRecords) {
      processed++;
      const uid = Number(oldRecord.uid);
      const appid = cleanString(oldRecord.appid);
      const oldRoleAlias = cleanString(oldRecord.role_alias);

      if (!appid || !oldRoleAlias) {
        console.warn(
          `  跳过无效记录: id=${oldRecord.id}, uid=${uid}, appid=${appid}, role_alias=${oldRoleAlias}`
        );
        continue;
      }

      // 跳过 maka_operator 角色（理论上上面已过滤，这里只是双重保护）
      if (oldRoleAlias === 'maka_operator') {
        console.log(
          `  跳过 maka_operator 角色: id=${oldRecord.id}, uid=${uid}, appid=${appid}`
        );
        continue;
      }

      // 映射 role_alias
      const newRoleAlias = mapRoleAlias(oldRoleAlias);
      if (!newRoleAlias) {
        console.warn(
          `  跳过未映射的角色: appid=${appid}, oldRoleAlias=${oldRoleAlias}`
        );
        continue;
      }

      // 查找 role_id（使用 ### 分隔符）
      const key = `${appid}###${newRoleAlias}`;
      const roleInfo = roleMap.get(key);

      if (!roleInfo) {
        console.log('key:', key);
        console.log('roleMap:', roleMap);

        notFound++;
        inconsistent++;
        inconsistentDetails.push({
          uid: uid,
          appid: appid,
          oldRoleAlias: oldRoleAlias,
          type: 'not_found',
          differences: [
            `未找到角色映射--: appid=${appid}, roleAlias=${newRoleAlias}`,
          ],
        });
        continue;
      }

      // 查找新系统中的对应记录
      const newRecordKey = `${uid}_${roleInfo.roleId}`;
      const newRecord = newUserRoleMap.get(newRecordKey);

      if (!newRecord) {
        notFound++;
        inconsistent++;
        inconsistentDetails.push({
          uid: uid,
          appid: appid,
          oldRoleAlias: oldRoleAlias,
          type: 'not_found',
          differences: [
            `用户角色在新系统中不存在: uid=${uid}, role_id=${roleInfo.roleId}`,
          ],
        });
        continue;
      }

      // 检查一致性
      const checkResult = checkUserRoleConsistency(
        oldRecord,
        newRecord,
        roleMap
      );

      if (checkResult.isConsistent) {
        consistent++;
      } else {
        inconsistent++;
        inconsistentDetails.push({
          uid: uid,
          appid: appid,
          oldRoleAlias: oldRoleAlias,
          type: 'inconsistent',
          differences: checkResult.differences,
        });
      }
    }

    console.log(
      `批次 ${batchNum} 完成: 一致=${consistent}, 不一致=${inconsistent}, 未找到=${notFound}, 总计=${processed}/${uniqueRecords.length}`
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
        `\nUID: ${detail.uid}, AppID: ${detail.appid}, 旧角色: ${detail.oldRoleAlias}, 类型: ${detail.type}`
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
        } else if (
          paramKey === 'batchSize' ||
          paramKey === 'startUid' ||
          paramKey === 'endUid' ||
          paramKey === 'limit'
        ) {
          options[paramKey] = parseInt(value, 10);
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
        } else if (
          key === 'batchSize' ||
          key === 'startUid' ||
          key === 'endUid' ||
          key === 'limit'
        ) {
          options[key] = parseInt(value, 10);
          i++; // 跳过下一个参数
        }
      }
    }

    await checkUserRolesConsistency(options);
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

export { checkUserRolesConsistency };
