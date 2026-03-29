/*
  Warnings:

  - You are about to drop the column `interruptionEnabled` on the `Screen` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId,deviceId]` on the table `Screen` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deviceId` to the `Screen` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScreenStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- DropIndex
DROP INDEX "Screen_organizationId_idx";

-- AlterTable
ALTER TABLE "Screen" DROP COLUMN "interruptionEnabled",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedByUserId" TEXT,
ADD COLUMN     "status" "ScreenStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "channelId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ScreenPairingToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenPairingToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenPairingToken_tokenHash_key" ON "ScreenPairingToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ScreenPairingToken_organizationId_expiresAt_idx" ON "ScreenPairingToken"("organizationId", "expiresAt");

-- CreateIndex
CREATE INDEX "Screen_organizationId_status_idx" ON "Screen"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Screen_lastSeenAt_idx" ON "Screen"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Screen_organizationId_deviceId_key" ON "Screen"("organizationId", "deviceId");

-- AddForeignKey
ALTER TABLE "ScreenPairingToken" ADD CONSTRAINT "ScreenPairingToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
