-- CreateTable
CREATE TABLE "timesheet_breaks" (
    "id" TEXT NOT NULL,
    "timesheet_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_min" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timesheet_breaks_timesheet_id_idx" ON "timesheet_breaks"("timesheet_id");

-- AddForeignKey
ALTER TABLE "timesheet_breaks" ADD CONSTRAINT "timesheet_breaks_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
