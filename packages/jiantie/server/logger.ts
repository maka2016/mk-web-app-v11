import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

/**
 * 全局 pino logger，仅用于服务端（tRPC、API routes、server utils 等）。
 * 开发环境使用 pino-pretty 格式化，生产环境输出 JSON。
 *
 * 使用示例：
 *   import { log } from '@/server/logger';
 *   log.info({ userId: 1 }, 'user login');
 *   log.error({ err }, 'request failed');
 */
const log = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    },
  }),
});

export { log };
