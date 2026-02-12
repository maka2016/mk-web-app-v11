# @/server

基于 tRPC 和 Prisma 的服务层 API

## 功能

提供三个主要实体的 CRUD 操作：

- **works** - 作品管理
- **template** - 模板管理
- **worksSpec** - 作品规格管理

## 安装依赖

```bash
pnpm install
```

## 使用示例

### 在 Next.js App Router 中使用

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@/server';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
```

### 客户端调用

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server';

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
});

// 查询作品列表
const works = await client.works.findMany.query({
  uid: 123456,
  deleted: false,
  take: 10,
});

// 创建作品
const newWork = await client.works.create.mutate({
  title: '我的作品',
  desc: '作品描述',
  uid: 123456,
});

// 更新作品
await client.works.update.mutate({
  id: 'work_id',
  title: '新标题',
});

// 删除作品（软删除）
await client.works.delete.mutate({
  id: 'work_id',
});
```

## API 列表

### Works (作品)

- `works.create` - 创建作品
- `works.findMany` - 查询作品列表（支持分页和过滤）
- `works.findById` - 根据 ID 查询作品
- `works.update` - 更新作品
- `works.delete` - 软删除作品
- `works.count` - 统计作品数量

### Template (模板)

- `template.create` - 创建模板
- `template.findMany` - 查询模板列表
- `template.findById` - 根据 ID 查询模板
- `template.update` - 更新模板
- `template.delete` - 软删除模板
- `template.count` - 统计模板数量

### WorksSpec (作品规格)

- `worksSpec.create` - 创建规格
- `worksSpec.findMany` - 查询规格列表
- `worksSpec.findById` - 根据 ID 查询规格
- `worksSpec.findByAlias` - 根据别名查询规格
- `worksSpec.update` - 更新规格
- `worksSpec.delete` - 软删除规格
- `worksSpec.count` - 统计规格数量

## 环境变量

数据库连接通过环境变量 `DATABASE_URL` 传递给 Prisma Client。

### 开发环境

在项目根目录创建 `.env.local` 文件：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/works-v2-db"
```

### 生产环境

通过系统环境变量或 Docker 环境变量传递：

```bash
# 系统环境变量
export DATABASE_URL="postgresql://user:password@host:5432/works-v2-db"

# Docker
docker run -e DATABASE_URL="postgresql://..." your-image

# PM2
# 在 ecosystem.config.js 中配置
```

详细配置说明请查看 [jiantie 数据库配置文档](../jiantie/DATABASE_QUICKSTART.md)
