/**
 * 检查从某个注册时间开始的user新老数据表一致性
 *
 * 检查项：
 * 1. 用户基本信息一致性（users 表 vs user 表）
 * 2. 用户认证信息一致性（user_auth 表 vs user_auth 表）
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
 * 清理字符串中的空字节（用于比较）
 */
function cleanString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value.replace(/\0/g, '') || undefined;
}

/**
 * 从 reg_type 获取 oauth_provider
 */
function getOAuthProvider(regType: string): string {
  const regTypeLower = regType.toLowerCase();
  if (regTypeLower === 'phone' || regTypeLower === 'email') {
    return 'self';
  }
  return cleanString(regTypeLower) || regTypeLower;
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
 * 比较两个值是否相等（处理 null/undefined）
 */
function isEqual(a: any, b: any): boolean {
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false;
  }
  // 日期比较
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  // 字符串比较（清理空字节）
  if (typeof a === 'string' && typeof b === 'string') {
    return cleanString(a) === cleanString(b);
  }
  return a === b;
}

/**
 * 检查用户基本信息一致性
 */
function checkUserInfo(
  oldUser: any,
  newUser: any
): { isConsistent: boolean; differences: string[] } {
  const differences: string[] = [];

  // 检查基本字段
  if (!isEqual(oldUser.uid, newUser.uid)) {
    differences.push(`uid: 旧=${oldUser.uid}, 新=${newUser.uid}`);
  }
  if (!isEqual(cleanString(oldUser.appid), newUser.appid)) {
    differences.push(`appid: 旧=${oldUser.appid}, 新=${newUser.appid}`);
  }
  if (!isEqual(cleanString(oldUser.username), newUser.username)) {
    differences.push(
      `username: 旧=${oldUser.username}, 新=${newUser.username}`
    );
  }
  // if (!isEqual(cleanString(oldUser.avatar), newUser.avatar)) {
  //   differences.push(
  //     `avatar: 旧=${oldUser.avatar}, 新=${newUser.avatar}`
  //   );
  // }
  if (
    oldUser.reg_date &&
    newUser.reg_date &&
    !isEqual(new Date(oldUser.reg_date), new Date(newUser.reg_date))
  ) {
    differences.push(
      `reg_date: 旧=${oldUser.reg_date}, 新=${newUser.reg_date}`
    );
  }
  // if (!isEqual(oldUser.status ?? 0, newUser.status)) {
  //   differences.push(`status: 旧=${oldUser.status}, 新=${newUser.status}`);
  // }
  if (!isEqual(oldUser.is_team ?? 0, newUser.is_team)) {
    differences.push(`is_team: 旧=${oldUser.is_team}, 新=${newUser.is_team}`);
  }

  return {
    isConsistent: differences.length === 0,
    differences,
  };
}

/**
 * 检查用户认证信息一致性
 */
