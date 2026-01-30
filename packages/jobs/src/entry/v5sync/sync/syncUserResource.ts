/**
 * 同步用户资源数据到新表 user_resource
 *
 * 从旧系统（getUserAssetsDB）同步用户数据到新系统（v11数据库的user_resource）
 * 旧表：
user_resources ( InnoDB , utf8 ) 返回顶部
序列	列名	类型	是否为空	缺省值	描述	安全级别
1	id	int(11) unsigned auto_increment	N		主键ID	低敏感
2	type	enum('collected','added','purchased','trial')	N		资源类型	低敏感
3	appid	varchar(50)	N		应用ID	低敏感
4	uid	int(11) unsigned	N		用户ID	低敏感
5	resource_id	varchar(50)	N		资源ID	低敏感
6	category_id	varchar(50)	N		分类ID	低敏感
7	created_at	timestamp	N	CURRENT_TIMESTAMP	创建时间	低敏感
8	expiry_date	datetime	Y		有效期	低敏感
9	work_id	varchar(64)	N		作品ID	低敏感


category_id对应resource_type（work映射成works）
action_url默认为get

特殊处理：
- 旧系统可能存在同一用户同一资源的多条记录（有效期不同）
- 采用去重策略：按「uid + resource_id + resource_type」分组，只同步每组中最新的一条记录
- 最新记录的判断依据：优先比较生效时间（created_at 最晚），其次过期时间（expiry_date 最晚），最后用 id 做兜底
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
const usercenterDB = getUserAssetsDB();

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
function mapResourceType(categoryId: string): string {
  const cleaned = cleanString(categoryId);
  if (!cleaned) {
    return categoryId;
  }

  // work 映射成 works
  if (cleaned === 'work') {
    return 'works';
  }

  return cleaned;
}

/**
 * 处理日期时间，将 '0000-00-00 00:00:00' 转换为 null
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
 * 同步用户资源数据
 * @param options 同步选项
 */
