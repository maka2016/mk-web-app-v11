import { PrismaClient } from '../generated/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 根据环境变量 PRISMA_LOG_LEVEL 控制日志级别
// PRISMA_LOG_LEVEL=query 显示所有查询（开发调试）
// PRISMA_LOG_LEVEL=info 显示关键信息
// 默认只显示错误和警告
const getLogConfig = () => {
  const logLevel = process.env.PRISMA_LOG_LEVEL;

  if (logLevel === 'query') {
    return ['query', 'error', 'warn'] as const;
  }

  if (logLevel === 'info') {
    return ['info', 'warn', 'error'] as const;
  }

  // 默认只显示错误和警告
  return ['warn', 'error'] as const;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: getLogConfig() as any,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
