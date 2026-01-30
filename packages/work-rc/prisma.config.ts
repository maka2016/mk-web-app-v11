import dotenv from 'dotenv';
import path from 'path';
import { defineConfig, env } from 'prisma/config';

// 加载项目根目录的 .env.local 文件
// 优先从项目根目录加载（Prisma 命令通常从根目录运行）
const rootEnvPath = path.resolve(__dirname, './.env');
const relativeEnvPath = path.resolve(__dirname, './.env.local');

// 先尝试从当前工作目录（项目根目录）加载
dotenv.config({ path: rootEnvPath });
// 如果还没找到，尝试从相对路径加载
if (!process.env.RC_DB_URL) {
  dotenv.config({ path: relativeEnvPath });
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('RC_DB_URL'),
  },
});
