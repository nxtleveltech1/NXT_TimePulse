/*
  Warnings:

  - You are about to drop the column `coords` on the `geologs` table. All the data in the column will be lost.
  - You are about to drop the column `geom` on the `geozones` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "geozone_geom_idx";

-- AlterTable
ALTER TABLE "geologs" DROP COLUMN "coords";

-- AlterTable
ALTER TABLE "geozones" DROP COLUMN "geom";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "budget" DECIMAL(12,2),
ADD COLUMN     "client_rate" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "timesheets" ADD COLUMN     "adjustment_reason" TEXT,
ADD COLUMN     "is_billable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'annual',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
