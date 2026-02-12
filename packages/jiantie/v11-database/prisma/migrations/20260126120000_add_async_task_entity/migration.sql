-- CreateEnum
CREATE TYPE "async_task_type_enum" AS ENUM ('batch_generate_covers');

-- CreateEnum
CREATE TYPE "async_task_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "async_task_entity" (
    "id" TEXT NOT NULL,
    "task_type" "async_task_type_enum" NOT NULL,
    "status" "async_task_status_enum" NOT NULL DEFAULT 'pending',
    "input_data" JSONB NOT NULL,
    "output_data" JSONB,
    "error_message" TEXT,
    "progress" JSONB,
    "created_by_uid" INTEGER,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "create_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "async_task_entity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_async_task_task_type" ON "async_task_entity"("task_type");

-- CreateIndex
CREATE INDEX "IDX_async_task_status" ON "async_task_entity"("status");

-- CreateIndex
CREATE INDEX "IDX_async_task_created_by_uid" ON "async_task_entity"("created_by_uid");

-- CreateIndex
CREATE INDEX "IDX_async_task_create_time" ON "async_task_entity"("create_time");

-- CreateIndex
CREATE INDEX "IDX_async_task_id" ON "async_task_entity"("id");
