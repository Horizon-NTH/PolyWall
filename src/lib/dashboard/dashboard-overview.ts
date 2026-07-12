import { Temporal } from 'temporal-polyfill';

import { DayOfWeek, ScheduleType, ScreenStatus } from '@/generated/prisma/enums';
import { formatDateOnlyParts, formatDateOnlyUTC } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import { timeToEndMinutes, timeToMinutes } from '@/lib/schedules/schedule-utils';

type ScheduleCandidate = {
    id: string;
    type: ScheduleType;
    active: boolean;
    startDate: Date | null;
    endDate: Date | null;
    updatedAt: Date;
    playlist: {
        id: string;
        name: string;
        _count: {
            items: number;
        };
    };
    timeSlots: Array<{
        dayOfWeek: DayOfWeek;
        startTime: Date;
        endTime: Date;
    }>;
};

const SCHEDULE_PRIORITY: Record<ScheduleType, number> = {
    [ScheduleType.EVENT]: 3,
    [ScheduleType.RECURRING]: 2,
    [ScheduleType.DEFAULT]: 1,
};

const DAY_OF_WEEK_BY_TEMPORAL_DAY: Record<number, DayOfWeek> = {
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
    6: DayOfWeek.SATURDAY,
    7: DayOfWeek.SUNDAY,
};

function countByKey<T extends string>(items: Array<{ _count: { _all: number }; status?: T }>, keys: readonly T[]) {
    const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
    for (const item of items) {
        if (item.status) {
            counts[item.status] = item._count._all;
        }
    }
    return counts;
}

function isScheduleDateIncluded(schedule: ScheduleCandidate, date: Temporal.PlainDate) {
    const dateKey = formatDateOnlyParts(date);
    const startDateKey = formatDateOnlyUTC(schedule.startDate);
    const endDateKey = formatDateOnlyUTC(schedule.endDate);

    if (startDateKey && dateKey < startDateKey) return false;
    return !(endDateKey && dateKey > endDateKey);
}

function resolveCurrentSchedule(
    schedules: ScheduleCandidate[],
    timezone: string,
    now: Date,
) {
    const zonedNow = Temporal.Instant
        .fromEpochMilliseconds(now.getTime())
        .toZonedDateTimeISO(timezone);
    const currentDate = zonedNow.toPlainDate();
    const currentDay = DAY_OF_WEEK_BY_TEMPORAL_DAY[zonedNow.dayOfWeek]!;
    const currentMinutes = (zonedNow.hour * 60) + zonedNow.minute + (zonedNow.second / 60);

    const candidates = schedules.filter((schedule) => {
        if (!schedule.active || !isScheduleDateIncluded(schedule, currentDate)) return false;

        return schedule.timeSlots.some((slot) => {
            if (slot.dayOfWeek !== currentDay) return false;

            const startMinutes = timeToMinutes(slot.startTime);
            const endMinutes = timeToEndMinutes(slot.endTime);
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        });
    });

    candidates.sort((left, right) => {
        const priorityDelta = SCHEDULE_PRIORITY[right.type] - SCHEDULE_PRIORITY[left.type];
        if (priorityDelta !== 0) return priorityDelta;

        const updatedAtDelta = right.updatedAt.getTime() - left.updatedAt.getTime();
        if (updatedAtDelta !== 0) return updatedAtDelta;

        return left.id.localeCompare(right.id);
    });

    return candidates[0] ?? null;
}

export async function getPlatformDashboardOverview() {
    const [
        organizationsCount,
        usersCount,
        channelsCount,
        screensCount,
        mediaItemsCount,
        playlistsCount,
        recentOrganizations,
    ] = await Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.channel.count(),
        prisma.screen.count(),
        prisma.mediaItem.count(),
        prisma.playlist.count(),
        prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        channels: true,
                        screens: true,
                        users: true,
                    },
                },
            },
            orderBy: {updatedAt: 'desc'},
            take: 5,
        }),
    ]);

    return {
        organizationsCount,
        usersCount,
        channelsCount,
        screensCount,
        mediaItemsCount,
        playlistsCount,
        recentOrganizations,
    };
}

