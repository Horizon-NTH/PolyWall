/*
  Warnings:

  - You are about to drop the column `checksum` on the `MediaFile` table. All the data in the column will be lost.
  - You are about to drop the column `isPrimary` on the `MediaFile` table. All the data in the column will be lost.
  - You are about to drop the column `storageProvider` on the `MediaFile` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "MediaFile_checksum_idx";

-- DropIndex
DROP INDEX "MediaFile_mediaItemId_isPrimary_idx";

-- AlterTable
ALTER TABLE "MediaFile" DROP COLUMN "checksum",
DROP COLUMN "isPrimary",
DROP COLUMN "storageProvider";

-- DropEnum
DROP TYPE "MediaStorageProvider";
