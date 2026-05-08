/*
  Warnings:

  - The values [OVERLAY] on the enum `ZoneType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `slotName` on the `DisplayZone` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[displayZoneId]` on the table `WidgetInstance` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ZoneType_new" AS ENUM ('PLAYLIST', 'WIDGET', 'STATIC');
ALTER TABLE "DisplayZone" ALTER COLUMN "zoneType" TYPE "ZoneType_new" USING ("zoneType"::text::"ZoneType_new");
ALTER TYPE "ZoneType" RENAME TO "ZoneType_old";
ALTER TYPE "ZoneType_new" RENAME TO "ZoneType";
DROP TYPE "public"."ZoneType_old";
COMMIT;

-- DropIndex
DROP INDEX "DisplayZone_templateId_slotName_key";

-- DropIndex
DROP INDEX "WidgetInstance_displayZoneId_idx";

-- AlterTable
ALTER TABLE "DisplayTemplate" ADD COLUMN     "configurationJson" JSONB;

-- AlterTable
ALTER TABLE "DisplayZone" DROP COLUMN "slotName",
ADD COLUMN     "configurationJson" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "WidgetInstance_displayZoneId_key" ON "WidgetInstance"("displayZoneId");
