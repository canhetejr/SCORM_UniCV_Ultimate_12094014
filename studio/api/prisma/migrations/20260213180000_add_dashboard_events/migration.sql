-- CreateTable
CREATE TABLE "DashboardEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardEvent_accountId_idx" ON "DashboardEvent"("accountId");

-- CreateIndex
CREATE INDEX "DashboardEvent_type_idx" ON "DashboardEvent"("type");

-- CreateIndex
CREATE INDEX "DashboardEvent_createdAt_idx" ON "DashboardEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "DashboardEvent" ADD CONSTRAINT "DashboardEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
