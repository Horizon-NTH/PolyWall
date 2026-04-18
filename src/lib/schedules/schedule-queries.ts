import { notFound } from 'next/navigation';

import { ScheduleType } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { createScheduleDraft, findScheduleConflicts } from '@/lib/schedules/schedule-utils';
import { toScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import { resolveThumbUrl, type StorageObjectRef } from '@/lib/storage/presigned-url';
import { formatDurationSeconds } from '@/lib/utils';

async function buildPlaylistPreviewData(playlist: {
    id: string;
    name: string;
    items: Array<{
        mediaItem: {
            title: string;
            durationSeconds: number;
            files: StorageObjectRef[];
        };
    }>;
}) {
    const totalDurationSeconds = playlist.items.reduce((sum, item) => sum + item.mediaItem.durationSeconds, 0);

    return {
        id: playlist.id,
        name: playlist.name,
        mediaCount: playlist.items.length,
        totalDurationSeconds,
        totalDurationLabel: formatDurationSeconds(totalDurationSeconds),
        previewItems: await Promise.all(playlist.items.slice(0, 3).map(async (item) => ({
            title: item.mediaItem.title,
            thumbUrl: await resolveThumbUrl(item.mediaItem.files[0] ?? null),
        }))),
    };
}

export async function getOrganizationChannels(organizationId: string) {
    return prisma.channel.findMany({
        where: {organizationId},
        select: {
            id: true,
            name: true,
        },
        orderBy: {name: 'asc'},
    });
}

export async function getScheduleFormOptions(organizationId: string) {
    const [channels, playlists] = await Promise.all([
        prisma.channel.findMany({
            where: {organizationId},
            select: {
                id: true,
                name: true,
            },
            orderBy: {name: 'asc'},
        }),
        prisma.playlist.findMany({
            where: {organizationId},
            select: {
                id: true,
                name: true,
                items: {
                    orderBy: {orderIndex: 'asc'},
                    select: {
                        mediaItem: {
                            select: {
                                title: true,
                                durationSeconds: true,
                                files: {
                                    where: {
                                        variant: 'THUMB',
                                        status: 'READY',
                                        variantIndex: 0,
                                    },
                                    select: {
                                        storageBucket: true,
                                        objectKey: true,
                                    },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {name: 'asc'},
        }),
    ]);

    return {
        channels,
        playlists: await Promise.all(playlists.map((playlist) => buildPlaylistPreviewData(playlist))),
    };
}

export async function getScheduleByIdInOrganization(scheduleId: string, organizationId: string) {
    const schedule = await prisma.playlistSchedule.findFirst({
        where: {
            id: scheduleId,
            channel: {
                organizationId,
            },
        },
        select: {
            id: true,
            type: true,
            active: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            playlistId: true,
            channelId: true,
            playlist: {
                select: {
                    name: true,
                },
            },
            channel: {
                select: {
                    name: true,
                },
            },
            timeSlots: {
                select: {
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                },
                orderBy: [
                    {dayOfWeek: 'asc'},
                    {startTime: 'asc'},
                ],
            },
        },
    });

    if (!schedule) notFound();

    return schedule;
}

export async function getChannelSchedulesOverview(organizationId: string, channelId: string) {
    const channel = await prisma.channel.findFirst({
        where: {
            id: channelId,
            organizationId,
        },
        select: {
            id: true,
            name: true,
            displayTemplate: {
                select: {
                    name: true,
                },
            },
            _count: {
                select: {
                    screens: true,
                },
            },
            schedules: {
                select: {
                    id: true,
                    type: true,
                    active: true,
                    startDate: true,
                    endDate: true,
                    createdAt: true,
                    updatedAt: true,
                    playlistId: true,
                    channelId: true,
                    playlist: {
                        select: {
                            id: true,
                            name: true,
                            items: {
                                orderBy: {orderIndex: 'asc'},
                                select: {
                                    mediaItem: {
                                        select: {
                                            title: true,
                                            durationSeconds: true,
                                            files: {
                                                where: {
                                                    variant: 'THUMB',
                                                    status: 'READY',
                                                    variantIndex: 0,
                                                },
                                                select: {
                                                    storageBucket: true,
                                                    objectKey: true,
                                                },
                                                take: 1,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    channel: {
                        select: {
                            name: true,
                        },
                    },
                    timeSlots: {
                        select: {
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true,
                        },
                        orderBy: [
                            {dayOfWeek: 'asc'},
                            {startTime: 'asc'},
                        ],
                    },
                },
                orderBy: {updatedAt: 'desc'},
            },
        },
    });

    if (!channel) notFound();

    const defaultSchedule = channel.schedules.find((schedule) => schedule.type === ScheduleType.DEFAULT) ?? null;
    const plannedSchedules = channel.schedules.filter((schedule) => schedule.type !== ScheduleType.DEFAULT);
    const plannedScheduleRows = plannedSchedules.map(toScheduleViewModel);
    const conflicts = createDisplayedConflicts(plannedSchedules);

    return {
        channel,
        defaultSchedule: defaultSchedule ? toScheduleViewModel(defaultSchedule) : null,
        defaultSchedulePlaylist: defaultSchedule ? await buildPlaylistPreviewData(defaultSchedule.playlist) : null,
        plannedScheduleRows,
        conflicts,
    };
}

function createDisplayedConflicts(schedules: Parameters<typeof toScheduleViewModel>[0][]) {
    const conflicts = schedules.flatMap((schedule) => findScheduleConflicts(
        createScheduleDraft({
            scheduleId: schedule.id,
            channelId: schedule.channelId,
            playlistId: schedule.playlistId,
            type: schedule.type,
            active: schedule.active,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            slots: schedule.timeSlots,
        }),
        schedules.map((current) => ({
            id: current.id,
            type: current.type,
            active: current.active,
            startDate: current.startDate,
            endDate: current.endDate,
            playlist: current.playlist,
            timeSlots: current.timeSlots,
        })),
    ));

    const unique = new Map<string, (typeof conflicts)[number]>();
    for (const conflict of conflicts) {
        const key = [conflict.scheduleId, conflict.conflictingScheduleId].sort().join(':');
        if (!unique.has(key)) {
            unique.set(key, conflict);
        }
    }

    return Array.from(unique.values());
}
