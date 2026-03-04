-- Add billable and default flags to projects
ALTER TABLE "projects" ADD COLUMN "is_billable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "projects" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;
