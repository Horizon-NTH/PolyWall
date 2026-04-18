import { Temporal } from 'temporal-polyfill';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import { minutesToTimeString, timeStringToMinutes } from '@/lib/utils';

const MINUTES_PER_DAY = 24 * 60;
const END_OF_DAY_TIME = '24:00';

export const ALL_DAYS_OF_WEEK: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
];

export function getDayOfWeekLabel(day: DayOfWeek, format: 'short' | 'long' = 'short') {
    const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
        [DayOfWeek.MONDAY]: 'Lundi',
        [DayOfWeek.TUESDAY]: 'Mardi',
        [DayOfWeek.WEDNESDAY]: 'Mercredi',
        [DayOfWeek.THURSDAY]: 'Jeudi',
        [DayOfWeek.FRIDAY]: 'Vendredi',
        [DayOfWeek.SATURDAY]: 'Samedi',
        [DayOfWeek.SUNDAY]: 'Dimanche',
    };

    return format == 'short' ? DAY_OF_WEEK_LABELS[day].slice(0, 3) : DAY_OF_WEEK_LABELS[day];
}

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
    [ScheduleType.DEFAULT]: 'Par défaut',
    [ScheduleType.RECURRING]: 'Récurrente',
    [ScheduleType.EVENT]: 'Événementielle',
};

export const SCHEDULE_LIFECYCLE_LABELS = {
    ongoing: 'En cours',
    upcoming: 'À venir',
    completed: 'Terminée',
} as const;

export type ScheduleLifecycleStatus = keyof typeof SCHEDULE_LIFECYCLE_LABELS;

export type ScheduleSlotDraft = {
    dayOfWeek: DayOfWeek;
    startMinutes: number;
    endMinutes: number;
};

export type ScheduleDraft = {
    scheduleId?: string;
    channelId: string;
    playlistId: string;
    type: ScheduleType;
    active: boolean;
    startDate: Date | null;
    endDate: Date | null;
    slots: ScheduleSlotDraft[];
};

export type ScheduleConflict = {
    scheduleId: string;
    conflictingScheduleId: string;
    scheduleType: ScheduleType;
    conflictingType: ScheduleType;
    title: string;
    conflictingTitle: string;
    message: string;
};

type ExistingScheduleForConflict = {
    id: string;
    type: ScheduleType;
    active: boolean;
    startDate: Date | null;
    endDate: Date | null;
    playlist: {
        name: string;
    };
    timeSlots: Array<{
        dayOfWeek: DayOfWeek;
        startTime: Date;
        endTime: Date;
    }>;
};

export function createDateOnlyUTC(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

export function createTimeOfDayUTC(value: string) {
    if (value === END_OF_DAY_TIME) {
        return new Date(Date.UTC(1970, 0, 1, 23, 59, 59, 999));
    }

    const [hours, minutes] = value.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

export function timeToMinutes(value: Date) {
    return (value.getUTCHours() * 60) + value.getUTCMinutes();
}

export function addSecondsToTimeString(startTime: string, secondsToAdd: number) {
    const totalMinutes = timeStringToMinutes(startTime) + Math.ceil(secondsToAdd / 60);
    const bounded = Math.min(totalMinutes, MINUTES_PER_DAY);
    return minutesToTimeString(bounded);
}

export function isEndOfDayTime(value: Date) {
    return value.getUTCHours() === 23
        && value.getUTCMinutes() === 59
        && value.getUTCSeconds() === 59
        && value.getUTCMilliseconds() === 999;
}

export function timeToEndMinutes(value: Date) {
    if (isEndOfDayTime(value)) {
        return MINUTES_PER_DAY;
    }

    return timeToMinutes(value);
}

export function doTimeRangesOverlap(startA: number, endA: number, startB: number, endB: number) {
    return startA < endB && startB < endA;
}

function normalizeDateOnly(value: Date | null) {
    if (!value) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0));
}

function isSameUtcDate(a: Date, b: Date) {
    return a.getUTCFullYear() === b.getUTCFullYear()
        && a.getUTCMonth() === b.getUTCMonth()
        && a.getUTCDate() === b.getUTCDate();
}

function dateRangesOverlap(startA: Date | null, endA: Date | null, startB: Date | null, endB: Date | null) {
    if (!startA || !endA || !startB || !endB) return true;
    return startA <= endB && startB <= endA;
}

export function formatScheduleDays(days: DayOfWeek[]) {
    const uniqueDays = ALL_DAYS_OF_WEEK.filter((day) => days.includes(day));

    if (uniqueDays.length === 0) return 'Aucun jour';
    if (uniqueDays.length === ALL_DAYS_OF_WEEK.length) return 'Tous les jours';

    const weekDays = ALL_DAYS_OF_WEEK.slice(0, 5);
    const weekEndDays = ALL_DAYS_OF_WEEK.slice(5);
    const hasWeekdays = weekDays.every((day) => uniqueDays.includes(day));
    const hasWeekend = weekEndDays.every((day) => uniqueDays.includes(day));

    if (uniqueDays.length === 5 && hasWeekdays) return 'Lun au ven';
    if (uniqueDays.length === 2 && hasWeekend) return 'Week-end';

    return uniqueDays.map((day) => getDayOfWeekLabel(day)).join(', ');
}

export function isAllDayTimeRange(startTime: Date, endTime: Date) {
    return timeToMinutes(startTime) === 0 && timeToEndMinutes(endTime) === MINUTES_PER_DAY;
}

export function formatScheduleTimeRange(startTime: Date, endTime: Date) {
    if (isAllDayTimeRange(startTime, endTime)) {
        return 'Toute la journée';
    }

    return `${minutesToTimeString(timeToMinutes(startTime))} - ${minutesToTimeString(timeToEndMinutes(endTime))}`;
}

