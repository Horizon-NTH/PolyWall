import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import { notFoundMock } from '@/test/mocks/next-navigation';
import { getPrismaMock, mockPrismaModule, resetPrismaMock } from '@/test/mocks/prisma';
type ResolveThumbUrl = typeof import('@/lib/storage/presigned-url')['resolveThumbUrl'];
type ToScheduleViewModel = typeof import('@/lib/schedules/schedule-view-model')['toScheduleViewModel'];

const resolveThumbUrlMock = vi.fn<ResolveThumbUrl>(async (ref) => (ref ? 'https://cdn/thumb.jpg' : null));
const toScheduleViewModelMock = vi.fn<ToScheduleViewModel>((value) => ({id: `vm-${value.id}`} as ReturnType<ToScheduleViewModel>));

vi.mock('@/lib/storage/presigned-url', () => ({
    resolveThumbUrl: (...args: Parameters<ResolveThumbUrl>) => resolveThumbUrlMock(...args),
}));

vi.mock('@/lib/schedules/schedule-view-model', () => ({
    toScheduleViewModel: (...args: Parameters<ToScheduleViewModel>) => toScheduleViewModelMock(...args),
}));

mockPrismaModule();

describe('schedule-queries', () => {
    beforeEach(async () => {
        await resetPrismaMock();
        notFoundMock.mockImplementation(() => {
            throw new Error('NOT_FOUND');
        });
        resolveThumbUrlMock.mockReset();
        resolveThumbUrlMock.mockImplementation(async (ref) => (ref ? 'https://cdn/thumb.jpg' : null));
        toScheduleViewModelMock.mockReset();
        toScheduleViewModelMock.mockImplementation((value) => ({id: `vm-${value.id}`} as ReturnType<ToScheduleViewModel>));
    });

    it('returns organization channels ordered by name', async () => {
        const prisma = await getPrismaMock();
        prisma.channel.findMany.mockResolvedValueOnce([
            {id: 'channel-1', name: 'Accueil'},
            {id: 'channel-2', name: 'Restaurant'},
        ]);

        const {getOrganizationChannels} = await import('@/lib/schedules/schedule-queries');
        const result = await getOrganizationChannels('org-1');

        expect(prisma.channel.findMany).toHaveBeenCalledWith({
            where: {organizationId: 'org-1'},
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        });
        expect(result).toEqual([
            {id: 'channel-1', name: 'Accueil'},
            {id: 'channel-2', name: 'Restaurant'},
        ]);
    });

    it('builds schedule form options with playlist preview data', async () => {
        const prisma = await getPrismaMock();

        prisma.channel.findMany.mockResolvedValueOnce([{id: 'channel-1', name: 'Hall'}]);
        prisma.playlist.findMany.mockResolvedValueOnce([{
            id: 'playlist-1',
            name: 'Playlist matin',
            items: [
                {
                    mediaItem: {
                        title: 'Visuel 1',
                        durationSeconds: 120,
                        active: true,
                        files: [{storageBucket: 'b', objectKey: 'k1'}],
                    },
                },
                {
                    mediaItem: {
                        title: 'Visuel 2',
                        durationSeconds: 45,
                        active: false,
                        files: [],
                    },
                },
            ],
        }]);

        const {getScheduleFormOptions} = await import('@/lib/schedules/schedule-queries');
        const result = await getScheduleFormOptions('org-1');

        expect(result.channels).toEqual([{id: 'channel-1', name: 'Hall'}]);
        expect(result.playlists).toHaveLength(1);
        expect(result.playlists[0]).toMatchObject({
            id: 'playlist-1',
            name: 'Playlist matin',
            mediaCount: 2,
            totalDurationSeconds: 120,
            previewItems: [
                {title: 'Visuel 1', thumbUrl: 'https://cdn/thumb.jpg'},
                {title: 'Visuel 2', thumbUrl: null},
            ],
        });
        expect(resolveThumbUrlMock).toHaveBeenCalledTimes(2);
    });

    it('throws notFound when schedule is missing in organization', async () => {
        const prisma = await getPrismaMock();
        prisma.playlistSchedule.findFirst.mockResolvedValueOnce(null);

        const {getScheduleByIdInOrganization} = await import('@/lib/schedules/schedule-queries');

        await expect(getScheduleByIdInOrganization('schedule-1', 'org-1')).rejects.toThrow('NOT_FOUND');
        expect(notFoundMock).toHaveBeenCalledTimes(1);
    });

    it('returns overview with default and planned schedules', async () => {
        const prisma = await getPrismaMock();

        prisma.channel.findFirst.mockResolvedValueOnce({
            id: 'channel-1',
            name: 'Hall',
            displayTemplate: {name: 'Template A'},
            _count: {screens: 3},
            schedules: [
                {
                    id: 'default-1',
                    type: ScheduleType.DEFAULT,
                    active: true,
                    startDate: null,
                    endDate: null,
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
                    playlistId: 'playlist-default',
                    channelId: 'channel-1',
                    playlist: {
                        id: 'playlist-default',
                        name: 'Fallback',
                        items: [{
                            mediaItem: {
                                title: 'Fallback visuel',
                                durationSeconds: 40,
                                active: true,
                                files: [{storageBucket: 'b', objectKey: 'thumb'}],
                            },
                        }],
                    },
                    channel: {name: 'Hall'},
                    timeSlots: [],
                },
                {
                    id: 'planned-1',
                    type: ScheduleType.RECURRING,
                    active: true,
                    startDate: null,
                    endDate: null,
                    createdAt: new Date('2026-01-03T00:00:00.000Z'),
                    updatedAt: new Date('2026-01-04T00:00:00.000Z'),
                    playlistId: 'playlist-1',
                    channelId: 'channel-1',
                    playlist: {id: 'playlist-1', name: 'Matin', items: []},
                    channel: {name: 'Hall'},
                    timeSlots: [{
                        dayOfWeek: DayOfWeek.MONDAY,
                        startTime: new Date('1970-01-01T08:00:00.000Z'),
                        endTime: new Date('1970-01-01T09:00:00.000Z'),
                    }],
                },
            ],
        });

        const {getChannelSchedulesOverview} = await import('@/lib/schedules/schedule-queries');
        const result = await getChannelSchedulesOverview('org-1', 'channel-1');

        expect(result.channel.name).toBe('Hall');
        expect(result.defaultSchedule).toEqual({id: 'vm-default-1'});
        expect(result.plannedScheduleRows).toEqual([{id: 'vm-planned-1'}]);
        expect(result.defaultSchedulePlaylist).toMatchObject({
            id: 'playlist-default',
            name: 'Fallback',
            mediaCount: 1,
        });
        expect(toScheduleViewModelMock).toHaveBeenCalledTimes(2);
    });
});
