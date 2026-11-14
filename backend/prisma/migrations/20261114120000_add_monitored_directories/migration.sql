-- AlterTable
ALTER TABLE "client" ADD COLUMN     "configuredDirectories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "configuredDirectoriesAt" TIMESTAMP(3),
ADD COLUMN     "directoriesMode" TEXT NOT NULL DEFAULT 'INSTALLATION';
-- AlterTable
ALTER TABLE "endpoint" ADD COLUMN     "configuredDirectories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "configuredDirectoriesAt" TIMESTAMP(3),
ADD COLUMN     "directoriesMode" TEXT NOT NULL DEFAULT 'INHERIT',
ADD COLUMN     "directoriesReportedAt" TIMESTAMP(3),
ADD COLUMN     "missingDirectories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "monitoredDirectories" TEXT[] DEFAULT ARRAY[]::TEXT[];
