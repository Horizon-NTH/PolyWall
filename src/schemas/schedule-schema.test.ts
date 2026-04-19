import { describe, expect, it } from 'vitest';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import { scheduleCreateSchema } from '@/schemas/schedule-schema';

describe('schedule-schema', () => {
    it('accepts a valid default schedule', () => {
        const result = scheduleCreateSchema.safeParse({
            type: ScheduleType.DEFAULT,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
        });

        expect(result.success).toBe(true);
    });

    it('accepts an event with explicit date and time range', () => {
        const result = scheduleCreateSchema.safeParse({
            type: ScheduleType.EVENT,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            date: '2026-04-18',
            endDate: '2026-04-20',
            startTime: '15:00',
            endMode: 'time',
            endTime: '24:00',
        });

        expect(result.success).toBe(true);
    });

    it('accepts a recurring schedule with playlist end mode', () => {
        const result = scheduleCreateSchema.safeParse({
            type: ScheduleType.RECURRING,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
            startTime: '08:00',
            endMode: 'playlist',
        });

        expect(result.success).toBe(true);
    });

    it('rejects missing end time when end mode is explicit time', () => {
        const result = scheduleCreateSchema.safeParse({
            type: ScheduleType.RECURRING,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            daysOfWeek: [DayOfWeek.MONDAY],
            startTime: '08:00',
            endMode: 'time',
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues.some((issue) => issue.path[0] === 'endTime')).toBe(true);
    });

    it('rejects an event end date before the start date', () => {
        const result = scheduleCreateSchema.safeParse({
            type: ScheduleType.EVENT,
            channelId: 'channel-1',
            playlistId: 'playlist-1',
            active: true,
            date: '2026-04-20',
            endDate: '2026-04-18',
            startTime: '15:00',
            endMode: 'time',
            endTime: '16:30',
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues.some((issue) => issue.path[0] === 'endDate')).toBe(true);
    });
});
