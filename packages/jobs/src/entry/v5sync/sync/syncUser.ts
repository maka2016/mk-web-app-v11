/**
 * 同步用户数据到新表 user 和 user_auth
 *
 * 从旧系统（mk_user_center）同步用户数据到新系统（v11数据库）
 * - users 表 -> user 表
 * - user_auth 表 -> user_auth 表
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
 * 从 reg_type 获取 oauth_provider
 * phone 和 email 的 provider 是 "self"，其他 OAuth 类型返回对应的 provider 名称
 */
function getOAuthProvider(regType: string): string {
  const regTypeLower = regType.toLowerCase();
  // phone 和 email 的 provider 是 "self"
  if (regTypeLower === 'phone' || regTypeLower === 'email') {
    return 'self';
  }
  // 其他所有类型都是 OAuth，返回对应的 provider 名称
  return cleanString(regTypeLower) || regTypeLower;
}

/**
 * 解析 platform_data JSON 字符串，提取 oauth_id 和完整的 oauth_platform_data
 */
function parsePlatformData(platformData: string | null | undefined): {
  oauth_id?: string;
  oauth_platform_data?: any;
} {
  if (!platformData) {
    return {};
  }

  try {
    const data = JSON.parse(platformData);
    if (data && typeof data === 'object') {
      return {
        oauth_id: cleanString(
          data.id || data.oauth_id || data.unionid || data.openid || undefined
        ),
        oauth_platform_data: data, // 保存完整的平台数据
      };
    }
  } catch {
    // 解析失败，忽略
  }

  return {};
}

/**
 * 将旧系统的 reg_type 映射到新系统的 auth_type
 */
function mapAuthType(regType: string): string {
  const typeMap: Record<string, string> = {
    wechat: 'oauth',
    qq: 'oauth',
    phone: 'phone',
    email: 'email',
  };

  return typeMap[regType.toLowerCase()] || regType.toLowerCase();
}

/**
 * 同步用户数据
 * @param options 同步选项
 */
