# WorksEntity spec_id 关联迁移风险评估文档

## 概述

本文档评估将 `WorksEntity.spec_id` 和 `TemplateEntity.spec_id` 添加外键关联到 `WorksSpecEntity` 的风险和影响。

## 当前状态

- **数据规模**: 线上已有数十万条数据
- **当前实现**: `spec_id` 作为普通字符串字段，无外键约束
- **查询方式**: 手动查询，先查主表，再批量查询 spec 表，最后在内存中组合

## 风险评估

### 1. 数据完整性风险 ⚠️ **高风险**

#### 风险描述

添加外键约束时，数据库会验证所有现有的 `spec_id` 值是否在 `WorksSpecEntity` 中存在。

#### 可能的问题

- 如果存在无效的 `spec_id`（指向不存在的记录），迁移会**失败**
- 如果存在 `spec_id` 指向已删除的 `WorksSpecEntity` 记录，迁移会**失败**
- 如果 `spec_id` 格式不匹配（类型不一致），迁移会**失败**

#### 影响范围

- **迁移失败**: 无法完成数据库结构变更
- **服务中断**: 如果迁移在生产环境执行，可能导致服务不可用
- **数据不一致**: 需要先清理无效数据

#### 缓解措施

1. ✅ 使用 `validate-spec-ids.ts` 脚本预先检查数据
2. 清理无效的 `spec_id`（设置为 `null` 或删除相关记录）
3. 在测试环境先验证迁移流程

### 2. 数据库迁移性能风险 ⚠️ **中风险**

#### 风险描述

添加外键约束需要：

- 扫描所有 `works_entity` 和 `template_entity` 表的 `spec_id` 字段
- 创建外键约束和索引
- 验证数据完整性

#### 可能的问题

- **表锁定**: 在 PostgreSQL 中，添加外键约束可能需要锁定表
- **迁移时间**: 数十万数据可能需要较长时间（几分钟到几十分钟）
- **磁盘空间**: 创建索引需要额外空间

#### 影响范围

- **服务中断**: 迁移期间可能影响写入操作
- **性能下降**: 迁移期间数据库性能可能下降

#### 缓解措施

1. 在**低峰期**执行迁移（如凌晨）
2. 使用 `CONCURRENTLY` 选项创建索引（PostgreSQL 支持）
3. 准备回滚方案
4. 监控数据库性能指标

### 3. 代码兼容性风险 ✅ **低风险**

#### 风险描述

添加关联关系后，Prisma 会生成新的类型定义，但现有代码仍然可以正常工作。

#### 可能的问题

- TypeScript 类型可能需要更新
- 现有查询代码需要重构以使用关联查询

#### 影响范围

- **类型错误**: 编译时可能出现类型不匹配
- **功能正常**: 现有功能不会立即受影响（可以逐步迁移）

#### 缓解措施

1. 分阶段迁移代码
2. 保持向后兼容（同时支持旧查询方式）
3. 充分测试

### 4. 查询性能提升 ✅ **正面影响**

#### 预期收益

- **减少查询次数**: 从 N+1 查询变为 JOIN 查询
- **提升性能**: 数据库层面优化，比应用层组合更高效
- **减少网络开销**: 一次查询获取所有数据

#### 性能对比

**当前方式**（手动查询）:

```typescript
// 1. 查询 works (1 次查询)
const works = await prisma.worksEntity.findMany({...});

// 2. 提取 spec_id (内存操作)
const specIds = works.map(w => w.spec_id).filter(Boolean);

// 3. 批量查询 specs (1 次查询)
const specs = await prisma.worksSpecEntity.findMany({
  where: { id: { in: specIds } }
});

// 4. 内存中组合 (内存操作)
const specMap = new Map(specs.map(s => [s.id, s]));
return works.map(work => ({
  ...work,
  specInfo: work.spec_id ? specMap.get(work.spec_id) : undefined,
}));
```

**优化后**（关联查询）:

```typescript
// 1. 一次查询获取所有数据（包含 JOIN）
const works = await prisma.worksEntity.findMany({
  include: { spec: true },
});

// 2. 直接使用关联数据
return works.map(work => ({
  ...work,
  specInfo: work.spec || undefined,
}));
```

**性能提升**:

- 查询次数: 2 次 → 1 次
- 数据库负载: 降低约 50%
- 响应时间: 预计提升 20-40%（取决于数据量和网络延迟）

## 迁移方案

### 阶段 1: 数据验证和准备 ⏱️ 预计 1-2 小时

1. **运行验证脚本**

   ```bash
   cd packages/database
   npx tsx scripts/validate-spec-ids.ts
   ```

2. **分析结果**
   - 统计无效 `spec_id` 数量
   - 评估清理工作量
   - 制定清理策略