export function formatScheduleDateRange(startDate: Date | null, endDate: Date | null) {
    if (!startDate && !endDate) return 'Toujours active';
    if (startDate && endDate && isSameUtcDate(startDate, endDate)) {
        return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(startDate);
    }

    if (startDate && endDate) {
        const formatter = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'});
        return `${formatter.format(startDate)} au ${formatter.format(endDate)}`;
    }

    return 'Fenêtre partielle';
}

export function findScheduleConflicts(
    draft: ScheduleDraft,
    existingSchedules: ExistingScheduleForConflict[],
): ScheduleConflict[] {
    if (!draft.active || draft.type === ScheduleType.DEFAULT) {
        return [];
    }

    const draftStartDate = normalizeDateOnly(draft.startDate);
    const draftEndDate = normalizeDateOnly(draft.endDate);

    return existingSchedules.flatMap((existing) => {
        if (!existing.active || existing.type !== draft.type || existing.id === draft.scheduleId) {
            return [];
        }

        if (!dateRangesOverlap(draftStartDate, draftEndDate, normalizeDateOnly(existing.startDate), normalizeDateOnly(existing.endDate))) {
            return [];
        }

        const conflictingSlot = existing.timeSlots.find((slot) => draft.slots.some((draftSlot) => (
            draftSlot.dayOfWeek === slot.dayOfWeek
            && doTimeRangesOverlap(
                draftSlot.startMinutes,
                draftSlot.endMinutes,
                timeToMinutes(slot.startTime),
                timeToEndMinutes(slot.endTime),
            )
        )));

        if (!conflictingSlot) {
            return [];
        }

        const message = existing.type === ScheduleType.EVENT
            ? `Cette programmation chevauche "${existing.playlist.name}" sur la même date et plage horaire.`
            : `Cette programmation chevauche "${existing.playlist.name}" sur au moins un jour et une plage horaire.`;

        return [{
            scheduleId: draft.scheduleId ?? 'draft',
            conflictingScheduleId: existing.id,
            scheduleType: draft.type,
            conflictingType: existing.type,
            title: 'Conflit détecté',
            conflictingTitle: existing.playlist.name,
            message,
        }];
    });
}

export function createDefaultScheduleSlots() {
    return ALL_DAYS_OF_WEEK.map((dayOfWeek) => ({
        dayOfWeek,
        startTime: createTimeOfDayUTC('00:00'),
        endTime: createTimeOfDayUTC('24:00'),
    }));
}

function createSlotsForDays(daysOfWeek: DayOfWeek[], startTime: string, endTime: string) {
    return daysOfWeek.map((dayOfWeek) => ({
        dayOfWeek,
        startTime: createTimeOfDayUTC(startTime),
        endTime: createTimeOfDayUTC(endTime),
    }));
}

export function createRecurringScheduleSlots(daysOfWeek: DayOfWeek[], startTime: string, endTime: string) {
    return createSlotsForDays(daysOfWeek, startTime, endTime);
}

export function createEventScheduleSlots(startDate: string, endDate: string, startTime: string, endTime: string) {
    const includedDays = new Set<DayOfWeek>();
    let cursor = Temporal.PlainDate.from(startDate);
    const lastDate = Temporal.PlainDate.from(endDate);

    while (Temporal.PlainDate.compare(cursor, lastDate) <= 0) {
        includedDays.add(ALL_DAYS_OF_WEEK[cursor.dayOfWeek - 1]!);
        cursor = cursor.add({days: 1});
    }

    return createSlotsForDays(Array.from(includedDays), startTime, endTime);
}

export function getScheduleFormInitialDate(value: Date | null) {
    if (!value) return '';
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getScheduleLifecycleStatus(params: {
    type: ScheduleType;
    startDate: Date | null;
    endDate: Date | null;
    now?: Date;
}) {
    if (params.type === ScheduleType.DEFAULT) {
        return 'ongoing' satisfies ScheduleLifecycleStatus;
    }

    const now = params.now ?? new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startDate = normalizeDateOnly(params.startDate);
    const endDate = normalizeDateOnly(params.endDate);

    if (endDate && endDate < today) {
        return 'completed' satisfies ScheduleLifecycleStatus;
    }

    if (startDate && startDate > today) {
        return 'upcoming' satisfies ScheduleLifecycleStatus;
    }

    return 'ongoing' satisfies ScheduleLifecycleStatus;
}

export function getScheduleFormInitialTime(
    value: Date | null | undefined,
    options?: {
        boundary?: 'start' | 'end';
    },
) {
    if (!value) return '';
    return options?.boundary === 'end'
        ? minutesToTimeString(timeToEndMinutes(value))
        : minutesToTimeString(timeToMinutes(value));
}

export function createScheduleDraft(params: {
    scheduleId?: string;
    channelId: string;
    playlistId: string;
    type: ScheduleType;
    active: boolean;
    startDate: Date | null;
    endDate: Date | null;
    slots: Array<{
        dayOfWeek: DayOfWeek;
        startTime: Date;
        endTime: Date;
    }>;
}) {
    return {
        scheduleId: params.scheduleId,
        channelId: params.channelId,
        playlistId: params.playlistId,
        type: params.type,
        active: params.active,
        startDate: params.startDate,
        endDate: params.endDate,
        slots: params.slots.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            startMinutes: timeToMinutes(slot.startTime),
            endMinutes: timeToEndMinutes(slot.endTime),
        })),
    } satisfies ScheduleDraft;
}
