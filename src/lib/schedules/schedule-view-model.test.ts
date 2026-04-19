import { describe, expect, it, vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import { getDayOfWeekLabel } from '@/lib/schedules/schedule-utils';
import { createCalendarEventsForRange, toScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import type { CalendarEvent } from '@schedule-x/calendar';

function timeAt(hours: number, minutes: number) {
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

describe('schedule-view-model', () => {
    it('maps a prisma schedule and orders slots by day then time', () => {
        const schedule = toScheduleViewModel({
            id: 'schedule-1',
            type: ScheduleType.EVENT,
            active: true,
            startDate: new Date('2026-04-20T00:00:00.000Z'),
            endDate: new Date('2026-04-20T00:00:00.000Z'),
            createdAt: new Date('2026-04-01T10:00:00.000Z'),
            updatedAt: new Date('2026-04-10T12:00:00.000Z'),
            playlistId: 'playlist-1',
            channelId: 'channel-1',
            playlist: {name: 'Actus'},
            channel: {name: 'Hall'},
            timeSlots: [
                {dayOfWeek: DayOfWeek.MONDAY, startTime: timeAt(14, 0), endTime: timeAt(15, 0)},
                {dayOfWeek: DayOfWeek.MONDAY, startTime: timeAt(9, 0), endTime: timeAt(10, 0)},
            ],
        });

        expect(schedule.playlistName).toBe('Actus');
        expect(schedule.channelName).toBe('Hall');
        expect(schedule.daysLabel).toBe(getDayOfWeekLabel(DayOfWeek.MONDAY));
        expect(schedule.timeLabel).toBe('09:00 - 10:00');
        expect(schedule.slots.map((slot) => slot.startTime)).toEqual([
            '1970-01-01T09:00:00.000Z',
            '1970-01-01T14:00:00.000Z',
        ]);
    });

    it('creates events for active schedules in range and handles end-of-day slots', () => {
        const createZonedDateTime = vi.fn((value: string): CalendarEvent['start'] => Temporal.ZonedDateTime.from(value));

        const events = createCalendarEventsForRange({
            schedules: [
                {
                    id: 'schedule-rec',
                    type: ScheduleType.RECURRING,
                    active: true,
                    playlistId: 'playlist-1',
                    playlistName: 'Matin',
                    channelId: 'channel-1',
                    channelName: 'Hall',
                    startDate: null,
                    endDate: null,
                    daysLabel: 'Lun',
                    dateLabel: 'Toujours active',
                    timeLabel: '23:00 - 24:00',
                    lifecycleStatus: 'ongoing',
                    updatedAt: '2026-04-10T10:00:00.000Z',
                    createdAt: '2026-04-01T10:00:00.000Z',
                    slots: [{
                        dayOfWeek: DayOfWeek.MONDAY,
                        startTime: '1970-01-01T23:00:00.000Z',
                        endTime: '1970-01-01T23:59:59.999Z',
                    }],
                },
                {
                    id: 'schedule-off',
                    type: ScheduleType.EVENT,
                    active: false,
                    playlistId: 'playlist-2',
                    playlistName: 'Inactif',
                    channelId: 'channel-1',
                    channelName: 'Hall',
                    startDate: null,
                    endDate: null,
                    daysLabel: 'Lun',
                    dateLabel: 'Toujours active',
                    timeLabel: '10:00 - 11:00',
                    lifecycleStatus: 'ongoing',
                    updatedAt: '2026-04-10T10:00:00.000Z',
                    createdAt: '2026-04-01T10:00:00.000Z',
                    slots: [{
                        dayOfWeek: DayOfWeek.MONDAY,
                        startTime: '1970-01-01T10:00:00.000Z',
                        endTime: '1970-01-01T11:00:00.000Z',
                    }],
                },
            ],
            startDate: '2026-04-20',
            endDate: '2026-04-20',
            timezone: 'Europe/Paris',
            createZonedDateTime,
        });

        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            scheduleId: 'schedule-rec',
            title: 'Matin',
        });
        expect(events[0]?.start?.toString()).toBe('2026-04-20T23:00:00+02:00[Europe/Paris]');
        expect(events[0]?.end?.toString()).toBe('2026-04-21T00:00:00+02:00[Europe/Paris]');
        expect(createZonedDateTime).toHaveBeenCalledTimes(2);
    });
});