3. **数据清理**（如需要）

   ```sql
   -- 方案 1: 将无效的 spec_id 设置为 null
   UPDATE works_entity
   SET spec_id = NULL
   WHERE spec_id IS NOT NULL
   AND spec_id NOT IN (SELECT id FROM works_spec_entity);

   UPDATE template_entity
   SET spec_id = NULL
   WHERE spec_id IS NOT NULL
   AND spec_id NOT IN (SELECT id FROM works_spec_entity);
   ```

### 阶段 2: Schema 变更 ⏱️ 预计 10-30 分钟

1. **在测试环境验证**

   ```bash
   # 使用测试数据库
   DATABASE_URL="test_db_url" npx prisma migrate dev --name add_spec_relation
   ```

2. **生成迁移文件**

   ```bash
   cd packages/database
   npx prisma migrate dev --name add_spec_relation --create-only
   ```

3. **审查迁移 SQL**
   - 检查生成的 SQL 语句
   - 确认索引创建方式
   - 确认外键约束设置

4. **在测试环境执行**
   - 使用生产数据快照
   - 验证迁移时间
   - 验证数据完整性

### 阶段 3: 生产环境迁移 ⏱️ 预计 30-60 分钟

1. **准备工作**
   - [ ] 备份数据库
   - [ ] 通知团队（维护窗口）
   - [ ] 准备回滚方案
   - [ ] 监控工具就绪

2. **执行迁移**

   ```bash
   # 在低峰期执行
   cd packages/database
   npx prisma migrate deploy
   ```

3. **验证**
   - 检查数据完整性
   - 验证关联查询正常工作
   - 监控应用性能

### 阶段 4: 代码迁移 ⏱️ 预计 2-4 小时

1. **更新 Prisma Client**

   ```bash
   cd packages/database
   npx prisma generate
   ```

2. **逐步迁移查询代码**
   - 先迁移低风险接口
   - 充分测试
   - 逐步推广

3. **性能监控**
   - 对比迁移前后的查询性能
   - 监控数据库负载
   - 收集用户反馈

## 回滚方案

### 如果迁移失败

1. **立即回滚 Schema**

   ```bash
   # 回滚到上一个迁移
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

2. **恢复代码**

   ```bash
   git revert <commit_hash>
   ```

3. **验证服务**
   - 确认所有功能正常
   - 检查数据完整性

### 如果迁移成功但发现问题

1. **临时方案**: 保持关联关系，但代码继续使用手动查询
2. **修复问题**: 在下一个维护窗口修复
3. **逐步迁移**: 问题修复后再迁移代码

## 数据迁移检查清单

### 迁移前检查 ✅

- [ ] 运行 `validate-spec-ids.ts` 脚本
- [ ] 确认无效 `spec_id` 数量为 0
- [ ] 备份生产数据库
- [ ] 在测试环境完整验证迁移流程
- [ ] 准备回滚方案
- [ ] 通知相关团队
- [ ] 选择低峰期时间窗口

### 迁移中监控 📊

- [ ] 监控数据库 CPU/内存使用率
- [ ] 监控表锁定情况
- [ ] 监控迁移进度
- [ ] 准备随时中断迁移

### 迁移后验证 ✅

- [ ] 验证数据完整性
- [ ] 验证外键约束正常工作
- [ ] 验证应用功能正常
- [ ] 监控查询性能
- [ ] 收集错误日志

## 预期时间线

| 阶段     | 任务                | 预计时间     | 风险等级 |
| -------- | ------------------- | ------------ | -------- |
| 1        | 数据验证和清理      | 1-2 小时     | 低       |
| 2        | Schema 变更（测试） | 1 小时       | 中       |
| 3        | 生产环境迁移        | 30-60 分钟   | 高       |
| 4        | 代码迁移            | 2-4 小时     | 低       |
| **总计** |                     | **5-8 小时** |          |

## 建议

### ✅ 推荐做法

1. **先在测试环境完整验证**
2. **使用数据验证脚本预先检查**
3. **在低峰期执行迁移**
4. **分阶段迁移代码**（先 Schema，后代码）
5. **充分备份和准备回滚方案**

### ⚠️ 注意事项

1. **不要在生产环境直接执行迁移**，必须先测试
2. **不要同时迁移 Schema 和代码**，分阶段进行
3. **不要忽略数据验证**，无效数据会导致迁移失败
4. **不要在没有备份的情况下执行迁移**

## 下一步行动

1. 运行 `validate-spec-ids.ts` 脚本，获取数据统计
2. 根据验证结果决定是否需要数据清理
3. 在测试环境完整验证迁移流程
4. 制定详细的迁移计划和时间表
5. 获得团队批准后执行迁移
