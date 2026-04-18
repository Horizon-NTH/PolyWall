import { describe, expect, it } from 'vitest';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import {
    addSecondsToTimeString,
    createEventScheduleSlots,
    createScheduleDraft,
    createTimeOfDayUTC,
    findScheduleConflicts,
    formatScheduleDays,
    formatScheduleTimeRange,
    getScheduleLifecycleStatus,
    timeToEndMinutes,
} from '@/lib/schedules/schedule-utils';

describe('schedule-utils', () => {
    it('formats recurring weekdays', () => {
        expect(formatScheduleDays([
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
        ])).toBe('Lun au ven');
    });

    it('derives an end time from playlist duration', () => {
        expect(addSecondsToTimeString('08:00', 1800)).toBe('08:30');
    });

    it('formats an all-day range with a dedicated label', () => {
        expect(formatScheduleTimeRange(
            createTimeOfDayUTC('00:00'),
            createTimeOfDayUTC('24:00'),
        )).toBe('Toute la journée');
    });

    it('treats 24:00 as end-of-day', () => {
        expect(timeToEndMinutes(createTimeOfDayUTC('23:59'))).toBe(23 * 60 + 59);
        expect(timeToEndMinutes(createTimeOfDayUTC('24:00'))).toBe(24 * 60);
    });

    it('creates event slots for each weekday covered by a date range', () => {
        expect(createEventScheduleSlots('2026-04-18', '2026-04-20', '09:00', '10:00')).toEqual([
            expect.objectContaining({dayOfWeek: DayOfWeek.SATURDAY}),
            expect.objectContaining({dayOfWeek: DayOfWeek.SUNDAY}),
            expect.objectContaining({dayOfWeek: DayOfWeek.MONDAY}),
        ]);
    });

    it('marks a past event as completed', () => {
        expect(getScheduleLifecycleStatus({
            type: ScheduleType.EVENT,
            startDate: new Date('2026-04-18T00:00:00Z'),
            endDate: new Date('2026-04-20T00:00:00Z'),
            now: new Date('2026-04-21T12:00:00Z'),
        })).toBe('completed');
    });

    it('detects conflict between two recurring schedules with overlapping slot', () => {
        const conflicts = findScheduleConflicts(
            createScheduleDraft({
                scheduleId: 'draft',
                channelId: 'channel-1',
                playlistId: 'playlist-1',
                type: ScheduleType.RECURRING,
                active: true,
                startDate: null,
                endDate: null,
                slots: [{
                    dayOfWeek: DayOfWeek.MONDAY,
                    startTime: createTimeOfDayUTC('08:00'),
                    endTime: createTimeOfDayUTC('10:00'),
                }],
            }),
            [{
                id: 'existing-1',
                type: ScheduleType.RECURRING,
                active: true,
                startDate: null,
                endDate: null,
                playlist: {
                    name: 'Actus',
                },
                timeSlots: [{
                    dayOfWeek: DayOfWeek.MONDAY,
                    startTime: createTimeOfDayUTC('09:00'),
                    endTime: createTimeOfDayUTC('11:00'),
                }],
            }],
        );

        expect(conflicts).toHaveLength(1);
    });

    it('does not detect conflict across different priorities', () => {
        const conflicts = findScheduleConflicts(
            createScheduleDraft({
                scheduleId: 'draft',
                channelId: 'channel-1',
                playlistId: 'playlist-1',
                type: ScheduleType.EVENT,
                active: true,
                startDate: new Date('2026-04-18T00:00:00Z'),
                endDate: new Date('2026-04-18T00:00:00Z'),
                slots: [{
                    dayOfWeek: DayOfWeek.SATURDAY,
                    startTime: createTimeOfDayUTC('09:00'),
                    endTime: createTimeOfDayUTC('10:00'),
                }],
            }),
            [{
                id: 'existing-1',
                type: ScheduleType.RECURRING,
                active: true,
                startDate: null,
                endDate: null,
                playlist: {
                    name: 'Actus',
                },
                timeSlots: [{
                    dayOfWeek: DayOfWeek.SATURDAY,
                    startTime: createTimeOfDayUTC('09:00'),
                    endTime: createTimeOfDayUTC('10:00'),
                }],
            }],
        );

        expect(conflicts).toHaveLength(0);
    });
});
