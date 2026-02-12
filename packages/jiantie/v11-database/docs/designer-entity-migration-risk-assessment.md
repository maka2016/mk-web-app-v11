# DesignerEntity 迁移风险评估

## 改动概述

本次迁移涉及两个主要改动：

1. **`designer_uid` 字段改为可选**：`Int` → `Int?`
2. **添加外键关联关系**：`designer DesignerEntity? @relation(fields: [designer_uid], references: [id])`

## 对现有数据的影响分析

### 1. `designer_uid Int?` - 字段改为可选

#### 影响

- ✅ **现有数据不受影响**：如果数据库中该字段已有值，这些值会保留
- ✅ **允许 NULL 值**：新数据可以为 NULL，但现有非 NULL 值保持不变
- ⚠️ **数据库约束变更**：如果原字段有 `NOT NULL` 约束，需要先移除

#### 数据库操作

```sql
-- Prisma 会自动生成类似这样的 SQL
ALTER TABLE template_entity
ALTER COLUMN designer_uid DROP NOT NULL;  -- 如果原来有 NOT NULL 约束
```

#### 风险评估

- **风险等级**：🟢 **低**
- **原因**：只是放宽约束，不会导致数据丢失或损坏

---

### 2. 添加外键关联关系

#### 影响

这是**风险最高的改动**，需要特别注意：

#### ⚠️ 主要风险点

1. **外键约束创建失败**
   - 如果 `template_entity` 表中存在 `designer_uid` 值，但这些值在 `designer_entity` 表中不存在
   - 创建外键约束时会失败，报错类似：
     ```
     ERROR: insert or update on table "template_entity" violates foreign key constraint
     ```

2. **数据完整性要求**
   - 所有非 NULL 的 `designer_uid` 值必须在 `designer_entity` 表中有对应记录
   - 如果存在孤立数据（orphaned data），迁移会失败

3. **外键约束行为**
   - 默认情况下，外键会阻止删除被引用的设计师记录
   - 如果尝试删除一个被模板引用的设计师，会报错

#### 数据库操作

```sql
-- Prisma 会生成类似这样的 SQL
-- 1. 先创建 designer_entity 表
CREATE TABLE designer_entity (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  ...
);

-- 2. 创建外键约束（这一步可能失败！）
ALTER TABLE template_entity
ADD CONSTRAINT FK_template_designer
FOREIGN KEY (designer_uid)
REFERENCES designer_entity(id);
```

#### 风险评估

- **风险等级**：🔴 **高**
- **原因**：如果现有数据不完整，迁移会失败

---

## 迁移前必须检查的数据

### 检查脚本

在迁移前，需要运行以下检查：

```sql
-- 1. 检查 template_entity 中有多少条记录有 designer_uid
SELECT
  COUNT(*) as total_templates,
  COUNT(designer_uid) as templates_with_designer_uid,
  COUNT(*) - COUNT(designer_uid) as templates_without_designer_uid
FROM template_entity;

-- 2. 检查 designer_uid 的唯一值列表
SELECT DISTINCT designer_uid
FROM template_entity
WHERE designer_uid IS NOT NULL
ORDER BY designer_uid;

-- 3. 检查是否有重复的 designer_uid（用于后续创建设计师记录）
SELECT designer_uid, COUNT(*) as template_count
FROM template_entity
WHERE designer_uid IS NOT NULL
GROUP BY designer_uid
ORDER BY template_count DESC;
```

---

## 迁移方案

### 方案 A：数据已存在（推荐）

如果 `template_entity` 中已经有 `designer_uid` 数据，需要先创建对应的设计师记录。

#### 步骤 1：数据准备（迁移前）

```sql
-- 1. 为每个唯一的 designer_uid 创建设计师记录
-- 注意：这里假设 designer_uid 是用户ID，需要从用户表获取信息
-- 如果 designer_uid 不是用户ID，需要根据实际情况调整

INSERT INTO designer_entity (name, create_time, update_time)
SELECT
  DISTINCT ON (designer_uid)
  '设计师_' || designer_uid::text as name,  -- 临时名称，后续可手动更新
  NOW() as create_time,
  NOW() as update_time
FROM template_entity
WHERE designer_uid IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. 验证所有 designer_uid 都有对应的设计师记录
SELECT
  t.designer_uid,
  CASE
    WHEN d.id IS NULL THEN '缺少设计师记录'
    ELSE 'OK'
  END as status
FROM template_entity t
LEFT JOIN designer_entity d ON t.designer_uid = d.id
WHERE t.designer_uid IS NOT NULL
GROUP BY t.designer_uid, d.id;
```

