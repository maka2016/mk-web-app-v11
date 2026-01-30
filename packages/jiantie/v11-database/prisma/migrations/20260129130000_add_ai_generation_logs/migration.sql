-- CreateTable
CREATE TABLE "ai_template_generation_run_entity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uid" INTEGER NOT NULL,
    "appid" TEXT,
    "template_id" TEXT,
    "template_title" TEXT,
    "user_input" TEXT,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "final_snapshot" JSONB,

    CONSTRAINT "ai_template_generation_run_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_template_generation_step_entity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "iteration" INTEGER NOT NULL,
    "step_type" TEXT NOT NULL,
    "model_name" TEXT,
    "duration_ms" INTEGER,
    "request_json" JSONB,
    "prompt_text" TEXT,
    "response_text" TEXT,
    "response_json" JSONB,
    "execution_report" JSONB,
    "error" TEXT,

    CONSTRAINT "ai_template_generation_step_entity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_ai_gen_run_uid" ON "ai_template_generation_run_entity"("uid");

-- CreateIndex
CREATE INDEX "IDX_ai_gen_run_template_id" ON "ai_template_generation_run_entity"("template_id");

-- CreateIndex
CREATE INDEX "IDX_ai_gen_run_status" ON "ai_template_generation_run_entity"("status");

-- CreateIndex
CREATE INDEX "IDX_ai_gen_run_created_at" ON "ai_template_generation_run_entity"("created_at");

-- CreateIndex
CREATE INDEX "IDX_ai_gen_step_run_id" ON "ai_template_generation_step_entity"("run_id");

-- CreateIndex
CREATE INDEX "IDX_ai_gen_step_run_iter_type" ON "ai_template_generation_step_entity"("run_id", "iteration", "step_type");

-- AddForeignKey
ALTER TABLE "ai_template_generation_step_entity" ADD CONSTRAINT "ai_template_generation_step_entity_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_template_generation_run_entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