async function syncUsers(
  options: {
    batchSize?: number;
    appid?: string | string[];
    startUid?: number;
    endUid?: number;
    limit?: number;
  } = {}
) {
  const { batchSize = 1000, appid, startUid, endUid, limit } = options;

  console.log('开始同步用户数据...');
  console.log('同步选项:', {
    batchSize,
    appid,
    startUid,
    endUid,
    limit,
  });

  // 构建查询条件
  let usersQuery = usercenterDB('users').select('*');

  // 过滤 appid（只同步 maka 和 jiantie）
  if (appid) {
    if (Array.isArray(appid)) {
      usersQuery = usersQuery.whereIn('appid', appid);
    } else {
      usersQuery = usersQuery.where('appid', appid);
    }
  } else {
    usersQuery = usersQuery.whereIn('appid', ['maka', 'jiantie']);
  }

  // 过滤 uid 范围
  if (startUid) {
    usersQuery = usersQuery.where('uid', '>=', startUid);
  }
  if (endUid) {
    usersQuery = usersQuery.where('uid', '<=', endUid);
  }

  // 限制数量
  if (limit) {
    usersQuery = usersQuery.limit(limit);
  }

  // 按 uid 排序
  usersQuery = usersQuery.orderBy('uid', 'asc');

  // 查询用户总数
  const totalCount = await usersQuery.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 个用户需要同步`);

  if (total === 0) {
    console.log('没有需要同步的用户');
    return;
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let skipped = 0;

  // 分批处理
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await usersQuery.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `\n处理批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    // 获取这批用户的 uid 列表
    const uids = batch.map((u: any) => u.uid);

    // 查询这批用户的认证信息
    const authRecords = await usercenterDB('user_auth')
      .whereIn('uid', uids)
      .select('*');

    // 按 uid 分组认证信息
    const authMap = new Map<number, any[]>();
    for (const auth of authRecords) {
      if (!authMap.has(auth.uid)) {
        authMap.set(auth.uid, []);
      }
      authMap.get(auth.uid)!.push(auth);
    }

    // 查询这批用户的最新登录时间（从 user_activity_logs 表）
    // 按 uid 和 appid 分组，获取每个用户每个 appid 的最新登录时间
    const loginTimeRecords = await usercenterDB('user_activity_logs')
      .whereIn('uid', uids)
      .where('activity_type', 'login') // 只查询登录类型的活动
      .select(usercenterDB.raw('uid, appid, MAX(created_at) as last_login'))
      .groupBy('uid', 'appid');

    // 构建登录时间映射：Map<`${uid}_${appid}`, last_login>
    const loginTimeMap = new Map<string, Date>();
    for (const record of loginTimeRecords) {
      if (record.uid && record.appid && record.last_login) {
        const key = `${record.uid}_${record.appid}`;
        loginTimeMap.set(key, new Date(record.last_login));
      }
    }

    // 查询这批用户的三方登录信息（从 user_third_party_auth 表）
    const thirdPartyAuthRecords = await usercenterDB('user_third_party_auth')
      .whereIn('uid', uids)
      .select('*');

    // 构建三方登录信息映射：Map<`${uid}_${appid}_${platform}`, thirdPartyAuth>
    const thirdPartyAuthMap = new Map<string, any>();
    for (const record of thirdPartyAuthRecords) {
      if (record.uid && record.appid && record.platform) {
        const key = `${record.uid}_${record.appid}_${record.platform}`;
        thirdPartyAuthMap.set(key, record);
      }
    }

    // 批量处理用户
    const results = await Promise.all(
      batch.map(async (user: any) => {
        try {
          // 1. 同步用户基本信息
          await prisma.user.upsert({
            where: { uid: user.uid },
            update: {
              appid: cleanString(user.appid) || user.appid,
              username: cleanString(user.username) || '',
              avatar: cleanString(user.avatar),
              reg_date: user.reg_date ? new Date(user.reg_date) : new Date(),
              status: user.status ?? 0,
              is_team: user.is_team ?? 0,
              update_time: new Date(),
            },
            create: {
              uid: user.uid,
              appid: cleanString(user.appid) || user.appid,
              username: cleanString(user.username) || '',
              avatar: cleanString(user.avatar),
              reg_date: user.reg_date ? new Date(user.reg_date) : new Date(),
              status: user.status ?? 0,
              is_team: user.is_team ?? 0,
            },
          });

          // 2. 同步认证信息
          const auths = authMap.get(user.uid) || [];
          for (const auth of auths) {
            if (!auth.reg_type || !auth.loginid) {
              continue; // 跳过无效的认证信息
            }

            const authType =
              cleanString(mapAuthType(auth.reg_type)) ||
              mapAuthType(auth.reg_type);
            const oauthProvider = getOAuthProvider(auth.reg_type);

            // 从 user_activity_logs 获取登录时间
            const appid = cleanString(user.appid) || user.appid;
            const loginTimeKey = `${user.uid}_${appid}`;
            const lastLogin = loginTimeMap.get(loginTimeKey) || undefined;

            // 如果是 OAuth 类型，从 user_third_party_auth 表获取三方登录信息
            let oauthId: string | undefined;
            let oauthPlatformData: any | undefined;

            if (oauthProvider) {
              // 查找对应的三方登录信息
              const thirdPartyKey = `${user.uid}_${appid}_${oauthProvider}`;
              const thirdPartyAuth = thirdPartyAuthMap.get(thirdPartyKey);

              if (thirdPartyAuth) {
                // 优先使用 unionid，如果没有则使用 openid
                oauthId = cleanString(
                  thirdPartyAuth.unionid || thirdPartyAuth.openid
                );

                // 构建完整的平台数据
                try {
                  let extraInfo = null;
                  if (thirdPartyAuth.extra_info) {
                    try {
                      extraInfo = JSON.parse(thirdPartyAuth.extra_info);
                    } catch {
                      extraInfo = thirdPartyAuth.extra_info;
                    }
                  }

                  oauthPlatformData = {
                    platform: cleanString(thirdPartyAuth.platform),
                    external_appid: cleanString(thirdPartyAuth.external_appid),
                    openid: cleanString(thirdPartyAuth.openid),
                    unionid: cleanString(thirdPartyAuth.unionid),
                    extra_info: extraInfo,
                    created_at: thirdPartyAuth.created_at
                      ? new Date(thirdPartyAuth.created_at).toISOString()
                      : undefined,
                    updated_at: thirdPartyAuth.updated_at
                      ? new Date(thirdPartyAuth.updated_at).toISOString()
                      : undefined,
                  };
                } catch {
                  // 如果构建失败，使用原始数据
                  oauthPlatformData = thirdPartyAuth;
                }
              } else {
                // 如果没有找到三方登录信息，尝试从 platform_data 解析（兼容旧数据）
                const platformData = parsePlatformData(auth.platform_data);
                oauthId = cleanString(platformData.oauth_id);
                oauthPlatformData = platformData.oauth_platform_data;
              }
            }

            // oauthProvider 现在总是有值（phone/email 为 "self"，其他为对应的 provider）
            await prisma.userAuth.upsert({
              where: {
                uid_appid_auth_type_oauth_provider: {
                  uid: user.uid,
                  appid: appid,
                  auth_type: authType,
                  oauth_provider: oauthProvider,
                },
              },
              update: {
                auth_value: cleanString(auth.loginid) || auth.loginid,
                password_hash: cleanString(auth.password_hash),
                oauth_provider: oauthProvider,
                oauth_id: oauthId,
                oauth_platform_data: oauthPlatformData,
                is_verified: auth.is_checked === 1,
                last_login: lastLogin,
                update_time: new Date(),
              },
              create: {
                uid: user.uid,
                appid: appid,
                auth_type: authType,
                auth_value: cleanString(auth.loginid) || auth.loginid,
                password_hash: cleanString(auth.password_hash),
                oauth_provider: oauthProvider,
                oauth_id: oauthId,
                oauth_platform_data: oauthPlatformData,
                is_verified: auth.is_checked === 1,
                last_login: lastLogin,
              },
            });
          }

          return { ok: true };
        } catch (error: any) {
          console.error(
            `  ✗ 同步用户 uid=${user.uid}, appid=${user.appid} 失败:`,
            error?.message || error
          );
          return { ok: false, error: error?.message || String(error) };
        }
      })
    );

    // 统计结果
    for (const result of results) {
      processed++;
      if (result.ok) {
        success++;
      } else {
        failed++;
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

    await syncUsers(options);
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

export { syncUsers };
