import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

describe('schedule-actions', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const {defineAbilityFor} = await getCaslMocks();
        const prisma = await getPrismaMock();

        auth.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        prisma.channel.findFirst.mockReset();
        prisma.playlist.findFirst.mockReset();
        prisma.playlistSchedule.findFirst.mockReset();
        prisma.playlistSchedule.findMany.mockReset();
        prisma.playlistSchedule.create.mockReset();
        prisma.playlistSchedule.update.mockReset();
        prisma.playlistSchedule.delete.mockReset();
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
            items: [{mediaItem: {durationSeconds: 30}}],
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
            items: [{mediaItem: {durationSeconds: 30}}],
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
            message: 'Cette programmation chevauche "Playlist existante" sur au moins un jour et une plage horaire.',
        });
    });

    it('upserts the default schedule', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));

        prisma.channel.findFirst.mockResolvedValueOnce({id: 'channel-1', organizationId: 'org-1', name: 'Hall'});
        prisma.playlist.findFirst.mockResolvedValueOnce({
            id: 'playlist-1',
            name: 'Default',
            items: [{mediaItem: {durationSeconds: 30}}],
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