export async function getOrganizationDashboardOverview(organizationId: string) {
    const now = new Date();

    const [
        organization,
        screenStatusGroups,
        mediaFileStatusGroups,
        channelsCount,
        playlistsCount,
        activeSchedulesCount,
        channels,
        pendingScreens,
        failedMediaItems,
        processingMediaFilesCount,
        emptyActiveSchedules,
        recentMediaItems,
    ] = await Promise.all([
        prisma.organization.findUnique({
            where: {id: organizationId},
            select: {id: true, name: true},
        }),
        prisma.screen.groupBy({
            by: ['status'],
            where: {organizationId},
            _count: {_all: true},
        }),
        prisma.mediaFile.groupBy({
            by: ['status'],
            where: {mediaItem: {organizationId}},
            _count: {_all: true},
        }),
        prisma.channel.count({where: {organizationId}}),
        prisma.playlist.count({where: {organizationId}}),
        prisma.playlistSchedule.count({
            where: {
                active: true,
                channel: {organizationId},
            },
        }),
        prisma.channel.findMany({
            where: {organizationId},
            select: {
                id: true,
                name: true,
                timezone: true,
                displayTemplate: {
                    select: {name: true},
                },
                _count: {
                    select: {
                        screens: true,
                        schedules: true,
                    },
                },
                schedules: {
                    select: {
                        id: true,
                        type: true,
                        active: true,
                        startDate: true,
                        endDate: true,
                        updatedAt: true,
                        playlist: {
                            select: {
                                id: true,
                                name: true,
                                _count: {
                                    select: {
                                        items: true,
                                    },
                                },
                            },
                        },
                        timeSlots: {
                            select: {
                                dayOfWeek: true,
                                startTime: true,
                                endTime: true,
                            },
                        },
                    },
                },
            },
            orderBy: {name: 'asc'},
            take: 8,
        }),
        prisma.screen.findMany({
            where: {
                organizationId,
                status: ScreenStatus.PENDING,
            },
            select: {
                id: true,
                name: true,
                location: true,
                updatedAt: true,
            },
            orderBy: {updatedAt: 'desc'},
            take: 5,
        }),
        prisma.mediaItem.findMany({
            where: {
                organizationId,
                files: {
                    some: {
                        status: 'FAILED',
                    },
                },
            },
            select: {
                id: true,
                title: true,
                updatedAt: true,
            },
            orderBy: {updatedAt: 'desc'},
            take: 5,
        }),
        prisma.mediaFile.count({
            where: {
                mediaItem: {organizationId},
                status: {in: ['AWAITING_UPLOAD', 'UPLOADED', 'PROCESSING']},
            },
        }),
        prisma.playlistSchedule.findMany({
            where: {
                active: true,
                channel: {organizationId},
                playlist: {
                    items: {
                        none: {},
                    },
                },
            },
            select: {
                id: true,
                type: true,
                playlist: {
                    select: {name: true},
                },
                channel: {
                    select: {name: true},
                },
            },
            orderBy: {updatedAt: 'desc'},
            take: 5,
        }),
        prisma.mediaItem.findMany({
            where: {organizationId},
            select: {
                id: true,
                title: true,
                updatedAt: true,
                files: {
                    select: {
                        status: true,
                        mimeType: true,
                    },
                    orderBy: {updatedAt: 'desc'},
                    take: 1,
                },
            },
            orderBy: {updatedAt: 'desc'},
            take: 5,
        }),
    ]);

    const screenCounts = countByKey(screenStatusGroups, [
        ScreenStatus.ACTIVE,
        ScreenStatus.PENDING,
        ScreenStatus.REVOKED,
    ] as const);
    const mediaFileCounts = countByKey(mediaFileStatusGroups, [
        'AWAITING_UPLOAD',
        'UPLOADED',
        'PROCESSING',
        'READY',
        'FAILED',
    ] as const);

    const channelRows = channels.map((channel) => {
        const currentSchedule = resolveCurrentSchedule(channel.schedules, channel.timezone, now);
        const defaultSchedule = channel.schedules.find(
            (schedule) => schedule.type === ScheduleType.DEFAULT && schedule.active,
        ) ?? null;

        return {
            id: channel.id,
            name: channel.name,
            displayTemplateName: channel.displayTemplate.name,
            screensCount: channel._count.screens,
            schedulesCount: channel._count.schedules,
            hasActiveDefaultSchedule: defaultSchedule !== null,
            currentSchedule: currentSchedule
                ? {
                    id: currentSchedule.id,
                    type: currentSchedule.type,
                    playlistId: currentSchedule.playlist.id,
                    playlistName: currentSchedule.playlist.name,
                    playlistItemsCount: currentSchedule.playlist._count.items,
                }
                : null,
        };
    });

    return {
        organization,
        stats: {
            activeScreens: screenCounts[ScreenStatus.ACTIVE],
            pendingScreens: screenCounts[ScreenStatus.PENDING],
            revokedScreens: screenCounts[ScreenStatus.REVOKED],
            readyMediaFiles: mediaFileCounts.READY,
            failedMediaFiles: mediaFileCounts.FAILED,
            processingMediaFiles: processingMediaFilesCount,
            channels: channelsCount,
            playlists: playlistsCount,
            activeSchedules: activeSchedulesCount,
        },
        channels: channelRows,
        pendingScreens,
        failedMediaItems,
        emptyActiveSchedules,
        recentMediaItems,
        channelsWithoutDefaultCount: channelRows.filter((channel) => !channel.hasActiveDefaultSchedule).length,
    };
}
