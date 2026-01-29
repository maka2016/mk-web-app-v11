-- 迁移 admin_user_role 表：从 role_id (Int) 迁移到 admin_role_id (String)
-- 由于这是新功能，旧的 role_id 指向的是 Role 表（user.prisma），新的 admin_role_id 指向 AdminRole 表（admin.prisma）
-- 这两个表是完全独立的，所以需要先清理旧数据

-- Step 1: 检查并删除 admin_user_role 表中的旧数据（因为旧的 role_id 无法映射到新的 admin_role_id）
-- 注意：这是新功能，如果表中有测试数据，可以安全删除
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_user_role') THEN
    DELETE FROM admin_user_role;
  END IF;
END $$;

-- Step 2: 删除旧的 role_id 列（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_user_role' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE admin_user_role DROP COLUMN role_id;
  END IF;
END $$;

-- Step 3: 删除旧的唯一约束（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'UQ_admin_user_role_admin_user_id_role_id'
  ) THEN
    ALTER TABLE admin_user_role 
      DROP CONSTRAINT "UQ_admin_user_role_admin_user_id_role_id";
  END IF;
END $$;

-- Step 4: 删除旧的索引（如果存在）
DROP INDEX IF EXISTS "IDX_admin_user_role_role_id";

-- Step 5: 添加新的 admin_role_id 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_user_role' AND column_name = 'admin_role_id'
  ) THEN
    ALTER TABLE admin_user_role ADD COLUMN admin_role_id TEXT;
  END IF;
END $$;

-- Step 6: 添加新的 menu_groups 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_user_role' AND column_name = 'menu_groups'
  ) THEN
    ALTER TABLE admin_user_role ADD COLUMN menu_groups JSONB;
  END IF;
END $$;

-- Step 7: 确保 admin_role_id 不为空（在添加外键之前）
UPDATE admin_user_role SET admin_role_id = '' WHERE admin_role_id IS NULL;
ALTER TABLE admin_user_role ALTER COLUMN admin_role_id SET NOT NULL;

-- Step 8: 添加外键约束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'FK_admin_user_role_admin_role_id'
  ) THEN
    ALTER TABLE admin_user_role 
      ADD CONSTRAINT "FK_admin_user_role_admin_role_id" 
      FOREIGN KEY (admin_role_id) 
      REFERENCES admin_role(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Step 9: 添加新的唯一约束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'UQ_admin_user_role_admin_user_id_admin_role_id'
  ) THEN
    ALTER TABLE admin_user_role 
      ADD CONSTRAINT "UQ_admin_user_role_admin_user_id_admin_role_id" 
      UNIQUE (admin_user_id, admin_role_id);
  END IF;
END $$;

-- Step 10: 创建新的索引（如果不存在）
CREATE INDEX IF NOT EXISTS "IDX_admin_user_role_admin_role_id" ON admin_user_role(admin_role_id);