function checkUserAuth(
  oldAuths: any[],
  newAuths: any[]
): { isConsistent: boolean; differences: string[] } {
  const differences: string[] = [];

  // 构建新系统的认证信息映射
  const newAuthMap = new Map<string, any>();
  for (const auth of newAuths) {
    const key = `${auth.auth_type}_${auth.oauth_provider || 'null'}`;
    newAuthMap.set(key, auth);
  }

  // 检查旧系统的每个认证信息是否在新系统中存在且一致
  for (const oldAuth of oldAuths) {
    if (!oldAuth.reg_type || !oldAuth.loginid) {
      continue; // 跳过无效的认证信息
    }

    if (oldAuth.reg_type === 'guest') {
      continue;
    }

    const authType = mapAuthType(oldAuth.reg_type);
    const oauthProvider = getOAuthProvider(oldAuth.reg_type);
    const key = `${authType}_${oauthProvider}`;
    const newAuth = newAuthMap.get(key);

    if (!newAuth) {
      differences.push(
        `认证信息缺失: uid=${oldAuth.uid}, auth_type=${authType}, oauth_provider=${oauthProvider}`
      );
      continue;
    }

    // 检查字段一致性
    if (!isEqual(cleanString(oldAuth.loginid), newAuth.auth_value)) {
      differences.push(
        `auth_value: 旧=${oldAuth.loginid}, 新=${newAuth.auth_value} (uid=${oldAuth.uid}, auth_type=${authType})`
      );
    }
    // password_hash 不检查
    if (!isEqual(oldAuth.is_checked === 1, newAuth.is_verified)) {
      differences.push(
        `is_verified: 旧=${oldAuth.is_checked === 1}, 新=${newAuth.is_verified} (uid=${oldAuth.uid}, auth_type=${authType})`
      );
    }
  }

  // 检查新系统中是否有旧系统不存在的认证信息（可能是新系统独有的）
  // const oldAuthMap = new Map<string, any>();
  // for (const auth of oldAuths) {
  //   if (!auth.reg_type || !auth.loginid) {
  //     continue;
  //   }
  //   const authType = mapAuthType(auth.reg_type);
  //   const oauthProvider = getOAuthProvider(auth.reg_type);
  //   const key = `${authType}_${oauthProvider}`;
  //   oldAuthMap.set(key, auth);
  // }

  // for (const newAuth of newAuths) {
  //   const key = `${newAuth.auth_type}_${newAuth.oauth_provider || 'null'}`;
  //   if (!oldAuthMap.has(key)) {
  //     differences.push(
  //       `新系统独有认证信息: uid=${newAuth.uid}, auth_type=${newAuth.auth_type}, oauth_provider=${newAuth.oauth_provider}`
  //     );
  //   }
  // }

  return {
    isConsistent: differences.length === 0,
    differences,
  };
}

/**
 * 检查用户数据一致性
 * @param startRegDate 开始注册时间（ISO 字符串或 Date 对象）
 * @param endRegDate 结束注册时间（可选，ISO 字符串或 Date 对象）
 * @param appid 应用ID（可选，默认检查 maka 和 jiantie）
 * @param batchSize 批次大小
 */
