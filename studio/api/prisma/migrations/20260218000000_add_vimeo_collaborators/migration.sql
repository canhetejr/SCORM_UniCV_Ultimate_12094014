-- CreateTable
CREATE TABLE "VimeoCollaborator" (
    "id" TEXT NOT NULL,
    "vimeoUserId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncMsg" TEXT,

    CONSTRAINT "VimeoCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VimeoCollaboratorShowcase" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "vimeoShowcaseId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "totalVideos" INTEGER,
    "modifiedTime" TIMESTAMP(3),
    "pictures" JSONB,
    "raw" JSONB,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VimeoCollaboratorShowcase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VimeoCollaborator_vimeoUserId_key" ON "VimeoCollaborator"("vimeoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "VimeoCollaboratorShowcase_collaboratorId_vimeoShowcaseId_key" ON "VimeoCollaboratorShowcase"("collaboratorId", "vimeoShowcaseId");

-- CreateIndex
CREATE INDEX "VimeoCollaboratorShowcase_collaboratorId_idx" ON "VimeoCollaboratorShowcase"("collaboratorId");

-- AddForeignKey
ALTER TABLE "VimeoCollaboratorShowcase" ADD CONSTRAINT "VimeoCollaboratorShowcase_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "VimeoCollaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
