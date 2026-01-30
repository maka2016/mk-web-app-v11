# tRPC API

基于 tRPC 的类型安全 API 接口。

## 使用示例

### 在客户端组件中使用

```typescript
'use client';

import { trpc } from '@/utils/trpc';
import { useEffect, useState } from 'react';

export default function WorksList() {
  const [works, setWorks] = useState([]);

  useEffect(() => {
    // 查询作品列表
    trpc.works.findMany.query({
      uid: 123456,
      deleted: false,
      take: 10,
    }).then(setWorks);
  }, []);

  return (
    <div>
      {works.map(work => (
        <div key={work.id}>{work.title}</div>
      ))}
    </div>
  );
}
```

### 创建作品

```typescript
const handleCreate = async () => {
  const newWork = await trpc.works.create.mutate({
    title: '新作品',
    desc: '作品描述',
  });
  console.log('创建成功:', newWork);
};
```

### 更新作品

```typescript
const handleUpdate = async (id: string) => {
  await trpc.works.update.mutate({
    id,
    title: '更新后的标题',
  });
};
```

### 删除作品（软删除）

```typescript
const handleDelete = async (id: string) => {
  await trpc.works.delete.mutate({ id });
};
```

### 查询单个作品

```typescript
const work = await trpc.works.findById.query({ id: 'work_id' });
```

### 统计作品数量

```typescript
const count = await trpc.works.count.query({
  uid: 123456,
  deleted: false,
});
```

## API 列表

### Works (作品管理)

- `trpc.works.create` - 创建作品
- `trpc.works.findMany` - 查询作品列表
- `trpc.works.findById` - 根据 ID 查询作品
- `trpc.works.update` - 更新作品
- `trpc.works.delete` - 软删除作品
- `trpc.works.count` - 统计作品数量

### Template (模板管理)

- `trpc.template.create` - 创建模板
- `trpc.template.findMany` - 查询模板列表
- `trpc.template.findById` - 根据 ID 查询模板
- `trpc.template.update` - 更新模板
- `trpc.template.delete` - 软删除模板
- `trpc.template.count` - 统计模板数量

### WorksSpec (作品规格)

- `trpc.worksSpec.create` - 创建规格
- `trpc.worksSpec.findMany` - 查询规格列表
- `trpc.worksSpec.findById` - 根据 ID 查询规格
- `trpc.worksSpec.findByAlias` - 根据别名查询规格
- `trpc.worksSpec.update` - 更新规格
- `trpc.worksSpec.delete` - 软删除规格
- `trpc.worksSpec.count` - 统计规格数量

## 类型安全

所有 API 调用都是完全类型安全的，TypeScript 会自动推断：

- 输入参数类型
- 返回值类型
- 错误类型

```typescript
// ✅ 类型正确
const work = await trpc.works.findById.query({ id: 'xxx' });
work.title; // string

// ❌ 编译错误：缺少必需参数
const work = await trpc.works.findById.query({});

// ❌ 编译错误：参数类型不匹配
const work = await trpc.works.findById.query({ id: 123 });
```
