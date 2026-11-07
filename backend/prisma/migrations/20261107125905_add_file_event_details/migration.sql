-- AlterTable
ALTER TABLE "file_event" ADD COLUMN     "isDirectory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousPath" TEXT,
ADD COLUMN     "sourceIp" TEXT;

-- CreateIndex
CREATE INDEX "file_event_eventType_idx" ON "file_event"("eventType");
