-- Enterprise user management expansion
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE "UserLifecycleStatus" AS ENUM ('invited', 'active', 'suspended', 'offboarded', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmploymentType" AS ENUM ('employee', 'contractor', 'temp');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssignmentStatus" AS ENUM ('active', 'paused', 'ended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RateCardStatus" AS ENUM ('pending', 'active', 'superseded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChangeType" AS ENUM ('rate_change', 'assignment_change', 'user_access_change');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChangeRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "manager_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "employment_type" "EmploymentType" NOT NULL DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS "offboarded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_identity_sync_at" TIMESTAMP(3);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "status_new" "UserLifecycleStatus" NOT NULL DEFAULT 'active';

UPDATE "users"
SET "status_new" = CASE
  WHEN "status" IN ('invited', 'active', 'suspended', 'offboarded', 'archived') THEN "status"::"UserLifecycleStatus"
  WHEN "status" = 'inactive' THEN 'suspended'::"UserLifecycleStatus"
  ELSE 'active'::"UserLifecycleStatus"
END;

ALTER TABLE "users" DROP COLUMN IF EXISTS "status";
ALTER TABLE "users" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "users"
  ADD CONSTRAINT "users_manager_user_id_fkey"
  FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "project_assignments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "org_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "role_on_project" TEXT NOT NULL,
  "allocation_pct" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'active',
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "project_assignments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "project_assignments_valid_dates_chk" CHECK ("end_date" IS NULL OR "end_date" >= "start_date"),
  CONSTRAINT "project_assignments_allocation_pct_chk" CHECK ("allocation_pct" >= 0 AND "allocation_pct" <= 100)
);

CREATE INDEX IF NOT EXISTS "project_assignments_org_user_project_idx"
  ON "project_assignments" ("org_id", "user_id", "project_id");
CREATE INDEX IF NOT EXISTS "project_assignments_project_status_dates_idx"
  ON "project_assignments" ("project_id", "status", "start_date", "end_date");

ALTER TABLE "project_assignments"
  ADD CONSTRAINT "project_assignments_no_overlap"
  EXCLUDE USING GIST (
    "user_id" WITH =,
    "project_id" WITH =,
    daterange("start_date", COALESCE("end_date", 'infinity'::date), '[]') WITH &&
  );

CREATE TABLE IF NOT EXISTS "rate_cards" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "org_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT,
  "pay_rate" DECIMAL(12,4) NOT NULL,
  "bill_rate" DECIMAL(12,4),
  "currency" CHAR(3) NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "status" "RateCardStatus" NOT NULL DEFAULT 'active',
  "change_reason" TEXT,
  "requested_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_cards_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rate_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rate_cards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rate_cards_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "rate_cards_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "rate_cards_valid_dates_chk" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE INDEX IF NOT EXISTS "rate_cards_lookup_idx"
  ON "rate_cards" ("org_id", "user_id", "project_id", "effective_from", "effective_to");
CREATE INDEX IF NOT EXISTS "rate_cards_org_status_idx"
  ON "rate_cards" ("org_id", "status");

ALTER TABLE "rate_cards"
  ADD CONSTRAINT "rate_cards_no_overlap_scope"
  EXCLUDE USING GIST (
    "org_id" WITH =,
    "user_id" WITH =,
    (COALESCE("project_id", 'GLOBAL')) WITH =,
    daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[]') WITH &&
  );

CREATE TABLE IF NOT EXISTS "admin_change_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "org_id" TEXT NOT NULL,
  "change_type" "ChangeType" NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "payload" JSONB NOT NULL,
  "critical_reason" TEXT,
  "status" "ChangeRequestStatus" NOT NULL DEFAULT 'pending',
  "requested_by" TEXT NOT NULL,
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_change_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "admin_change_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "admin_change_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "admin_change_requests_reviewer_diff_chk" CHECK ("reviewed_by" IS NULL OR "reviewed_by" <> "requested_by"),
  CONSTRAINT "admin_change_requests_review_required_chk" CHECK ("status" <> 'approved' OR "reviewed_by" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "admin_change_requests_org_status_type_created_idx"
  ON "admin_change_requests" ("org_id", "status", "change_type", "created_at");

CREATE TABLE IF NOT EXISTS "user_lifecycle_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "org_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_lifecycle_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_lifecycle_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_lifecycle_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_lifecycle_events_org_user_created_idx"
  ON "user_lifecycle_events" ("org_id", "user_id", "created_at");

CREATE TABLE IF NOT EXISTS "webhook_event_log" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "event_type" TEXT NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "error_message" TEXT
);

CREATE INDEX IF NOT EXISTS "webhook_event_log_status_received_idx"
  ON "webhook_event_log" ("status", "received_at");

CREATE TABLE IF NOT EXISTS "api_rate_limit_counters" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "window_start" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "api_rate_limit_counters_window_start_idx"
  ON "api_rate_limit_counters" ("window_start");

-- Backfill new tables from legacy project_allocations
INSERT INTO "project_assignments" (
  "id",
  "org_id",
  "user_id",
  "project_id",
  "role_on_project",
  "allocation_pct",
  "start_date",
  "end_date",
  "status",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at"
)
SELECT
  pa."id",
  p."org_id",
  pa."user_id",
  pa."project_id",
  pa."role_on_project",
  100,
  pa."start_date",
  pa."end_date",
  CASE WHEN pa."is_active" THEN 'active'::"AssignmentStatus" ELSE 'ended'::"AssignmentStatus" END,
  pa."user_id",
  pa."user_id",
  pa."created_at",
  CURRENT_TIMESTAMP
FROM "project_allocations" pa
JOIN "projects" p ON p."id" = pa."project_id"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "rate_cards" (
  "id",
  "org_id",
  "user_id",
  "project_id",
  "pay_rate",
  "bill_rate",
  "currency",
  "effective_from",
  "effective_to",
  "status",
  "change_reason",
  "requested_by",
  "approved_by",
  "approved_at",
  "created_at",
  "updated_at"
)
SELECT
  pa."id" || '_rate',
  p."org_id",
  pa."user_id",
  pa."project_id",
  pa."hourly_rate",
  NULL,
  'USD',
  pa."start_date",
  pa."end_date",
  CASE WHEN pa."is_active" THEN 'active'::"RateCardStatus" ELSE 'superseded'::"RateCardStatus" END,
  'Backfilled from project_allocations',
  pa."user_id",
  pa."user_id",
  pa."created_at",
  pa."created_at",
  CURRENT_TIMESTAMP
FROM "project_allocations" pa
JOIN "projects" p ON p."id" = pa."project_id"
ON CONFLICT ("id") DO NOTHING;
