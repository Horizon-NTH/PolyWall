import { createHash } from 'node:crypto';

import { ScreenStatus } from '@/generated/prisma/enums';
import { buildDisplaySequencePlan, getDisplaySequenceDurationSeconds } from '@/lib/display-runtime/media';
import {
    type DisplayPlaylistSequence,
    type DisplayRuntimeSchedule,
    type DisplayRuntimeSnapshot,
} from '@/lib/display-runtime/types';
import { env } from '@/env';
import { formatDateOnlyUTC } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import { presignStorageObjectGetUrl } from '@/lib/storage/presigned-url';
import { isEndOfDayTime, timeToMinutes } from '@/lib/schedules/schedule-utils';

type RuntimeQueryResult = NonNullable<Awaited<ReturnType<typeof getDisplayRuntimeSourceByDeviceId>>>;
type RuntimeChannel = NonNullable<RuntimeQueryResult['channel']>;
type RuntimeFile = RuntimeChannel['schedules'][number]['playlist']['items'][number]['mediaItem']['files'][number];

function toEndMinutes(value: Date) {
    return isEndOfDayTime(value) ? 24 * 60 : timeToMinutes(value);
}

function createRevisionHash(value: unknown) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

async function getDisplayRuntimeSourceByDeviceId(deviceId: string) {
    return prisma.screen.findFirst({
        where: {
            deviceId,
        },
        select: {
            id: true,
            status: true,
            channelId: true,
            interactive: true,
            interactiveUrl: true,
            inactivityTimeoutSeconds: true,
            updatedAt: true,
            channel: {
                select: {
                    id: true,
                    name: true,
                    timezone: true,
                    updatedAt: true,
                    displayTemplate: {
                        select: {
                            id: true,
                            name: true,
                            templateKey: true,
                            resolutionX: true,
                            resolutionY: true,
                            updatedAt: true,
                            zones: {
                                orderBy: {orderIndex: 'asc'},
                                select: {
                                    id: true,
                                    name: true,
                                    slotName: true,
                                    zoneType: true,
                                    orderIndex: true,
                                    positionX: true,
                                    positionY: true,
                                    width: true,
                                    height: true,
                                    updatedAt: true,
                                    widgetInstances: {
                                        select: {
                                            id: true,
                                            active: true,
                                            updatedAt: true,
                                            widgetTypeId: true,
                                        },
                                        orderBy: {updatedAt: 'desc'},
                                    },
                                },
                            },
                        },
                    },
                    schedules: {
                        orderBy: {updatedAt: 'desc'},
                        select: {
                            id: true,
                            type: true,
                            active: true,
                            startDate: true,
                            endDate: true,
                            updatedAt: true,
                            playlistId: true,
                            playlist: {
                                select: {
                                    id: true,
                                    name: true,
                                    updatedAt: true,
                                    items: {
                                        orderBy: {orderIndex: 'asc'},
                                        select: {
                                            id: true,
                                            orderIndex: true,
                                            updatedAt: true,
                                            mediaItem: {
                                                select: {
                                                    id: true,
                                                    title: true,
                                                    active: true,
                                                    durationSeconds: true,
                                                    updatedAt: true,
                                                    files: {
                                                        select: {
                                                            id: true,
                                                            status: true,
                                                            variant: true,
                                                            variantIndex: true,
                                                            sourceMediaFileId: true,
                                                            mimeType: true,
                                                            storageBucket: true,
                                                            objectKey: true,
                                                            metaJson: true,
                                                            updatedAt: true,
                                                        },
                                                        orderBy: [
                                                            {variantIndex: 'asc'},
                                                            {updatedAt: 'desc'},
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            timeSlots: {
                                orderBy: [
                                    {dayOfWeek: 'asc'},
                                    {startTime: 'asc'},
                                ],
                                select: {
                                    dayOfWeek: true,
                                    startTime: true,
                                    endTime: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}

function buildRevisionPayload(source: RuntimeQueryResult) {
    return {
        screen: {
            id: source.id,
            status: source.status,
            channelId: source.channelId,
            interactive: source.interactive,
            interactiveUrl: source.interactiveUrl,
            inactivityTimeoutSeconds: source.inactivityTimeoutSeconds,
        },
        channel: source.channel
            ? {
                id: source.channel.id,
                timezone: source.channel.timezone,
                updatedAt: source.channel.updatedAt.toISOString(),
                template: {
                    id: source.channel.displayTemplate.id,
                    updatedAt: source.channel.displayTemplate.updatedAt.toISOString(),
                    zones: source.channel.displayTemplate.zones.map((zone) => ({
                        id: zone.id,
                        slotName: zone.slotName,
                        zoneType: zone.zoneType,
                        orderIndex: zone.orderIndex,
                        updatedAt: zone.updatedAt.toISOString(),
                        widgetInstances: zone.widgetInstances.map((widget) => ({
                            id: widget.id,
                            active: widget.active,
                            widgetTypeId: widget.widgetTypeId,
                            updatedAt: widget.updatedAt.toISOString(),
                        })),
                    })),
                },
                schedules: source.channel.schedules.map((schedule) => ({
                    id: schedule.id,
                    type: schedule.type,
                    active: schedule.active,
                    startDate: formatDateOnlyUTC(schedule.startDate),
                    endDate: formatDateOnlyUTC(schedule.endDate),
                    updatedAt: schedule.updatedAt.toISOString(),
                    playlist: {
                        id: schedule.playlist.id,
                        updatedAt: schedule.playlist.updatedAt.toISOString(),
                        items: schedule.playlist.items.map((item) => ({
                            id: item.id,
                            orderIndex: item.orderIndex,
                            updatedAt: item.updatedAt.toISOString(),
                            mediaItem: {
                                id: item.mediaItem.id,
                                active: item.mediaItem.active,
                                durationSeconds: item.mediaItem.durationSeconds,
                                updatedAt: item.mediaItem.updatedAt.toISOString(),
                                files: item.mediaItem.files.map((file) => ({
                                    id: file.id,
                                    status: file.status,
                                    variant: file.variant,
                                    variantIndex: file.variantIndex,
                                    sourceMediaFileId: file.sourceMediaFileId,
                                    mimeType: file.mimeType,
                                    objectKey: file.objectKey,
                                    updatedAt: file.updatedAt.toISOString(),
                                })),
                            },
                        })),
                    },
                    timeSlots: schedule.timeSlots.map((slot) => ({
                        dayOfWeek: slot.dayOfWeek,
                        startMinutes: timeToMinutes(slot.startTime),
                        endMinutes: toEndMinutes(slot.endTime),
                    })),
                })),
            }
            : null,
    };
}

function buildDisplaySchedules(source: RuntimeQueryResult): DisplayRuntimeSchedule[] {
    if (!source.channel) return [];

    return source.channel.schedules.map((schedule) => ({
        id: schedule.id,
        type: schedule.type,
        active: schedule.active,
        playlistId: schedule.playlistId,
        playlistName: schedule.playlist.name,
        startDate: formatDateOnlyUTC(schedule.startDate),
        endDate: formatDateOnlyUTC(schedule.endDate),
        updatedAt: schedule.updatedAt.toISOString(),
        slots: schedule.timeSlots.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startMinutes: timeToMinutes(slot.startTime),
            endMinutes: toEndMinutes(slot.endTime),
        })),
    }));
}

async function buildAssetDescriptor(file: RuntimeFile, width: number | null, height: number | null) {
    const signedUrl = await presignStorageObjectGetUrl({
            storageBucket: file.storageBucket,
            objectKey: file.objectKey,
        },
        env.DOWNLOAD_URL_TTL_SECONDS,
    );

    return {
        assetId: file.id,
        mediaFileId: file.id,
        cacheKey: `${file.id}:${file.updatedAt.toISOString()}`,
        signedUrl,
        expiresAt: new Date(Date.now() + (env.DOWNLOAD_URL_TTL_SECONDS * 1000)).toISOString(),
        mimeType: file.mimeType,
        width,
        height,
    };
}

async function buildPlaylistSequences(source: RuntimeQueryResult): Promise<DisplayPlaylistSequence[]> {
    if (!source.channel) return [];

    const playlistMap = new Map<string, RuntimeChannel['schedules'][number]['playlist']>();
    for (const schedule of source.channel.schedules) {
        playlistMap.set(schedule.playlist.id, schedule.playlist);
    }

    const sequences: DisplayPlaylistSequence[] = [];

    for (const playlist of playlistMap.values()) {
        const sequencePlan = buildDisplaySequencePlan(playlist.items);
        const sequenceItems = [];

        for (const item of sequencePlan) {
            sequenceItems.push({
                id: item.id,
                playlistItemId: item.playlistItemId,
                mediaItemId: item.mediaItemId,
                mediaTitle: item.mediaTitle,
                mediaKind: item.mediaKind,
                durationSeconds: item.durationSeconds,
                orderIndex: item.orderIndex,
                frameIndex: item.frameIndex,
                asset: await buildAssetDescriptor(item.file, item.width, item.height),
            });
        }

        const totalDurationSeconds = getDisplaySequenceDurationSeconds(sequenceItems);
        sequences.push({
            playlistId: playlist.id,
            playlistName: playlist.name,
            totalDurationSeconds,
            items: sequenceItems,
        });
    }

    return sequences;
}

export async function getDisplayRuntimeSnapshotByDeviceId(deviceId: string): Promise<{
    screenStatus: RuntimeQueryResult['status'] | null;
    snapshot: DisplayRuntimeSnapshot | null;
}> {
    const source = await getDisplayRuntimeSourceByDeviceId(deviceId);
    if (!source || !source.channel || source.status !== ScreenStatus.ACTIVE || !source.channelId) {
        return {
            screenStatus: source?.status ?? null,
            snapshot: null,
        };
    }

    const revision = createRevisionHash(buildRevisionPayload(source));
    const playlists = await buildPlaylistSequences(source);

    return {
        screenStatus: source.status,
        snapshot: {
            revision,
            serverNow: new Date().toISOString(),
            screen: {
                screenId: source.id,
                channelId: source.channel.id,
                interactive: source.interactive,
                interactiveUrl: source.interactiveUrl,
                inactivityTimeoutSeconds: source.inactivityTimeoutSeconds,
            },
            channel: {
                id: source.channel.id,
                name: source.channel.name,
                timezone: source.channel.timezone,
                template: {
                    id: source.channel.displayTemplate.id,
                    name: source.channel.displayTemplate.name,
                    templateKey: source.channel.displayTemplate.templateKey,
                    resolutionX: source.channel.displayTemplate.resolutionX,
                    resolutionY: source.channel.displayTemplate.resolutionY,
                    zones: source.channel.displayTemplate.zones.map((zone) => ({
                        id: zone.id,
                        name: zone.name,
                        slotName: zone.slotName,
                        zoneType: zone.zoneType,
                        orderIndex: zone.orderIndex,
                        positionX: zone.positionX,
                        positionY: zone.positionY,
                        width: zone.width,
                        height: zone.height,
                    })),
                },
            },
            schedules: buildDisplaySchedules(source),
            playlists,
        },
    };
}

export async function getDisplayStateByDeviceId(deviceId: string) {
    const source = await getDisplayRuntimeSourceByDeviceId(deviceId);
    if (!source) {
        return null;
    }

    const revision = source.channel && source.status === ScreenStatus.ACTIVE && source.channelId
        ? createRevisionHash(buildRevisionPayload(source))
        : null;

    return {
        screenId: source.id,
        status: source.status,
        channelId: source.channelId,
        interactive: source.interactive,
        interactiveUrl: source.interactiveUrl,
        inactivityTimeoutSeconds: source.inactivityTimeoutSeconds,
        serverNow: new Date().toISOString(),
        revision,
    };
}
