-- AlterTable
ALTER TABLE "endpoint" ADD COLUMN     "clientId" INTEGER,
ADD COLUMN     "credentialHash" TEXT,
ADD COLUMN     "credentialIssuedAt" TIMESTAMP(3),
ADD COLUMN     "credentialRevokedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_token" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "enrollment_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_name_key" ON "client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_token_tokenHash_key" ON "enrollment_token"("tokenHash");

-- CreateIndex
CREATE INDEX "enrollment_token_clientId_idx" ON "enrollment_token"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "endpoint_credentialHash_key" ON "endpoint"("credentialHash");

-- CreateIndex
CREATE INDEX "endpoint_clientId_idx" ON "endpoint"("clientId");

-- AddForeignKey
ALTER TABLE "endpoint" ADD CONSTRAINT "endpoint_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_token" ADD CONSTRAINT "enrollment_token_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

