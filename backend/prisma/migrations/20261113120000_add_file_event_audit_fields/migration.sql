-- AlterTable
ALTER TABLE "file_event" ADD COLUMN     "audited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processName" TEXT;