#### 步骤 2：执行 Prisma 迁移

```bash
cd packages/jiantie/v11-database
npx prisma migrate dev --name add_designer_entity
```

#### 步骤 3：验证

```sql
-- 验证外键约束已创建
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'template_entity'
  AND kcu.column_name = 'designer_uid';
```

---

### 方案 B：数据不存在或全部为 NULL

如果 `template_entity` 中所有 `designer_uid` 都是 NULL，或者表是空的：

#### 步骤 1：直接执行迁移

```bash
cd packages/jiantie/v11-database
npx prisma migrate dev --name add_designer_entity
```

#### 步骤 2：验证

迁移应该会成功，因为外键约束允许 NULL 值。

---

## 迁移检查清单

### 迁移前 ✅

- [ ] **备份数据库**

  ```bash
  pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **检查现有数据**
  - 运行上述 SQL 检查脚本
  - 确认 `designer_uid` 的分布情况
  - 确认是否需要创建设计师记录

- [ ] **准备设计师数据**（如果方案 A）
  - 为每个唯一的 `designer_uid` 创建设计师记录
  - 验证所有 `designer_uid` 都有对应记录

- [ ] **在测试环境验证**
  - 使用生产数据快照
  - 完整执行迁移流程
  - 验证数据完整性

- [ ] **选择维护窗口**
  - 低峰期执行
  - 通知相关团队

### 迁移中 📊

- [ ] 监控数据库性能
- [ ] 监控迁移进度
- [ ] 准备随时中断（如果发现问题）

### 迁移后 ✅

- [ ] 验证外键约束已创建
- [ ] 验证数据完整性
- [ ] 验证应用功能正常
- [ ] 测试关联查询
- [ ] 监控应用性能

---

## 回滚方案

### 如果迁移失败

1. **回滚 Schema**

   ```bash
   # 如果迁移已部分执行，需要手动回滚
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

2. **手动删除外键约束**（如果需要）

   ```sql
   ALTER TABLE template_entity
   DROP CONSTRAINT IF EXISTS FK_template_designer;
   ```

3. **恢复代码**
   ```bash
   git revert <commit_hash>
   ```

### 如果迁移成功但发现问题

1. **临时方案**：保持 Schema，但代码暂时不使用关联关系
2. **修复问题**：在下一个维护窗口修复
3. **逐步迁移**：问题修复后再使用关联关系

---

## 预期影响

### 数据影响

- ✅ 现有数据不会丢失
- ✅ 现有查询不受影响（向后兼容）
- ⚠️ 需要确保数据完整性（外键约束）

### 性能影响

- ✅ 外键索引可能提升关联查询性能
- ⚠️ 外键约束会增加少量写入开销（可忽略）

### 功能影响

- ✅ 新增关联查询能力
- ⚠️ 删除设计师时需要先处理关联的模板（或使用 CASCADE）

---

## 建议

### ✅ 推荐做法

1. **先在测试环境完整验证**
2. **使用数据检查脚本预先验证**
3. **在低峰期执行迁移**
4. **充分备份和准备回滚方案**
5. **分阶段执行**（先数据准备，再 Schema 迁移）

### ⚠️ 注意事项

1. **不要在生产环境直接执行迁移**，必须先测试
2. **确保所有 designer_uid 都有对应记录**，否则迁移会失败
3. **外键约束创建后，删除操作会受限制**，需要处理关联数据

---

## 时间估算

| 阶段     | 任务                | 预计时间     | 风险等级 |
| -------- | ------------------- | ------------ | -------- |
| 1        | 数据检查和准备      | 1-2 小时     | 中       |
| 2        | Schema 迁移（测试） | 30 分钟      | 低       |
| 3        | 生产环境迁移        | 30-60 分钟   | 高       |
| 4        | 验证和监控          | 1 小时       | 低       |
| **总计** |                     | **3-5 小时** |          |

---

## 总结

### 关键风险点

1. 🔴 **外键约束创建失败**：如果现有 `designer_uid` 值在 `designer_entity` 中不存在
2. 🟡 **字段约束变更**：从 NOT NULL 改为可选（风险较低）
3. 🟢 **数据完整性**：外键约束会保证数据一致性（这是好事）

### 推荐迁移顺序

1. **数据准备** → 创建 `designer_entity` 记录
2. **Schema 迁移** → 执行 Prisma 迁移
3. **验证** → 确保一切正常
4. **代码更新** → 使用新的关联关系
