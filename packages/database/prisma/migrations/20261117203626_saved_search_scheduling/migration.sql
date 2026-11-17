-- AlterTable
ALTER TABLE "DiscoveryRun" ADD COLUMN     "querySnapshot" JSONB,
ADD COLUMN     "trigger" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "SavedSearch" ADD COLUMN     "intervalMinutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "nextRunAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "SavedSearch_enabled_nextRunAt_idx" ON "SavedSearch"("enabled", "nextRunAt");
