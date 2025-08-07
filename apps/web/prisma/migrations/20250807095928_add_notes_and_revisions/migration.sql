/*
  Warnings:

  - The `tags` column on the `notes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `title` on table `notes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."notes" ALTER COLUMN "title" SET NOT NULL,
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "public"."note_revisions" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_revisions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."note_revisions" ADD CONSTRAINT "note_revisions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
