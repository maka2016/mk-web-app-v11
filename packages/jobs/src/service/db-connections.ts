// 数据库连接服务 - 统一管理所有数据库连接，使用单例模式
import { initPrisma } from '@mk/jiantie/v11-database';
import dotenv from 'dotenv';
import knex, { Knex } from 'knex';

// 加载环境变量
console.log('process.cwd()', process.cwd());
dotenv.config({ path: '.env.local' });

// Prisma 单例
let prismaInstance: ReturnType<typeof initPrisma> | null = null;

/**
 * 获取 Prisma 实例（单例模式）
 */
export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = initPrisma({
      connectionString: `${process.env.DATABASE_URL}`,
    });
  }
  return prismaInstance;
}

// BI数据库单例
let biAdbInstance: Knex | null = null;

/**
 * 获取 BI 数据库连接（单例模式）
 */
export function getBiAdb(): Knex {
  if (!biAdbInstance) {
    biAdbInstance = knex({
      client: 'mysql',
      connection: {
        host: 'am-2zeo48x814d64lo93167330.ads.aliyuncs.com',
        user: 'report_api',
        password: 'j3E4h6NWBQ5U-',
        database: 'mk_datawork',
      },
    });
  }
  return biAdbInstance;
}

// 订单数据库单例
let orderDbInstance: Knex | null = null;

/**
 * 获取订单数据库连接（单例模式）
 */
export function getOrderDB(): Knex {
  if (!orderDbInstance) {
    orderDbInstance = knex({
      client: 'mysql',
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'query_prod',
        password: 'jCItnVtI0k67RBrt',
        database: 'mk_order_center',
      },
    });
  }
  return orderDbInstance;
}

// 用户中心数据库单例
let usercenterDbInstance: Knex | null = null;

/**
 * 获取用户中心数据库连接（单例模式）
 */
export function getUsercenterDB(): Knex {
  if (!usercenterDbInstance) {
    usercenterDbInstance = knex({
      client: 'mysql',
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'query_prod',
        password: 'jCItnVtI0k67RBrt',
        database: 'mk_user_center',
      },
    });
  }
  return usercenterDbInstance;
}

export function getUserAssetsDB(): Knex {
  if (!usercenterDbInstance) {
    usercenterDbInstance = knex({
      client: 'mysql',
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'query_prod',
        password: 'jCItnVtI0k67RBrt',
        database: 'mk_user_asset_center',
      },
    });
  }
  return usercenterDbInstance;
}

// makaplatv4数据库单例（广告相关）
let makaplatv4DbInstance: Knex | null = null;

/**
 * 获取 makaplatv4 数据库连接（单例模式）
 */
export function getMakaplatv4DB(): Knex {
  if (!makaplatv4DbInstance) {
    makaplatv4DbInstance = knex({
      client: 'mysql',
      connection: {
        host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
        user: 'mso_read_only',
        password: 'j3E4h6NWBQ5U',
        database: 'makaplatv4',
      },
    });
  }
  return makaplatv4DbInstance;
}

/**
 * 关闭所有数据库连接
 */
export async function closeAllConnections(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (prismaInstance) {
    promises.push(prismaInstance.$disconnect());
  }

  if (biAdbInstance) {
    promises.push(biAdbInstance.destroy());
  }

  if (orderDbInstance) {
    promises.push(orderDbInstance.destroy());
  }

  if (usercenterDbInstance) {
    promises.push(usercenterDbInstance.destroy());
  }

  if (makaplatv4DbInstance) {
    promises.push(makaplatv4DbInstance.destroy());
  }

  await Promise.all(promises);

  // 重置实例
  prismaInstance = null;
  biAdbInstance = null;
  orderDbInstance = null;
  usercenterDbInstance = null;
  makaplatv4DbInstance = null;
}
