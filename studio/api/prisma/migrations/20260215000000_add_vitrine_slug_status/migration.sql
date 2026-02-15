-- CreateEnum
CREATE TYPE "VitrineStatus" AS ENUM ('ACTIVE', 'EDITING', 'INACTIVE');

-- AlterTable
ALTER TABLE "Vitrine" ADD COLUMN "slug" TEXT,
ADD COLUMN "status" "VitrineStatus" NOT NULL DEFAULT 'ACTIVE';
