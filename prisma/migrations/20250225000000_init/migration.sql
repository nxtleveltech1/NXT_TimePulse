-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Organizations
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "settings" JSONB DEFAULT '{}'
);

-- Users (Clerk ID as primary key)
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT,
  "org_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'worker',
  "first_name" TEXT,
  "last_name" TEXT,
  "phone" TEXT,
  "employee_code" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "avatar_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Projects
CREATE TABLE IF NOT EXISTS "projects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "org_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "client" TEXT,
  "description" TEXT DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'active',
  "default_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "address" TEXT DEFAULT '',
  "start_date" DATE,
  "end_date" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Geozones (with PostGIS polygon)
CREATE TABLE IF NOT EXISTS "geozones" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "project_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT DEFAULT '',
  "geom" geometry(Polygon, 4326),
  "radius_m" INTEGER,
  "color" TEXT DEFAULT '#4f46e5',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "geozones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "geozone_geom_idx" ON "geozones" USING GIST ("geom");

-- Timesheets
CREATE TABLE IF NOT EXISTS "timesheets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "geozone_id" TEXT,
  "date" VARCHAR(10) NOT NULL,
  "clock_in" TIMESTAMP(3) NOT NULL,
  "clock_out" TIMESTAMP(3),
  "duration_minutes" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'geofence',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT DEFAULT '',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "break_minutes" INTEGER NOT NULL DEFAULT 0,
  "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "timesheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "timesheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "timesheets_geozone_id_fkey" FOREIGN KEY ("geozone_id") REFERENCES "geozones"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "timesheets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Geologs (with PostGIS point)
CREATE TABLE IF NOT EXISTS "geologs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "geozone_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "coords" geometry(Point, 4326),
  "device_info" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "geologs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "geologs_geozone_id_fkey" FOREIGN KEY ("geozone_id") REFERENCES "geozones"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Project allocations
CREATE TABLE IF NOT EXISTS "project_allocations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "role_on_project" TEXT NOT NULL,
  "hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_allocations_user_id_project_id_key" UNIQUE ("user_id", "project_id")
);

-- Audit log
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "details" TEXT,
  "previous_value" TEXT,
  "new_value" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
