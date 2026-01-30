/**
 * 同步用户角色数据到新表 user_roles
 *
 * 从旧系统（mk_user_center）同步用户数据到新系统（v11数据库）
 * 旧表：
 `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
 `uid` bigint(11) NOT NULL,
 `appid` varchar(50) NOT NULL COMMENT '应用ID',
 `role_alias` varchar(100) NOT NULL,
 `valid_from` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
 `valid_to` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
 `status` tinyint(3) NOT NULL DEFAULT '0' COMMENT '状态 0 正常 -1 删除',
 `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (`id`),
 UNIQUE KEY `unq_key` (`appid`,`uid`,`role_alias`),
 KEY `fk_user` (`uid`) USING BTREE

  role_alias映射：person_vip（对应新role表的alias）
"jiantie_base"person_vip"
"jiantie_custom","person_vip"
"jiantie_enterprise","enterprise_vip"
"jiantie_flagship","person_vip"
"jiantie_infinite","person_vip"
"jiantie_personal_lifelong","person_vip"
"jiantie_personal_month","person_vip"
"jiantie_personal_year","person_vip"
"jiantie_senior","person_vip"
"jiantie_svip_super","enterprise_vip"
"jiantie_vip_senior","person_vip"
"maka_operator","person_vip"

 特殊处理：
 - 旧系统可能存在同一用户有多个角色记录（有效期不同），但都映射到同一个新角色
 - 采用去重策略：按「uid + appid + 映射后角色」分组，只同步每组中最新的一条记录
 - 最新记录的判断依据：优先比较 valid_to（过期时间最晚），其次 valid_from（生效时间最晚），最后用 id 做兜底

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
 * 将旧系统的 role_alias 映射到新系统的 role.alias
 */
function mapRoleAlias(oldRoleAlias: string): string | undefined {
  const cleaned = cleanString(oldRoleAlias);
  console.log(`[mapRoleAlias] 输入: "${oldRoleAlias}", 清理后: "${cleaned}"`);
  if (!cleaned) {
    console.log(`[mapRoleAlias] 清理后为空，返回 undefined`);
    return undefined;
  }
  const mapped = ROLE_ALIAS_MAP[cleaned] || cleaned;
  console.log(`[mapRoleAlias] 映射结果: "${cleaned}" -> "${mapped}"`);
  return mapped;
}

/**
 * 处理日期时间，将 '0000-00-00 00:00:00' 转换为 null
 */
function parseDateTime(
  value: string | null | undefined | Date
): Date | undefined {
  console.log(`[parseDateTime] 输入值: ${value}, 类型: ${typeof value}`);
  if (!value) {
    console.log(`[parseDateTime] 值为空，返回 undefined`);
    return undefined;
  }

  if (value instanceof Date) {
    console.log(`[parseDateTime] 已是 Date 对象: ${value}`);
    return value;
  }

  const str = String(value);
  // 处理 MySQL 的无效日期
  if (
    str === '0000-00-00 00:00:00' ||
    str === '0000-00-00' ||
    str.startsWith('0000-')
  ) {
    console.log(
      `[parseDateTime] 检测到无效 MySQL 日期: ${str}, 返回 undefined`
    );
    return undefined;
  }

  try {
    const date = new Date(str);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.log(`[parseDateTime] 日期转换失败（无效时间戳）: ${str}`);
      return undefined;
    }
    console.log(`[parseDateTime] 转换成功: ${str} -> ${date.toISOString()}`);
    return date;
  } catch (error) {
    console.log(`[parseDateTime] 转换异常: ${str}, error: ${error}`);
    return undefined;
  }
}

/**
 * 根据 appid 和 role.alias 查找 role_id
 */
async function findRoleId(
  appid: string,
  roleAlias: string
): Promise<number | null> {
  console.log(`[findRoleId] 查询角色: appid="${appid}", alias="${roleAlias}"`);
  try {
    const role = await prisma.role.findFirst({
      where: {
        appid: appid,
        alias: roleAlias,
      },
      select: {
        id: true,
      },
    });

    if (role) {
      console.log(`[findRoleId] 找到角色 ID: ${role.id}`);
    } else {
      console.log(`[findRoleId] 未找到角色`);
    }
    return role?.id || null;
  } catch (error) {
    console.error(
      `[findRoleId] 查找角色失败: appid=${appid}, roleAlias=${roleAlias}`,
      error
    );
    return null;
  }
}

/**
 * 同步用户角色数据
 * @param options 同步选项
 */
