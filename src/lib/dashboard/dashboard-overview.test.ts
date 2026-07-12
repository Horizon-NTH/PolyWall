import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DayOfWeek, MediaFileStatus, ScheduleType, ScreenStatus } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
    prisma: {
        organization: {
            count: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
        },
        user: {
            count: vi.fn(),
        },
        channel: {
            count: vi.fn(),
            findMany: vi.fn(),
        },
        screen: {
            count: vi.fn(),
            findMany: vi.fn(),
            groupBy: vi.fn(),
        },
        mediaItem: {
            count: vi.fn(),
            findMany: vi.fn(),
        },
        playlist: {
            count: vi.fn(),
        },
        playlistSchedule: {
            count: vi.fn(),
            findMany: vi.fn(),
        },
        mediaFile: {
            count: vi.fn(),
            groupBy: vi.fn(),
        },
    },
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mocks.prisma,
}));

function resetPrismaMocks() {
    Object.values(mocks.prisma).forEach((delegate) => {
        Object.values(delegate).forEach((mock) => mock.mockReset());
    });
}

function timeOfDay(hour: number, minute = 0) {
    return new Date(Date.UTC(1970, 0, 1, hour, minute));
}

describe('dashboard-overview', () => {
    beforeEach(() => {
        resetPrismaMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('builds the platform dashboard overview from global counts', async () => {
        const recentOrganizations = [{
            id: 'org-1',
            name: 'PolyWall Demo Org',
            _count: {
                channels: 2,
                screens: 3,
                users: 4,
            },
        }];

        mocks.prisma.organization.count.mockResolvedValueOnce(2);
        mocks.prisma.user.count.mockResolvedValueOnce(5);
        mocks.prisma.channel.count.mockResolvedValueOnce(7);
        mocks.prisma.screen.count.mockResolvedValueOnce(11);
        mocks.prisma.mediaItem.count.mockResolvedValueOnce(13);
        mocks.prisma.playlist.count.mockResolvedValueOnce(17);
        mocks.prisma.organization.findMany.mockResolvedValueOnce(recentOrganizations);

        const {getPlatformDashboardOverview} = await import('@/lib/dashboard/dashboard-overview');

        await expect(getPlatformDashboardOverview()).resolves.toEqual({
            organizationsCount: 2,
            usersCount: 5,
            channelsCount: 7,
            screensCount: 11,
            mediaItemsCount: 13,
            playlistsCount: 17,
            recentOrganizations,
        });
        expect(mocks.prisma.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
            orderBy: {updatedAt: 'desc'},
            take: 5,
        }));
    });

    it('builds the organization dashboard overview and resolves the active schedule', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-25T10:30:00.000Z'));

        const pendingScreens = [{
            id: 'screen-pending',
            name: 'Borne accueil',
            location: 'Hall',
            updatedAt: new Date('2026-05-25T09:00:00.000Z'),
        }];
        const failedMediaItems = [{
            id: 'media-failed',
            title: 'Vidéo indisponible',
            updatedAt: new Date('2026-05-24T09:00:00.000Z'),
        }];
        const emptyActiveSchedules = [{
            id: 'schedule-empty',
            type: ScheduleType.RECURRING,
            playlist: {name: 'Playlist vide'},
            channel: {name: 'Accueil'},
        }];
        const recentMediaItems = [{
            id: 'media-1',
            title: 'Annonce',
            updatedAt: new Date('2026-05-25T08:00:00.000Z'),
            files: [{status: MediaFileStatus.READY, mimeType: 'image/png'}],
        }];

        mocks.prisma.organization.findUnique.mockResolvedValueOnce({id: 'org-1', name: 'PolyWall Demo Org'});
        mocks.prisma.screen.groupBy.mockResolvedValueOnce([
            {status: ScreenStatus.ACTIVE, _count: {_all: 2}},
            {status: ScreenStatus.PENDING, _count: {_all: 1}},
        ]);
        mocks.prisma.mediaFile.groupBy.mockResolvedValueOnce([
            {status: MediaFileStatus.READY, _count: {_all: 3}},
            {status: MediaFileStatus.FAILED, _count: {_all: 1}},
        ]);
        mocks.prisma.channel.count.mockResolvedValueOnce(2);
        mocks.prisma.playlist.count.mockResolvedValueOnce(4);
        mocks.prisma.playlistSchedule.count.mockResolvedValueOnce(5);
        mocks.prisma.channel.findMany.mockResolvedValueOnce([
            {
                id: 'channel-1',
                name: 'Accueil',
                timezone: 'Europe/Paris',
                displayTemplate: {name: 'Modèle accueil'},
                _count: {screens: 2, schedules: 2},
                schedules: [
                    {
                        id: 'schedule-default',
                        type: ScheduleType.DEFAULT,
                        active: true,
                        startDate: null,
                        endDate: null,
                        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
                        playlist: {
                            id: 'playlist-default',
                            name: 'Défaut',
                            _count: {items: 1},
                        },
                        timeSlots: [{
                            dayOfWeek: DayOfWeek.MONDAY,
                            startTime: timeOfDay(0),
                            endTime: timeOfDay(0),
                        }],
                    },
                    {
                        id: 'schedule-event',
                        type: ScheduleType.EVENT,
                        active: true,
                        startDate: new Date('2026-05-25T00:00:00.000Z'),
                        endDate: new Date('2026-05-25T00:00:00.000Z'),
                        updatedAt: new Date('2026-05-25T08:00:00.000Z'),
                        playlist: {
                            id: 'playlist-event',
                            name: 'Événement',
                            _count: {items: 2},
                        },
                        timeSlots: [{
                            dayOfWeek: DayOfWeek.MONDAY,
                            startTime: timeOfDay(12),
                            endTime: timeOfDay(13),
                        }],
                    },
                ],
            },
            {
                id: 'channel-2',
                name: 'Salle attente',
                timezone: 'Europe/Paris',
                displayTemplate: {name: 'Modèle simple'},
                _count: {screens: 0, schedules: 0},
                schedules: [],
            },
        ]);
        mocks.prisma.screen.findMany.mockResolvedValueOnce(pendingScreens);
        mocks.prisma.mediaItem.findMany
            .mockResolvedValueOnce(failedMediaItems)
            .mockResolvedValueOnce(recentMediaItems);
        mocks.prisma.mediaFile.count.mockResolvedValueOnce(2);
        mocks.prisma.playlistSchedule.findMany.mockResolvedValueOnce(emptyActiveSchedules);

        const {getOrganizationDashboardOverview} = await import('@/lib/dashboard/dashboard-overview');
        const overview = await getOrganizationDashboardOverview('org-1');

        expect(overview).toMatchObject({
            organization: {id: 'org-1', name: 'PolyWall Demo Org'},
            stats: {
                activeScreens: 2,
                pendingScreens: 1,
                revokedScreens: 0,
                readyMediaFiles: 3,
                failedMediaFiles: 1,
                processingMediaFiles: 2,
                channels: 2,
                playlists: 4,
                activeSchedules: 5,
            },
            pendingScreens,
            failedMediaItems,
            emptyActiveSchedules,
            recentMediaItems,
            channelsWithoutDefaultCount: 1,
        });
        expect(overview.channels).toEqual([
            {
                id: 'channel-1',
                name: 'Accueil',
                displayTemplateName: 'Modèle accueil',
                screensCount: 2,
                schedulesCount: 2,
                hasActiveDefaultSchedule: true,
                currentSchedule: {
                    id: 'schedule-event',
                    type: ScheduleType.EVENT,
                    playlistId: 'playlist-event',
                    playlistName: 'Événement',
                    playlistItemsCount: 2,
                },
            },
            {
                id: 'channel-2',
                name: 'Salle attente',
                displayTemplateName: 'Modèle simple',
                screensCount: 0,
                schedulesCount: 0,
                hasActiveDefaultSchedule: false,
                currentSchedule: null,
            },
        ]);
        expect(mocks.prisma.channel.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {organizationId: 'org-1'},
            orderBy: {name: 'asc'},
            take: 8,
        }));
    });
});
