/*
  Warnings:

  - You are about to drop the column `organizationId` on the `WidgetInstance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "WidgetInstance" DROP CONSTRAINT "WidgetInstance_organizationId_fkey";

-- DropIndex
DROP INDEX "WidgetInstance_organizationId_idx";

-- AlterTable
ALTER TABLE "WidgetInstance" DROP COLUMN "organizationId";
