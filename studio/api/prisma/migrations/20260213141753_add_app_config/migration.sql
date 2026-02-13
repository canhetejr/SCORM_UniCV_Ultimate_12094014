-- CreateEnum
CREATE TYPE "VitrineSource" AS ENUM ('MANUAL', 'VIMEO_SHOWCASE');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('HTML', 'SCORM12', 'IFRAME');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VimeoConnection" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vimeoUserId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "VimeoConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vitrine" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vimeoShowcaseId" TEXT,
    "vimeoSource" "VitrineSource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "Vitrine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vimeoVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "durationSec" INTEGER,
    "embedHash" TEXT,
    "playerUrl" TEXT,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitrineVideo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vitrineId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "VitrineVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "ExportType" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "vitrineId" TEXT,
    "title" TEXT NOT NULL,
    "artifactPath" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiDeployment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "jwksKid" TEXT NOT NULL,
    "launchUrl" TEXT NOT NULL,

    CONSTRAINT "LtiDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "Account"("createdAt");

-- CreateIndex
CREATE INDEX "VimeoConnection_accountId_idx" ON "VimeoConnection"("accountId");

-- CreateIndex
CREATE INDEX "VimeoConnection_vimeoUserId_idx" ON "VimeoConnection"("vimeoUserId");

-- CreateIndex
CREATE INDEX "Vitrine_accountId_idx" ON "Vitrine"("accountId");

-- CreateIndex
CREATE INDEX "Vitrine_vimeoShowcaseId_idx" ON "Vitrine"("vimeoShowcaseId");

-- CreateIndex
CREATE INDEX "Video_accountId_idx" ON "Video"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_accountId_vimeoVideoId_key" ON "Video"("accountId", "vimeoVideoId");

-- CreateIndex
CREATE INDEX "VitrineVideo_videoId_idx" ON "VitrineVideo"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VitrineVideo_vitrineId_videoId_key" ON "VitrineVideo"("vitrineId", "videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VitrineVideo_vitrineId_position_key" ON "VitrineVideo"("vitrineId", "position");

-- CreateIndex
CREATE INDEX "ExportJob_accountId_createdAt_idx" ON "ExportJob"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

-- CreateIndex
CREATE INDEX "LtiDeployment_accountId_idx" ON "LtiDeployment"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "LtiDeployment_issuer_clientId_deploymentId_key" ON "LtiDeployment"("issuer", "clientId", "deploymentId");

-- CreateIndex
CREATE UNIQUE INDEX "AppConfig_key_key" ON "AppConfig"("key");

-- AddForeignKey
ALTER TABLE "VimeoConnection" ADD CONSTRAINT "VimeoConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitrine" ADD CONSTRAINT "Vitrine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineVideo" ADD CONSTRAINT "VitrineVideo_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "Vitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineVideo" ADD CONSTRAINT "VitrineVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiDeployment" ADD CONSTRAINT "LtiDeployment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
