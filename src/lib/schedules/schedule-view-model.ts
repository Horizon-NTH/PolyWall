import { type CalendarEvent } from '@schedule-x/calendar';
import 'temporal-polyfill/global';
import { Temporal } from 'temporal-polyfill';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import {
    ALL_DAYS_OF_WEEK,
    DAY_OF_WEEK_LABELS,
    SCHEDULE_TYPE_LABELS,
    formatScheduleDateRange,
    formatScheduleDays,
    formatScheduleTimeRange,
    timeToMinutes,
} from '@/lib/schedules/schedule-utils';

export type ScheduleViewModel = {
    id: string;
    type: ScheduleType;
    active: boolean;
    playlistId: string;
    playlistName: string;
    channelId: string;
    channelName: string;
    startDate: string | null;
    endDate: string | null;
    daysLabel: string;
    dateLabel: string;
    timeLabel: string;
    updatedAt: string;
    createdAt: string;
    slots: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
    }>;
};

export type ScheduleCalendarEvent = CalendarEvent & {
    scheduleId: string;
    scheduleType: ScheduleType;
};

type PrismaScheduleLike = {
    id: string;
    type: ScheduleType;
    active: boolean;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    playlistId: string;
    channelId: string;
    playlist: {
        name: string;
    };
    channel: {
        name: string;
    };
    timeSlots: Array<{
        dayOfWeek: DayOfWeek;
        startTime: Date;
        endTime: Date;
    }>;
};

const SCHEDULE_CALENDAR_IDS: Record<ScheduleType, string> = {
    [ScheduleType.DEFAULT]: 'default',
    [ScheduleType.RECURRING]: 'recurring',
    [ScheduleType.EVENT]: 'event',
};

export function toScheduleViewModel(schedule: PrismaScheduleLike): ScheduleViewModel {
    const orderedSlots = [...schedule.timeSlots].sort((a, b) => {
        const dayDelta = ALL_DAYS_OF_WEEK.indexOf(a.dayOfWeek) - ALL_DAYS_OF_WEEK.indexOf(b.dayOfWeek);
        if (dayDelta !== 0) return dayDelta;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    const firstSlot = orderedSlots[0] ?? null;

    return {
        id: schedule.id,
        type: schedule.type,
        active: schedule.active,
        playlistId: schedule.playlistId,
        playlistName: schedule.playlist.name,
        channelId: schedule.channelId,
        channelName: schedule.channel.name,
        startDate: schedule.startDate?.toISOString() ?? null,
        endDate: schedule.endDate?.toISOString() ?? null,
        daysLabel: schedule.type === ScheduleType.RECURRING
            ? formatScheduleDays(orderedSlots.map((slot) => slot.dayOfWeek))
            : firstSlot
                ? DAY_OF_WEEK_LABELS[firstSlot.dayOfWeek]
                : 'Aucun jour',
        dateLabel: formatScheduleDateRange(schedule.startDate, schedule.endDate),
        timeLabel: firstSlot ? formatScheduleTimeRange(firstSlot.startTime, firstSlot.endTime) : 'Non défini',
        updatedAt: schedule.updatedAt.toISOString(),
        createdAt: schedule.createdAt.toISOString(),
        slots: orderedSlots.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
        })),
    };
}

function formatDateKey(date: Temporal.PlainDate) {
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function includesDate(schedule: ScheduleViewModel, date: Temporal.PlainDate) {
    if (!schedule.startDate || !schedule.endDate) return true;
    const start = Temporal.PlainDate.from(schedule.startDate.slice(0, 10));
    const end = Temporal.PlainDate.from(schedule.endDate.slice(0, 10));
    return Temporal.PlainDate.compare(start, date) <= 0 && Temporal.PlainDate.compare(date, end) <= 0;
}

export function createCalendarEventsForRange(params: {
    schedules: ScheduleViewModel[];
    startDate: string;
    endDate: string;
    timezone: string;
    createZonedDateTime: (value: string) => CalendarEvent['start'];
}) {
    const events: ScheduleCalendarEvent[] = [];
    let cursor = Temporal.PlainDate.from(params.startDate);
    const endDate = Temporal.PlainDate.from(params.endDate);

    while (Temporal.PlainDate.compare(cursor, endDate) <= 0) {
        const dateKey = formatDateKey(cursor);
        const weekday = ALL_DAYS_OF_WEEK[cursor.dayOfWeek - 1];

        for (const schedule of params.schedules) {
            if (!schedule.active || !includesDate(schedule, cursor)) {
                continue;
            }

            for (const slot of schedule.slots) {
                if (slot.dayOfWeek !== weekday) continue;

                events.push({
                    id: `${schedule.id}-${dateKey}-${slot.dayOfWeek}-${slot.startTime}`,
                    scheduleId: schedule.id,
                    scheduleType: schedule.type,
                    title: schedule.playlistName,
                    description: SCHEDULE_TYPE_LABELS[schedule.type],
                    calendarId: SCHEDULE_CALENDAR_IDS[schedule.type],
                    start: params.createZonedDateTime(`${dateKey}T${slot.startTime.slice(11, 16)}:00[${params.timezone}]`),
                    end: params.createZonedDateTime(`${dateKey}T${slot.endTime.slice(11, 16)}:00[${params.timezone}]`),
                });
            }
        }

        cursor = cursor.add({days: 1});
    }

    return events;
}