async function checkUsersConsistency(
  startRegDate: string | Date,
  endRegDate?: string | Date,
  appid?: string | string[],
  batchSize: number = 1000
) {
  const startDate =
    typeof startRegDate === 'string' ? new Date(startRegDate) : startRegDate;
  const endDate = endRegDate
    ? typeof endRegDate === 'string'
      ? new Date(endRegDate)
      : endRegDate
    : undefined;

  console.log('开始检查用户数据一致性...');
  console.log('检查选项:', {
    startRegDate: startDate.toISOString(),
    endRegDate: endDate?.toISOString(),
    appid: appid || ['maka', 'jiantie'],
    batchSize,
  });

  // 构建查询条件
  let usersQuery = usercenterDB('users')
    .select('*')
    .where('reg_date', '>=', startDate);

  if (endDate) {
    usersQuery = usersQuery.where('reg_date', '<=', endDate);
  }

  // 过滤 appid
  if (appid) {
    if (Array.isArray(appid)) {
      usersQuery = usersQuery.whereIn('appid', appid);
    } else {
      usersQuery = usersQuery.where('appid', appid);
    }
  } else {
    usersQuery = usersQuery.whereIn('appid', ['maka', 'jiantie']);
  }

  // 按 uid 排序
  usersQuery = usersQuery.orderBy('uid', 'asc');

  // 查询用户总数
  const totalCount = await usersQuery.clone().count('* as count').first();
  const total = Number(totalCount?.count || 0);
  console.log(`找到 ${total} 个用户需要检查\n`);

  if (total === 0) {
    console.log('没有需要检查的用户');
    return;
  }

  let processed = 0;
  let consistent = 0;
  let inconsistent = 0;
  let notFound = 0;
  const inconsistentDetails: Array<{
    uid: number;
    appid: string;
    type: 'not_found' | 'user_info' | 'user_auth';
    differences: string[];
  }> = [];

  // 分批处理
  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await usersQuery.clone().limit(batchSize).offset(offset);
    const batchNum = Math.floor(offset / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(
      `处理批次 ${batchNum}/${totalBatches}，数量=${batch.length}，进度=${processed}/${total}`
    );

    // 获取这批用户的 uid 列表
    const uids = batch.map((u: any) => u.uid);

    // 查询这批用户在新系统中的数据
    const newUsers = await prisma.user.findMany({
      where: { uid: { in: uids } },
      include: { userAuths: true },
    });

    // 构建新用户映射
    const newUserMap = new Map<number, any>();
    for (const user of newUsers) {
      newUserMap.set(user.uid, user);
    }

    // 查询这批用户的旧认证信息
    const oldAuthRecords = await usercenterDB('user_auth')
      .whereIn('uid', uids)
      .select('*');

    // 按 uid 分组旧认证信息
    const oldAuthMap = new Map<number, any[]>();
    for (const auth of oldAuthRecords) {
      if (!oldAuthMap.has(auth.uid)) {
        oldAuthMap.set(auth.uid, []);
      }
      oldAuthMap.get(auth.uid)!.push(auth);
    }

    // 检查每个用户
    for (const oldUser of batch) {
      processed++;
      const newUser = newUserMap.get(oldUser.uid);

      // 检查用户是否存在
      if (!newUser) {
        notFound++;
        inconsistent++;
        inconsistentDetails.push({
          uid: oldUser.uid,
          appid: oldUser.appid,
          type: 'not_found',
          differences: ['用户在新系统中不存在'],
        });
        continue;
      }

      // 检查用户基本信息
      const userInfoCheck = checkUserInfo(oldUser, newUser);
      if (!userInfoCheck.isConsistent) {
        inconsistent++;
        inconsistentDetails.push({
          uid: oldUser.uid,
          appid: oldUser.appid,
          type: 'user_info',
          differences: userInfoCheck.differences,
        });
      }

      // 检查用户认证信息
      const oldAuths = oldAuthMap.get(oldUser.uid) || [];
      const newAuths = newUser.userAuths || [];
      const authCheck = checkUserAuth(oldAuths, newAuths);
      if (!authCheck.isConsistent) {
        inconsistent++;
        inconsistentDetails.push({
          uid: oldUser.uid,
          appid: oldUser.appid,
          type: 'user_auth',
          differences: authCheck.differences,
        });
      }

      // 如果基本信息和认证信息都一致，则用户一致
      if (userInfoCheck.isConsistent && authCheck.isConsistent) {
        consistent++;
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
        `\nUID: ${detail.uid}, AppID: ${detail.appid}, 类型: ${detail.type}`
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
    let startRegDate: string | Date | undefined;
    let endRegDate: string | Date | undefined;
    let appid: string | string[] | undefined;
    let batchSize = 1000;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (!arg?.startsWith('--')) {
        continue;
      }

      // 支持 --key=value 格式
      if (arg.includes('=')) {
        const [key, value] = arg.split('=');
        const paramKey = key.replace('--', '');
        if (paramKey === 'startRegDate') {
          startRegDate = value;
        } else if (paramKey === 'endRegDate') {
          endRegDate = value;
        } else if (paramKey === 'appid') {
          appid = value.split(',').map((v: string) => v.trim());
        } else if (paramKey === 'batchSize') {
          batchSize = parseInt(value, 10);
        }
        continue;
      }

      // 支持 --key value 格式
      const key = arg.replace('--', '');
      const value = args[i + 1];
      if (key && value) {
        if (key === 'startRegDate') {
          startRegDate = value;
          i++; // 跳过下一个参数
        } else if (key === 'endRegDate') {
          endRegDate = value;
          i++; // 跳过下一个参数
        } else if (key === 'appid') {
          appid = value.split(',').map((v: string) => v.trim());
          i++; // 跳过下一个参数
        } else if (key === 'batchSize') {
          batchSize = parseInt(value, 10);
          i++; // 跳过下一个参数
        }
      }
    }

    if (!startRegDate) {
      console.error('错误: 必须提供 --startRegDate 参数（ISO 日期字符串）');
      console.error('示例: --startRegDate "2024-01-01T00:00:00Z"');
      process.exit(1);
    }

    await checkUsersConsistency(startRegDate, endRegDate, appid, batchSize);
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

export { checkUsersConsistency };
