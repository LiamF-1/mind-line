/*
  Warnings:

  - You are about to drop the column `completed` on the `tasks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "public"."calendar_events" ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "completed",
ADD COLUMN     "calendar_event_id" TEXT,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" "public"."TaskStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "tasks_user_id_status_idx" ON "public"."tasks"("user_id", "status");

-- CreateIndex
CREATE INDEX "tasks_user_id_dueDate_idx" ON "public"."tasks"("user_id", "dueDate");

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
