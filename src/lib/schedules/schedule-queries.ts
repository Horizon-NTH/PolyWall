import { notFound } from 'next/navigation';

import { ScheduleType } from '@/generated/prisma/enums';
import { getPlaylistMetrics } from '@/lib/playlists/playlist-metrics';
import { prisma } from '@/lib/prisma';
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
            active: boolean;
            files: StorageObjectRef[];
        };
    }>;
}) {
    const metrics = getPlaylistMetrics(playlist.items.map((item) => ({
        durationSeconds: item.mediaItem.durationSeconds,
        active: item.mediaItem.active,
    })));

    return {
        id: playlist.id,
        name: playlist.name,
        mediaCount: metrics.mediaCount,
        totalDurationSeconds: metrics.diffusableDurationSeconds,
        totalDurationLabel: formatDurationSeconds(metrics.diffusableDurationSeconds),
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
                                active: true,
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
                                            active: true,
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

    return {
        channel,
        defaultSchedule: defaultSchedule ? toScheduleViewModel(defaultSchedule) : null,
        defaultSchedulePlaylist: defaultSchedule ? await buildPlaylistPreviewData(defaultSchedule.playlist) : null,
        plannedScheduleRows,
    };
}
