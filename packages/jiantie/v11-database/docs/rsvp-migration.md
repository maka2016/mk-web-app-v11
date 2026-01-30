# RSVP 数据迁移文档

## 概述

本次迁移将 `RsvpFormConfigEntity` 与 `WorksEntity` 建立外键关联关系，确保数据完整性。

## 变更内容

### 数据库 Schema 变更

1. **RsvpFormConfigEntity**：
   - `works_id` 字段添加外键约束，关联到 `WorksEntity.id`
   - 添加 `@@unique([works_id])` 约束，确保一个作品只有一个 RSVP 配置

2. **WorksEntity**：
   - 添加可选的一对一关联关系 `rsvp_form_config`

### 关系说明

- **WorksEntity** 可以没有 `RsvpFormConfigEntity`（可选关系）
- **RsvpFormConfigEntity** 必须关联一个 `WorksEntity`（必需关系）
- 一个 `WorksEntity` 最多只能有一个 `RsvpFormConfigEntity`（唯一约束）

## 迁移步骤

### 1. 数据清理（迁移前必须执行）

在添加外键约束之前，需要清理无效数据。

#### 方法 A：使用迁移脚本（推荐）

```bash
cd packages/jiantie/v11-database

# 1. 先查看需要修复的数据（dry-run 模式，不会实际修改）
DATABASE_URL="your_database_url" npx tsx scripts/fix-rsvp-works-relation.ts --dry-run

# 2. 确认无误后，执行实际修复
DATABASE_URL="your_database_url" npx tsx scripts/fix-rsvp-works-relation.ts
```

脚本功能：

- ✅ 自动检测无效的 `works_id`（关联的作品不存在）
- ✅ 自动检测重复的 `works_id`（一个作品有多个配置）
- ✅ 智能保留策略：优先保留 `enabled = true` 的配置，其次保留最新的（`create_time` 最大的）
- ✅ 提供详细的日志输出
- ✅ 支持 dry-run 模式，可以先查看需要修复的数据

#### 方法 B：手动 SQL 清理

如果不想使用脚本，也可以手动执行 SQL：

```sql
-- 查找所有 works_id 不存在于 works_entity 表中的记录
SELECT id, works_id
FROM rsvp_form_config_entity
WHERE works_id NOT IN (SELECT id FROM works_entity);

-- 删除这些无效记录（请根据实际情况决定是删除还是修复）
-- 如果确定要删除：
-- DELETE FROM rsvp_form_config_entity
-- WHERE works_id NOT IN (SELECT id FROM works_entity);

-- 查找重复的 works_id（一个作品有多个配置的情况）
SELECT works_id, COUNT(*) as count
FROM rsvp_form_config_entity
WHERE deleted = false
GROUP BY works_id
HAVING COUNT(*) > 1;

-- 对于重复的记录，需要决定保留哪一个，删除其他的
-- 建议保留最新的（create_time 最大的）或 enabled = true 的
```

### 2. 执行 Prisma 迁移

数据清理完成后，执行 Prisma 迁移：

```bash
cd packages/jiantie/v11-database

# 开发环境：生成迁移文件并应用
npx prisma migrate dev --name add_rsvp_works_foreign_key

# 生产环境：应用已生成的迁移
npx prisma migrate deploy
```

迁移将：

- 创建外键约束 `FK_rsvp_form_config_works_id`
- 创建唯一约束 `UQ_rsvp_form_config_works_id`
- 建立 `WorksEntity.rsvp_form_config` 关联关系

### 3. 验证迁移结果

```sql
-- 验证外键约束是否生效
SELECT
  r.id,
  r.works_id,
  w.id as works_exists,
  w.title as works_title
FROM rsvp_form_config_entity r
LEFT JOIN works_entity w ON r.works_id = w.id
WHERE w.id IS NULL;  -- 应该返回空结果

-- 验证唯一约束是否生效
SELECT works_id, COUNT(*) as count
FROM rsvp_form_config_entity
WHERE deleted = false
GROUP BY works_id
HAVING COUNT(*) > 1;  -- 应该返回空结果
```

## 回滚方案

如果需要回滚，执行以下步骤：

```sql
-- 1. 删除外键约束和唯一约束
ALTER TABLE rsvp_form_config_entity
DROP CONSTRAINT IF EXISTS "UQ_rsvp_form_config_works_id";

ALTER TABLE rsvp_form_config_entity
DROP CONSTRAINT IF EXISTS "FK_rsvp_form_config_works_id";

-- 2. 恢复 Prisma schema 到之前的版本
-- 3. 重新生成 Prisma Client
```

## 注意事项

1. **数据完整性**：迁移前必须确保所有 `works_id` 都存在于 `works_entity` 表中
2. **唯一性**：确保每个作品只有一个未删除的 RSVP 配置
3. **备份**：执行迁移前请务必备份数据库
4. **测试环境**：建议先在测试环境验证迁移脚本
5. **停机时间**：根据数据量大小，可能需要短暂的停机时间

## 迁移后代码变更

迁移完成后，代码层面需要做以下调整：

1. **RSVPContext**：不再依赖 `editorSDK` 和 `layer` 来更新画布数据
2. **数据查询**：可以直接通过 `WorksEntity.rsvp_form_config` 关联查询
3. **数据创建**：创建 RSVP 配置时，确保 `works_id` 必须存在且唯一

## 常见问题

### Q: 如果发现无效的 works_id 怎么办？

A: 需要根据业务逻辑决定：

- 如果对应的作品已被删除，可以删除该 RSVP 配置
- 如果作品 ID 错误，需要修正为正确的作品 ID

### Q: 如果一个作品有多个 RSVP 配置怎么办？

A: 需要根据业务逻辑决定保留哪一个：

- 建议保留 `enabled = true` 的配置
- 如果都是 `enabled = false`，保留最新的（`create_time` 最大的）
- 删除其他重复的配置

### Q: 迁移会影响现有功能吗？

A: 不会。迁移只是添加了数据完整性约束，不会改变现有的业务逻辑。但建议在低峰期执行迁移。
