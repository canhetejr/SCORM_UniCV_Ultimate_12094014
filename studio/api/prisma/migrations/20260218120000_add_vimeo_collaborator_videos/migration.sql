-- CreateTable
CREATE TABLE "VimeoCollaboratorVideo" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "vimeoVideoId" TEXT NOT NULL,
    "uri" TEXT,
    "name" TEXT,
    "description" TEXT,
    "duration" INTEGER,
    "link" TEXT,
    "embedHtml" TEXT,
    "privacy" TEXT,
    "createdTime" TIMESTAMP(3),
    "modifiedTime" TIMESTAMP(3),
    "pictures" JSONB,
    "raw" JSONB,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VimeoCollaboratorVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VimeoCollaboratorShowcaseVideo" (
    "showcaseId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "position" INTEGER,
    "addedTime" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "VimeoCollaboratorShowcaseVideo_pkey" PRIMARY KEY ("showcaseId","videoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "VimeoCollaboratorVideo_collaboratorId_vimeoVideoId_key" ON "VimeoCollaboratorVideo"("collaboratorId", "vimeoVideoId");

-- CreateIndex
CREATE INDEX "VimeoCollaboratorVideo_collaboratorId_idx" ON "VimeoCollaboratorVideo"("collaboratorId");

-- AddForeignKey
ALTER TABLE "VimeoCollaboratorVideo" ADD CONSTRAINT "VimeoCollaboratorVideo_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "VimeoCollaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VimeoCollaboratorShowcaseVideo" ADD CONSTRAINT "VimeoCollaboratorShowcaseVideo_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "VimeoCollaboratorShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VimeoCollaboratorShowcaseVideo" ADD CONSTRAINT "VimeoCollaboratorShowcaseVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VimeoCollaboratorVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
