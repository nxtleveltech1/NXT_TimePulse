-- Add indexes for audit log queries (entityType filter, timestamp filter, user lookup)
CREATE INDEX IF NOT EXISTS "audit_log_entity_type_timestamp_idx" ON "audit_log" ("entity_type", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "audit_log_user_id_timestamp_idx" ON "audit_log" ("user_id", "timestamp" DESC);
