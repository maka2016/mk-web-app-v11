-- AlterTable
-- 添加 task_name 字段，分步骤处理已有数据
-- 步骤1: 先添加为可空字段
ALTER TABLE "async_task_entity" ADD COLUMN "task_name" TEXT;

-- 步骤2: 为已有数据设置默认值
UPDATE "async_task_entity" SET "task_name" = '未命名任务' WHERE "task_name" IS NULL;

-- 步骤3: 将字段设为必填
ALTER TABLE "async_task_entity" ALTER COLUMN "task_name" SET NOT NULL;
