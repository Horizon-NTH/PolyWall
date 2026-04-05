import { describe, expect, it } from 'vitest';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import {
    addSecondsToTimeString,
    createScheduleDraft,
    createTimeOfDayUTC,
    findScheduleConflicts,
    formatScheduleDays,
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
