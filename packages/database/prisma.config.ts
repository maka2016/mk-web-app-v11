import path from 'node:path';

/**
 * Prisma 配置文件
 * 配置 Prisma CLI 的行为，包括 migrate 和 studio 等子命令
 *
 * 参考文档: https://www.prisma.io/docs/orm/reference/prisma-config-reference
 *
 * 配置文件路径解析规则：
 * - 路径定义在配置文件中（如 schema、migrations）始终相对于配置文件的位置解析
 * - 使用 pnpm prisma 时，配置文件会自动检测
 */
const prismaConfig = {
  schema: path.join('prisma', 'schema.prisma'),
};

export default prismaConfig;