async function syncUserResources(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startUid?: number;
    endUid?: number;
    limit?: number;
    resourceType?: string; // 可以指定只同步某种资源类型
  } = {}
) {
  const {
    batchSize = 1000,
    appid,
    startUid,
    endUid,
    limit,
    resourceType,
  } = options;

  console.log('开始同步用户资源数据...');
  console.log('同步选项:', {
    batchSize,
    appid,
    startUid,
    endUid,
    limit,
    resourceType,
  });

  // 构建查询条件
  let query = usercenterDB('user_resources').select('*');

  // 过滤 appid（默认只同步 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      query = query.whereIn('appid', appid);
    } else {
      query = query.where('appid', appid);
    }
  } else {
    query = query.where('appid', 'jiantie');
  }

  // 过滤 uid 范围
  if (startUid) {
    query = query.where('uid', '>=', startUid);
  }
  if (endUid) {
    query = query.where('uid', '<=', endUid);
  }

  // 过滤资源类型
  if (resourceType) {
    query = query.where('category_id', resourceType);
  }

  // 限制数量
  if (limit) {
    query = query.limit(limit);
  }

  // 按 id 排序
  query = query.orderBy('id', 'asc');

  // 查询总数
  const totalCount = await query.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 条用户资源记录需要同步`);

  if (total === 0) {
    console.log('没有需要同步的用户资源记录');
    return;
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const failedRecords: Array<{ id: number; uid: number; error: string }> = [];

  // 分批处理
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await query.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `\n处理批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    /**
     * 旧系统可能存在同一用户同一资源的多条记录（有效期不同）
     * 这里按「uid + resource_id + resource_type」分组，只保留每组中最新的一条记录进行同步
     */
    const latestOldRecordMap = new Map<string, any>();
    for (const oldRecord of batch) {
      const uid = Number(oldRecord.uid);
      const resourceId = cleanString(oldRecord.resource_id);
      const categoryId = cleanString(oldRecord.category_id);
      const resourceType = categoryId ? mapResourceType(categoryId) : undefined;

      if (!uid || !resourceId || !resourceType) {
        continue;
      }

      const groupKey = `${uid}###${resourceId}###${resourceType}`;

      // 按有效期选择「最新」的一条记录：
      // 优先比较 created_at（生效时间），其次 expiry_date（过期时间），最后用 id 做兜底
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
      // 优先比较生效时间（created_at），选择生效时间最晚的
      if (curFrom && newFrom) {
        isNewer = newFrom.getTime() > curFrom.getTime();
      } else if (!curFrom && newFrom) {
        isNewer = true;
      } else if (curTo && newTo) {
        // 生效时间相同或都没有，比较过期时间
        isNewer = newTo.getTime() > curTo.getTime();
      } else if (!curTo && newTo) {
        isNewer = true;
      } else if (oldRecord.id && currentBest.id) {
        // 都没有时间，用 id 做兜底（id 越大越新）
        isNewer = Number(oldRecord.id) > Number(currentBest.id);
      }

      if (isNewer) {
        latestOldRecordMap.set(groupKey, oldRecord);
      }
    }

    console.log(
      `  本批次按 uid+resource 分组后需同步记录数=${latestOldRecordMap.size}（原始数量=${batch.length}）`
    );

    // 批量处理去重后的用户资源
    const results = await Promise.all(
      Array.from(latestOldRecordMap.values()).map(async (record: any) => {
        try {
          const uid = Number(record.uid);
          const resourceId = cleanString(record.resource_id);
          const categoryId = cleanString(record.category_id);

          if (!uid || !resourceId) {
            console.warn(
              `  跳过无效记录: id=${record.id}, uid=${uid}, resource_id=${resourceId}`
            );
            return { ok: false, skipped: true };
          }

          // 检查用户是否存在
          const userExists = await prisma.user.findUnique({
            where: { uid },
            select: { uid: true },
          });

          if (!userExists) {
            console.warn(`  跳过不存在的用户: id=${record.id}, uid=${uid}`);
            return { ok: false, skipped: true };
          }

          // 映射 resource_type
          const resourceType = categoryId
            ? mapResourceType(categoryId)
            : undefined;

          // 处理日期
          const startAt = parseDateTime(record.created_at);
          const expiresAt = parseDateTime(record.expiry_date);

          // 查询是否已存在相同的记录
          const existingRecord = await prisma.userResource.findFirst({
            where: {
              uid,
              resource_id: resourceId,
              resource_type: resourceType,
            },
          });

          if (existingRecord) {
            // 更新现有记录
            await prisma.userResource.update({
              where: { id: existingRecord.id },
              data: {
                start_at: startAt,
                expires_at: expiresAt,
                action_url: 'get', // 默认为 get
                update_time: new Date(),
              },
            });
          } else {
            // 创建新记录
            await prisma.userResource.create({
              data: {
                uid,
                resource_id: resourceId,
                resource_type: resourceType,
                action_url: 'get', // 默认为 get
                start_at: startAt,
                expires_at: expiresAt,
              },
            });
          }

          return { ok: true, uid, id: record.id };
        } catch (error: any) {
          console.error(
            `  ✗ 同步用户资源失败: id=${record.id}, uid=${record.uid}, resource_id=${record.resource_id}`,
            error?.message || error
          );
          return {
            ok: false,
            uid: Number(record.uid),
            id: Number(record.id),
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
        if (result.id && result.uid) {
          failedRecords.push({
            id: result.id,
            uid: result.uid,
            error: result.error || 'unknown',
          });
        }
      }
    }

    console.log(
      `批次 ${batchNum} 完成: 成功=${success}, 失败=${failed}, 跳过=${skipped}, 总计=${processed}/${total}`
    );
  }

  console.log('\n同步完成！');
  console.log(`总计: ${processed}`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  console.log(`跳过: ${skipped}`);

  if (failedRecords.length > 0) {
    console.log('\n失败的记录列表:');
    console.log('ID\tUID\tError');
    const displayRecords = failedRecords.slice(0, 10);
    for (const record of displayRecords) {
      console.log(
        `${record.id}\t${record.uid}\t${record.error.substring(0, 50)}`
      );
    }
    if (failedRecords.length > 10) {
      console.log(`... 还有 ${failedRecords.length - 10} 条失败记录`);
    }
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
        } else if (key === 'resourceType') {
          options.resourceType = value;
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

    await syncUserResources(options);
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

export { syncUserResources };
