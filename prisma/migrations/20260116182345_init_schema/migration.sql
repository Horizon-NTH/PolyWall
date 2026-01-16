-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'CONTENT_MANAGER');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('DEFAULT', 'RECURRING', 'EVENT');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('PLAYLIST', 'WIDGET', 'STATIC', 'OVERLAY');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistItem" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "playlistId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "checksum" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "mediaItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplayTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "resolutionX" INTEGER NOT NULL,
    "resolutionY" INTEGER NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisplayTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplayZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slotName" TEXT NOT NULL,
    "zoneType" "ZoneType" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisplayZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "interactive" BOOLEAN NOT NULL DEFAULT false,
    "interruptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "interactiveUrl" TEXT,
    "inactivityTimeoutSeconds" INTEGER,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Screen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "technicalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetInstance" (
    "id" TEXT NOT NULL,
    "configurationJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "refreshPeriodSeconds" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,
    "widgetTypeId" TEXT NOT NULL,
    "displayZoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistSchedule" (
    "id" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "type" "ScheduleType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "playlistId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTimeSlot" (
    "id" TEXT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Playlist_organizationId_idx" ON "Playlist"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_organizationId_name_key" ON "Playlist"("organizationId", "name");

-- CreateIndex
CREATE INDEX "PlaylistItem_mediaItemId_idx" ON "PlaylistItem"("mediaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistItem_playlistId_orderIndex_key" ON "PlaylistItem"("playlistId", "orderIndex");

-- CreateIndex
CREATE INDEX "MediaItem_active_idx" ON "MediaItem"("active");

-- CreateIndex
CREATE INDEX "MediaFile_mediaItemId_idx" ON "MediaFile"("mediaItemId");

-- CreateIndex
CREATE INDEX "MediaFile_checksum_idx" ON "MediaFile"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_storagePath_key" ON "MediaFile"("storagePath");

-- CreateIndex
CREATE INDEX "DisplayTemplate_organizationId_idx" ON "DisplayTemplate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayTemplate_templateKey_key" ON "DisplayTemplate"("templateKey");

-- CreateIndex
CREATE INDEX "DisplayZone_templateId_idx" ON "DisplayZone"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayZone_templateId_slotName_key" ON "DisplayZone"("templateId", "slotName");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayZone_templateId_orderIndex_key" ON "DisplayZone"("templateId", "orderIndex");

-- CreateIndex
CREATE INDEX "Channel_organizationId_idx" ON "Channel"("organizationId");

-- CreateIndex
CREATE INDEX "Channel_displayTemplateId_idx" ON "Channel"("displayTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_organizationId_name_key" ON "Channel"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Screen_organizationId_idx" ON "Screen"("organizationId");

-- CreateIndex
CREATE INDEX "Screen_channelId_idx" ON "Screen"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Screen_organizationId_name_key" ON "Screen"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetType_technicalKey_key" ON "WidgetType"("technicalKey");

-- CreateIndex
CREATE INDEX "WidgetInstance_organizationId_idx" ON "WidgetInstance"("organizationId");

-- CreateIndex
CREATE INDEX "WidgetInstance_widgetTypeId_idx" ON "WidgetInstance"("widgetTypeId");

-- CreateIndex
CREATE INDEX "WidgetInstance_displayZoneId_idx" ON "WidgetInstance"("displayZoneId");

-- CreateIndex
CREATE INDEX "PlaylistSchedule_playlistId_idx" ON "PlaylistSchedule"("playlistId");

-- CreateIndex
CREATE INDEX "PlaylistSchedule_channelId_idx" ON "PlaylistSchedule"("channelId");

-- CreateIndex
CREATE INDEX "PlaylistSchedule_type_active_idx" ON "PlaylistSchedule"("type", "active");

-- CreateIndex
CREATE INDEX "ScheduleTimeSlot_scheduleId_idx" ON "ScheduleTimeSlot"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleTimeSlot_scheduleId_dayOfWeek_startTime_endTime_key" ON "ScheduleTimeSlot"("scheduleId", "dayOfWeek", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayTemplate" ADD CONSTRAINT "DisplayTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayZone" ADD CONSTRAINT "DisplayZone_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DisplayTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_displayTemplateId_fkey" FOREIGN KEY ("displayTemplateId") REFERENCES "DisplayTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetInstance" ADD CONSTRAINT "WidgetInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetInstance" ADD CONSTRAINT "WidgetInstance_widgetTypeId_fkey" FOREIGN KEY ("widgetTypeId") REFERENCES "WidgetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetInstance" ADD CONSTRAINT "WidgetInstance_displayZoneId_fkey" FOREIGN KEY ("displayZoneId") REFERENCES "DisplayZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistSchedule" ADD CONSTRAINT "PlaylistSchedule_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistSchedule" ADD CONSTRAINT "PlaylistSchedule_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTimeSlot" ADD CONSTRAINT "ScheduleTimeSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PlaylistSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
