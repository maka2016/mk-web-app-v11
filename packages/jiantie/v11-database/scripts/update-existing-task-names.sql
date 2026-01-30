-- 为已有数据设置 task_name 默认值
-- 在执行迁移前，先手动执行此脚本更新已有数据
UPDATE "async_task_entity" 
SET "task_name" = '未命名任务_' || "id"::text 
WHERE "task_name" IS NULL OR "task_name" = '';