async function syncUserRoles(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startUid?: number;
    endUid?: number;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startUid, endUid, limit } = options;

  console.log('开始同步用户角色数据...');
  console.log('同步选项:', {
    batchSize,
    appid,
    startUid,
    endUid,
    limit,
  });

  // 构建查询条件
  // 注意：旧表名需要根据实际情况调整，这里假设表名为 user_role 或类似的名称
  // 需要查看实际的旧表名
  console.log('[查询构建] 开始构建查询条件...');
  let query = usercenterDB('user_roles').select('*');

  // 过滤 appid（默认只同步 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      console.log(`[查询构建] appid 过滤 (数组): ${appid.join(', ')}`);
      query = query.whereIn('appid', appid);
    } else {
      console.log(`[查询构建] appid 过滤 (单个): ${appid}`);
      query = query.where('appid', appid);
    }
  } else {
    console.log(`[查询构建] appid 过滤 (默认): jiantie`);
    query = query.where('appid', 'jiantie');
  }

  // 只同步状态为 0（正常）的记录
  console.log(`[查询构建] status 过滤: 0`);
  query = query.where('status', 0);

  // 过滤 uid 范围
  if (startUid) {
    console.log(`[查询构建] uid 范围过滤: >= ${startUid}`);
    query = query.where('uid', '>=', startUid);
  }
  if (endUid) {
    console.log(`[查询构建] uid 范围过滤: <= ${endUid}`);
    query = query.where('uid', '<=', endUid);
  }

  // 限制数量
  if (limit) {
    console.log(`[查询构建] 数量限制: ${limit}`);
    query = query.limit(limit);
  }

  // 按 id 排序
  console.log(`[查询构建] 排序: id asc`);
  query = query.orderBy('id', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条用户角色记录需要同步`);

  if (total === 0) {
    console.log('没有需要同步的用户角色记录');
    return;
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const failedUids: number[] = [];

  // 预先加载所有需要的 role 映射（优化性能）
  // 使用 Map 存储 role 信息：key = "appid_newRoleAlias", value = { appid, roleAlias, roleId }
  const roleMap = new Map<
    string,
    { appid: string; roleAlias: string; roleId: number | null }
  >();

  // 收集所有需要查询的 role（扫描所有记录）
  console.log('[角色映射] 开始收集所有角色映射...');
  const allRecords = await query.clone().select('appid', 'role_alias');
  console.log(`[角色映射] 扫描到 ${allRecords.length} 条记录`);

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
        const key = `${appid}_${newRoleAlias}`;
        if (!roleMap.has(key)) {
          console.log(`[角色映射] 新增映射: ${key}`);
          roleMap.set(key, {
            appid: appid,
            roleAlias: newRoleAlias,
            roleId: null, // 先占位，后面填充
          });
        }
      } else {
        console.warn(
          `[角色映射] 映射失败: appid=${appid}, oldRoleAlias=${oldRoleAlias}`
        );
      }
    }
  }
  console.log(`[角色映射] 收集完成，共 ${roleMap.size} 个唯一角色`);

  // 批量查询所有需要的 role_id
  console.log(`预加载 ${roleMap.size} 个角色映射...`);
  for (const roleInfo of roleMap.values()) {
    const roleId = await findRoleId(roleInfo.appid, roleInfo.roleAlias);
    roleInfo.roleId = roleId;
    if (roleId) {
      console.log(
        `  找到角色: appid=${roleInfo.appid}, alias=${roleInfo.roleAlias}, id=${roleId}`
      );
    } else {
      console.warn(
        `  未找到角色: appid=${roleInfo.appid}, alias=${roleInfo.roleAlias}`
      );
    }
  }

  /**
   * 阶段一：全局去重 - 收集所有批次的数据并去重
   * 旧系统可能存在同一用户同一映射后角色的多条记录（有效期不同）
   * 这里按「uid + appid + 映射后角色」分组，只保留每组中最新的一条记录进行同步
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
    `\n全局去重完成，共 ${latestOldRecordMap.size} 条唯一记录需要同步（原始记录 ${total} 条）`
  );

  /**
   * 阶段二：批量同步去重后的记录
   */
  console.log('\n========== 阶段二：同步去重后的记录 ==========');

  // 将去重后的记录转为数组，方便分批处理
  const uniqueRecords = Array.from(latestOldRecordMap.values());
  const syncBatchSize = batchSize; // 使用相同的批次大小
  const totalSyncBatches = Math.ceil(uniqueRecords.length / syncBatchSize);

  for (let i = 0; i < uniqueRecords.length; i += syncBatchSize) {
    const batchRecords = uniqueRecords.slice(i, i + syncBatchSize);
    const batchNum = Math.floor(i / syncBatchSize) + 1;

    console.log(
      `\n同步批次 ${batchNum}/${totalSyncBatches}，数量=${batchRecords.length}，进度=${processed}/${uniqueRecords.length}`
    );

    // 批量处理这批去重后的用户角色
    const results = await Promise.all(
      batchRecords.map(async (record: any) => {
        try {
          console.log(`\n[处理记录] id=${record.id}, uid=${record.uid}`);
          console.log(
            `  原始数据: appid="${record.appid}", role_alias="${record.role_alias}"`
          );
          console.log(
            `  日期: valid_from="${record.valid_from}", valid_to="${record.valid_to}"`
          );

          const appid = cleanString(record.appid);
          const uid = Number(record.uid);
          const oldRoleAlias = cleanString(record.role_alias);

          console.log(
            `  清理后: appid="${appid}", uid=${uid}, role_alias="${oldRoleAlias}"`
          );

          if (!appid || !uid || !oldRoleAlias) {
            console.warn(
              `  ⚠️  跳过无效记录: id=${record.id}, appid=${appid}, uid=${uid}, role_alias=${oldRoleAlias}`
            );
            return { ok: false, skipped: true };
          }

          // 映射 role_alias
          const newRoleAlias = mapRoleAlias(oldRoleAlias);
          console.log(`  映射后的 role_alias: "${newRoleAlias}"`);
          if (!newRoleAlias) {
            console.warn(
              `  ⚠️  跳过未映射的角色: appid=${appid}, oldRoleAlias=${oldRoleAlias}`
            );
            return { ok: false, skipped: true };
          }

          // 查找 role_id
          const key = `${appid}_${newRoleAlias}`;
          console.log(`  查找角色映射 key: "${key}"`);
          const roleInfo = roleMap.get(key);

          if (!roleInfo || !roleInfo.roleId) {
            console.warn(
              `  ⚠️  跳过未找到的角色: appid=${appid}, roleAlias=${newRoleAlias}, uid=${uid}`
            );
            return { ok: false, skipped: true };
          }

          const roleId = roleInfo.roleId;
          console.log(`  找到角色 ID: ${roleId}`);

          // 处理日期
          console.log(`  处理日期: valid_from="${record.valid_from}"`);
          const startAt = parseDateTime(record.valid_from);
          console.log(`  处理日期: valid_to="${record.valid_to}"`);
          const expiresAt = parseDateTime(record.valid_to);
          console.log(
            `  日期转换结果: start_at=${startAt}, expires_at=${expiresAt}`
          );

          // 同步到新表
          console.log(`  执行 upsert: uid=${uid}, role_id=${roleId}`);
          const result = await prisma.userRole.upsert({
            where: {
              uid_role_id: {
                uid: uid,
                role_id: roleId,
              },
            },
            update: {
              start_at: startAt,
              expires_at: expiresAt,
              update_time: new Date(),
            },
            create: {
              uid: uid,
              role_id: roleId,
              start_at: startAt,
              expires_at: expiresAt,
            },
          });
          // console.log(
          //   `  ✓ 同步成功: uid=${uid}, role_id=${roleId}, id=${result.id}`
          // );
          return { ok: true, uid };
        } catch (error: any) {
          console.error(
            `  ✗ 同步用户角色失败: id=${record.id}, uid=${record.uid}, appid=${record.appid}, role_alias=${record.role_alias}`,
            error?.message || error
          );
          console.error(`  错误堆栈:`, error?.stack);
          return {
            ok: false,
            uid: Number(record.uid),
            error: error?.message || String(error),
          };
        }
      })
    );

    // 统计结果
    for (const result of results as any[]) {
      processed++;
      if (result.ok) {
        success++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
        if (typeof result.uid === 'number') {
          failedUids.push(result.uid);
        }
      }
    }

    console.log(
      `批次 ${batchNum} 完成: 成功=${success}, 失败=${failed}, 跳过=${skipped}, 总计=${processed}/${uniqueRecords.length}`
    );
  }

  console.log('\n========== 同步完成 ==========');
  console.log(`原始记录数: ${total}`);
  console.log(`去重后记录数: ${uniqueRecords.length}`);
  console.log(`处理总计: ${processed}`);
  console.log(`同步成功: ${success}`);
  console.log(`同步失败: ${failed}`);
  console.log(`跳过记录: ${skipped}`);
  if (failedUids.length > 0) {
    console.log(
      '失败的 uid 列表（去重后）:',
      Array.from(new Set(failedUids)).join(',')
    );
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 可以通过命令行参数或环境变量配置同步选项
    const args = process.argv.slice(2);

    // 解析命令行参数
    const options: any = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]?.replace('--', '');
      const value = args[i + 1];
      if (key && value) {
        if (key === 'appid') {
          options.appid = value.split(',').map((v: string) => v.trim());
        } else if (
          key === 'batchSize' ||
          key === 'startUid' ||
          key === 'endUid' ||
          key === 'limit'
        ) {
          options[key] = parseInt(value, 10);
        }
      }
    }

    await syncUserRoles(options);
  } catch (error) {
    console.error('同步过程出错:', error);
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

export { syncUserRoles };
