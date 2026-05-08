import { createHash } from 'node:crypto';

import { Prisma } from '@/generated/prisma/client';
import { ScreenStatus } from '@/generated/prisma/enums';
import { buildDisplaySequencePlan, getDisplaySequenceDurationSeconds } from '@/lib/display-runtime/media';
import {
    type DisplayPlaylistSequence,
    type DisplayRuntimeSchedule,
    type DisplayRuntimeSnapshot,
} from '@/lib/display-runtime/types';
import { env } from '@/env';
import { asConfigurationRecord } from '@/lib/config/json-config';
import { formatDateOnlyUTC } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import { presignStorageObjectGetUrl } from '@/lib/storage/presigned-url';
import { isEndOfDayTime, timeToMinutes } from '@/lib/schedules/schedule-utils';

const displayRuntimeChannelSelect = {
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
            configurationJson: true,
            updatedAt: true,
            zones: {
                orderBy: {orderIndex: 'asc'},
                select: {
                    id: true,
                    name: true,
                    zoneType: true,
                    orderIndex: true,
                    positionX: true,
                    positionY: true,
                    width: true,
                    height: true,
                    configurationJson: true,
                    updatedAt: true,
                    widgetInstance: {
                        select: {
                            id: true,
                            active: true,
                            refreshPeriodSeconds: true,
                            configurationJson: true,
                            updatedAt: true,
                            widgetTypeId: true,
                            widgetType: {
                                select: {
                                    technicalKey: true,
                                },
                            },
                        },
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
} satisfies Prisma.ChannelSelect;

type RuntimeQueryResult = NonNullable<Awaited<ReturnType<typeof getDisplayRuntimeSourceByDeviceId>>>;
type RuntimeChannel = Prisma.ChannelGetPayload<{ select: typeof displayRuntimeChannelSelect }>;
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
            channel: {
                select: displayRuntimeChannelSelect,
            },
        },
    });
}

async function getDisplayRuntimeChannelSourceById(channelId: string, organizationId?: string | null) {
    return prisma.channel.findFirst({
        where: {
            id: channelId,
            ...(organizationId ? {organizationId} : {}),
        },
        select: displayRuntimeChannelSelect,
    });
}

function buildChannelRevisionPayload(channel: RuntimeChannel) {
    return {
        id: channel.id,
        timezone: channel.timezone,
        updatedAt: channel.updatedAt.toISOString(),
        template: {
            id: channel.displayTemplate.id,
            configurationJson: channel.displayTemplate.configurationJson,
            updatedAt: channel.displayTemplate.updatedAt.toISOString(),
            zones: channel.displayTemplate.zones.map((zone) => ({
                id: zone.id,
                zoneType: zone.zoneType,
                orderIndex: zone.orderIndex,
                configurationJson: zone.configurationJson,
                updatedAt: zone.updatedAt.toISOString(),
                widgetInstance: zone.widgetInstance?.active
                    ? {
                        id: zone.widgetInstance.id,
                        active: zone.widgetInstance.active,
                        widgetTypeId: zone.widgetInstance.widgetTypeId,
                        technicalKey: zone.widgetInstance.widgetType.technicalKey,
                        refreshPeriodSeconds: zone.widgetInstance.refreshPeriodSeconds,
                        configurationJson: zone.widgetInstance.configurationJson,
                        updatedAt: zone.widgetInstance.updatedAt.toISOString(),
                    }
                    : null,
            })),
        },
        schedules: channel.schedules.map((schedule) => ({
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
    };
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
        channel: source.channel ? buildChannelRevisionPayload(source.channel) : null,
    };
}

function buildDisplaySchedules(channel: RuntimeChannel): DisplayRuntimeSchedule[] {
    return channel.schedules.map((schedule) => ({
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

async function buildPlaylistSequences(channel: RuntimeChannel): Promise<DisplayPlaylistSequence[]> {
    const playlistMap = new Map<string, RuntimeChannel['schedules'][number]['playlist']>();
    for (const schedule of channel.schedules) {
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

async function buildRuntimeSnapshot(params: {
    channel: RuntimeChannel;
    revision: string;
    screen: DisplayRuntimeSnapshot['screen'];
}) {
    const playlists = await buildPlaylistSequences(params.channel);

    return {
        revision: params.revision,
        serverNow: new Date().toISOString(),
        screen: params.screen,
        channel: {
            id: params.channel.id,
            name: params.channel.name,
            timezone: params.channel.timezone,
            template: {
                id: params.channel.displayTemplate.id,
                name: params.channel.displayTemplate.name,
                templateKey: params.channel.displayTemplate.templateKey,
                resolutionX: params.channel.displayTemplate.resolutionX,
                resolutionY: params.channel.displayTemplate.resolutionY,
                configurationJson: asConfigurationRecord(params.channel.displayTemplate.configurationJson),
                zones: params.channel.displayTemplate.zones.map((zone) => ({
                    id: zone.id,
                    name: zone.name,
                    zoneType: zone.zoneType,
                    orderIndex: zone.orderIndex,
                    positionX: zone.positionX,
                    positionY: zone.positionY,
                    width: zone.width,
                    height: zone.height,
                    configurationJson: asConfigurationRecord(zone.configurationJson),
                    widgetInstance: zone.widgetInstance?.active
                        ? {
                            id: zone.widgetInstance.id,
                            technicalKey: zone.widgetInstance.widgetType.technicalKey,
                            active: zone.widgetInstance.active,
                            refreshPeriodSeconds: zone.widgetInstance.refreshPeriodSeconds,
                            configurationJson: asConfigurationRecord(zone.widgetInstance.configurationJson),
                        }
                        : null,
                })),
            },
        },
        schedules: buildDisplaySchedules(params.channel),
        playlists,
    } satisfies DisplayRuntimeSnapshot;
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

    return {
        screenStatus: source.status,
        snapshot: await buildRuntimeSnapshot({
            channel: source.channel,
            revision,
            screen: {
                screenId: source.id,
                channelId: source.channel.id,
                interactive: source.interactive,
                interactiveUrl: source.interactiveUrl,
                inactivityTimeoutSeconds: source.inactivityTimeoutSeconds,
            },
        }),
    };
}

export async function getDisplayRuntimeSnapshotByChannelId(channelId: string, organizationId?: string | null) {
    const channel = await getDisplayRuntimeChannelSourceById(channelId, organizationId);
    if (!channel) {
        return null;
    }

    return buildRuntimeSnapshot({
        channel,
        revision: createRevisionHash(buildChannelRevisionPayload(channel)),
        screen: {
            screenId: `channel-preview:${channel.id}`,
            channelId: channel.id,
            interactive: false,
            interactiveUrl: null,
            inactivityTimeoutSeconds: null,
        },
    });
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
