-- CreateEnum
CREATE TYPE "MediaStorageProvider" AS ENUM ('S3');

-- CreateEnum
CREATE TYPE "MediaFileStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN "organizationId" TEXT;

-- Backfill organization using playlist ownership when available.
UPDATE "MediaItem" mi
SET "organizationId" = source."organizationId"
FROM (
    SELECT DISTINCT ON (pi."mediaItemId")
        pi."mediaItemId",
        p."organizationId"
    FROM "PlaylistItem" pi
    JOIN "Playlist" p ON p."id" = pi."playlistId"
    ORDER BY pi."mediaItemId", p."organizationId"
) source
WHERE mi."id" = source."mediaItemId";

-- Fallback for orphan media rows.
UPDATE "MediaItem"
SET "organizationId" = (
    SELECT o."id"
    FROM "Organization" o
    ORDER BY o."createdAt" ASC
    LIMIT 1
)
WHERE "organizationId" IS NULL;

ALTER TABLE "MediaItem" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MediaFile"
    ADD COLUMN "metaJson" JSONB,
    ADD COLUMN "objectKey" TEXT,
    ADD COLUMN "originalFileName" TEXT,
    ADD COLUMN "status" "MediaFileStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "storageBucket" TEXT,
    ADD COLUMN "storageProvider" "MediaStorageProvider" NOT NULL DEFAULT 'S3';

-- Backfill legacy storagePath data into new fields.
UPDATE "MediaFile"
SET
    "storageBucket" = 'legacy-local',
    "objectKey" = "storagePath",
    "originalFileName" = split_part("storagePath", '/', array_length(string_to_array("storagePath", '/'), 1)),
    "status" = 'READY'
WHERE "objectKey" IS NULL;

ALTER TABLE "MediaFile"
    ALTER COLUMN "storageBucket" SET NOT NULL,
    ALTER COLUMN "objectKey" SET NOT NULL,
    ALTER COLUMN "originalFileName" SET NOT NULL;

DROP INDEX IF EXISTS "MediaFile_storagePath_key";
ALTER TABLE "MediaFile" DROP COLUMN "storagePath";

-- CreateIndex
CREATE INDEX "MediaItem_organizationId_createdAt_idx" ON "MediaItem"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaFile_mediaItemId_isPrimary_idx" ON "MediaFile"("mediaItemId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_storageBucket_objectKey_key" ON "MediaFile"("storageBucket", "objectKey");

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
