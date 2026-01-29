-- ThemeTaskStatusEnum: draft/open/closed -> pending_review/in_progress/completed
-- Mapping:
-- - open   -> in_progress
-- - closed -> completed
-- - draft  -> in_progress

ALTER TYPE "theme_task_status_enum" RENAME TO "theme_task_status_enum_old";

CREATE TYPE "theme_task_status_enum" AS ENUM (
  'pending_review',
  'in_progress',
  'completed'
);

ALTER TABLE "theme_task_entity"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "theme_task_entity"
ALTER COLUMN "status" TYPE "theme_task_status_enum"
USING (
  CASE "status"::text
    WHEN 'open' THEN 'in_progress'
    WHEN 'closed' THEN 'completed'
    WHEN 'draft' THEN 'in_progress'
    ELSE 'in_progress'
  END
)::"theme_task_status_enum";

ALTER TABLE "theme_task_entity"
ALTER COLUMN "status" SET DEFAULT 'in_progress';

DROP TYPE "theme_task_status_enum_old";

