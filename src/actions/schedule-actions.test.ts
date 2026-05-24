import { beforeEach, describe, expect, it } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule, resetAuthMocks } from '@/test/mocks/auth';
import { mockCaslModule, resetCaslMocks } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule, resetPrismaMock } from '@/test/mocks/prisma';
import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

function buildMediaItemFixture(overrides?: Partial<{
    id: string;
    title: string;
    durationSeconds: number;
    active: boolean;
    mimeType: string;
    metaJson: unknown;
}>) {
    return {
        id: overrides?.id ?? 'media-1',
        title: overrides?.title ?? 'Media',
        durationSeconds: overrides?.durationSeconds ?? 30,
        active: overrides?.active ?? true,
        files: [{
            id: `${overrides?.id ?? 'media-1'}-file`,
            status: 'READY',
            variant: 'ORIGINAL',
            variantIndex: 0,
            sourceMediaFileId: null,
            mimeType: overrides?.mimeType ?? 'image/png',
            metaJson: overrides?.metaJson ?? null,
        }],
    };
}

describe('schedule-actions', () => {
    beforeEach(async () => {
        await resetAuthMocks();
        await resetCaslMocks();
        await resetPrismaMock();
    });

    it('rejects create when user has no organization', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: null}}));

        const {createSchedule} = await import('@/actions/schedule-actions');
        const result = await createSchedule({
            type: ScheduleType.EVENT,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            date: '2026-04-18',
            startTime: '15:00',
            endMode: 'time',
            endTime: '16:00',
            daysOfWeek: [],
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Aucune organisation sélectionnée.',
        });
    });

    it('creates an event schedule', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));

        prisma.channel.findFirst.mockResolvedValueOnce({id: 'channel-1', organizationId: 'org-1', name: 'Hall'});
        prisma.playlist.findFirst.mockResolvedValueOnce({
            id: 'playlist-1',
            name: 'Actus',
            items: [{id: 'item-1', orderIndex: 0, mediaItem: buildMediaItemFixture()}],
        });
        prisma.playlistSchedule.findMany.mockResolvedValueOnce([]);
        prisma.playlistSchedule.create.mockResolvedValueOnce({id: 'schedule-1'});

        const {createSchedule} = await import('@/actions/schedule-actions');
        const result = await createSchedule({
            type: ScheduleType.EVENT,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            date: '2026-04-18',
            endDate: '2026-04-20',
            startTime: '15:00',
            endMode: 'time',
            endTime: '16:00',
            daysOfWeek: [],
        });

        expect(result).toEqual({ok: true, scheduleId: 'schedule-1'});
        expect(prisma.playlistSchedule.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                startDate: new Date('2026-04-18T00:00:00.000Z'),
                endDate: new Date('2026-04-20T00:00:00.000Z'),
            }),
        }));
    });

    it('blocks conflicting recurring schedule creation', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));

        prisma.channel.findFirst.mockResolvedValueOnce({id: 'channel-1', organizationId: 'org-1', name: 'Hall'});
        prisma.playlist.findFirst.mockResolvedValueOnce({
            id: 'playlist-1',
            name: 'Actus',
            items: [{id: 'item-1', orderIndex: 0, mediaItem: buildMediaItemFixture()}],
        });
        prisma.playlistSchedule.findMany.mockResolvedValueOnce([{
            id: 'schedule-existing',
            type: ScheduleType.RECURRING,
            active: true,
            startDate: null,
            endDate: null,
            playlist: {name: 'Playlist existante'},
            timeSlots: [{
                dayOfWeek: DayOfWeek.MONDAY,
                startTime: new Date(Date.UTC(1970, 0, 1, 8, 30, 0)),
                endTime: new Date(Date.UTC(1970, 0, 1, 10, 0, 0)),
            }],
        }]);

        const {createSchedule} = await import('@/actions/schedule-actions');
        const result = await createSchedule({
            type: ScheduleType.RECURRING,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            daysOfWeek: [DayOfWeek.MONDAY],
            startTime: '08:00',
            endMode: 'time',
            endTime: '09:00',
            date: '',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: '1 conflit détecté.',
            conflicts: [expect.objectContaining({
                conflictingScheduleId: 'schedule-existing',
                conflictingTitle: 'Playlist existante',
                overlappingDaysLabel: 'Lun',
                overlappingTimeLabel: '08:30 - 09:00',
            })],
        });
    });

    it('uses only active media for playlist end mode', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));

        prisma.channel.findFirst.mockResolvedValueOnce({id: 'channel-1', organizationId: 'org-1', name: 'Hall'});
        prisma.playlist.findFirst.mockResolvedValueOnce({
            id: 'playlist-1',
            name: 'Actus',
            items: [
                {id: 'item-1', orderIndex: 0, mediaItem: buildMediaItemFixture({id: 'media-1', durationSeconds: 120, active: true})},
                {id: 'item-2', orderIndex: 1, mediaItem: buildMediaItemFixture({id: 'media-2', durationSeconds: 600, active: false})},
            ],
        });
        prisma.playlistSchedule.findMany.mockResolvedValueOnce([]);
        prisma.playlistSchedule.create.mockResolvedValueOnce({id: 'schedule-1'});

        const {createSchedule} = await import('@/actions/schedule-actions');
        const result = await createSchedule({
            type: ScheduleType.RECURRING,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            daysOfWeek: [DayOfWeek.MONDAY],
            startTime: '08:00',
            endMode: 'playlist',
            endTime: '',
            date: '',
        });

        expect(result).toEqual({ok: true, scheduleId: 'schedule-1'});
        expect(prisma.playlistSchedule.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                timeSlots: {
                    create: [expect.objectContaining({
                        endTime: new Date('1970-01-01T08:02:00.000Z'),
                    })],
                },
            }),
        }));
    });

    it('upserts the default schedule', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));

        prisma.channel.findFirst.mockResolvedValueOnce({id: 'channel-1', organizationId: 'org-1', name: 'Hall'});
        prisma.playlist.findFirst.mockResolvedValueOnce({
            id: 'playlist-1',
            name: 'Default',
            items: [{id: 'item-1', orderIndex: 0, mediaItem: buildMediaItemFixture()}],
        });
        prisma.playlistSchedule.findFirst.mockResolvedValueOnce({id: 'default-1'});
        prisma.playlistSchedule.update.mockResolvedValueOnce({id: 'default-1'});

        const {upsertDefaultSchedule} = await import('@/actions/schedule-actions');
        const result = await upsertDefaultSchedule({
            type: ScheduleType.DEFAULT,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            endMode: 'time',
            daysOfWeek: [],
        });

        expect(result).toEqual({ok: true, scheduleId: 'default-1'});
        expect(prisma.playlistSchedule.update).toHaveBeenCalled();
    });

    it('deletes a schedule in scope', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));

        prisma.playlistSchedule.findFirst.mockResolvedValueOnce({
            id: 'schedule-1',
            type: ScheduleType.EVENT,
            channelId: 'channel-1',
        });
        prisma.playlistSchedule.delete.mockResolvedValueOnce({id: 'schedule-1'});

        const {deleteSchedule} = await import('@/actions/schedule-actions');
        const result = await deleteSchedule('schedule-1');

        expect(result).toEqual({ok: true, scheduleId: 'schedule-1'});
    });
});
