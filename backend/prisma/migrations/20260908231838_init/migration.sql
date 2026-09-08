-- CreateTable
CREATE TABLE "endpoint" (
    "id" SERIAL NOT NULL,
    "agentId" UUID NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "osName" TEXT,
    "osVersion" TEXT,
    "status" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric" (
    "id" SERIAL NOT NULL,
    "endpointId" INTEGER NOT NULL,
    "cpuPercent" DOUBLE PRECISION,
    "memoryUsed" DOUBLE PRECISION,
    "memoryTotal" DOUBLE PRECISION,
    "diskUsed" DOUBLE PRECISION,
    "diskTotal" DOUBLE PRECISION,
    "netBytesSent" BIGINT,
    "netBytesRecv" BIGINT,
    "collectedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_event" (
    "id" SERIAL NOT NULL,
    "endpointId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" SERIAL NOT NULL,
    "endpointId" INTEGER NOT NULL,
    "metricId" INTEGER,
    "metricType" TEXT NOT NULL,
    "thresholdValue" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "endpoint_agentId_key" ON "endpoint"("agentId");

-- CreateIndex
CREATE INDEX "metric_endpointId_idx" ON "metric"("endpointId");

-- CreateIndex
CREATE INDEX "metric_collectedAt_idx" ON "metric"("collectedAt");

-- CreateIndex
CREATE INDEX "file_event_endpointId_idx" ON "file_event"("endpointId");

-- CreateIndex
CREATE INDEX "file_event_occurredAt_idx" ON "file_event"("occurredAt");

-- CreateIndex
CREATE INDEX "alert_endpointId_idx" ON "alert"("endpointId");

-- CreateIndex
CREATE INDEX "alert_metricId_idx" ON "alert"("metricId");

-- CreateIndex
CREATE INDEX "alert_triggeredAt_idx" ON "alert"("triggeredAt");

-- AddForeignKey
ALTER TABLE "metric" ADD CONSTRAINT "metric_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_event" ADD CONSTRAINT "file_event_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "metric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
