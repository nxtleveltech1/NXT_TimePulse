-- Add base_rate and currency columns to users table
ALTER TABLE "users" ADD COLUMN "base_rate" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "currency" CHAR(3) NOT NULL DEFAULT 'ZAR';

-- Data migration: copy payRate from the latest active global RateCard into user.base_rate
UPDATE "users" u
SET
  "base_rate" = rc."pay_rate",
  "currency" = TRIM(rc."currency")
FROM "rate_cards" rc
WHERE rc."user_id" = u.id
  AND rc."project_id" IS NULL
  AND rc."status" = 'active'
  AND rc."effective_from" = (
    SELECT MAX(rc2."effective_from")
    FROM "rate_cards" rc2
    WHERE rc2."user_id" = u.id
      AND rc2."project_id" IS NULL
      AND rc2."status" = 'active'
  );

-- Make hourly_rate nullable (null = inherit user's baseRate at billing time)
ALTER TABLE "project_allocations" ALTER COLUMN "hourly_rate" DROP NOT NULL;
ALTER TABLE "project_allocations" ALTER COLUMN "hourly_rate" DROP DEFAULT;

-- Rows with hourly_rate = 0 had no explicit rate; mark as null so baseRate is used
UPDATE "project_allocations" SET "hourly_rate" = NULL WHERE "hourly_rate" = 0;
