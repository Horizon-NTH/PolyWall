-- CreateEnum
CREATE TYPE "MediaFileStatus_new" AS ENUM ('AWAITING_UPLOAD', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "MediaFile" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MediaFile"
ALTER COLUMN "status" TYPE "MediaFileStatus_new"
USING (
    CASE
        WHEN "status"::text = 'PENDING' THEN 'AWAITING_UPLOAD'
        ELSE "status"::text
    END
)::"MediaFileStatus_new";

-- DropEnum
DROP TYPE "MediaFileStatus";

-- RenameEnum
ALTER TYPE "MediaFileStatus_new" RENAME TO "MediaFileStatus";

-- AlterTable
ALTER TABLE "MediaFile" ALTER COLUMN "status" SET DEFAULT 'AWAITING_UPLOAD';

-- CreateEnum
CREATE TYPE "MediaFileVariant" AS ENUM ('ORIGINAL', 'THUMB', 'RENDER');

-- AlterTable
ALTER TABLE "MediaFile"
    ADD COLUMN "sourceMediaFileId" TEXT,
    ADD COLUMN "variant" "MediaFileVariant" NOT NULL DEFAULT 'ORIGINAL',
    ADD COLUMN "variantIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_sourceMediaFileId_variant_variantIndex_key"
ON "MediaFile"("sourceMediaFileId", "variant", "variantIndex");

-- CreateIndex
CREATE INDEX "MediaFile_sourceMediaFileId_variant_idx" ON "MediaFile"("sourceMediaFileId", "variant");

-- AddForeignKey
ALTER TABLE "MediaFile"
ADD CONSTRAINT "MediaFile_sourceMediaFileId_fkey"
FOREIGN KEY ("sourceMediaFileId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
