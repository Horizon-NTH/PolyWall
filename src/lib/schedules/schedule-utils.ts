import { Temporal } from 'temporal-polyfill';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';

export const ALL_DAYS_OF_WEEK: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
];

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
    [DayOfWeek.MONDAY]: 'Lun',
    [DayOfWeek.TUESDAY]: 'Mar',
    [DayOfWeek.WEDNESDAY]: 'Mer',
    [DayOfWeek.THURSDAY]: 'Jeu',
    [DayOfWeek.FRIDAY]: 'Ven',
    [DayOfWeek.SATURDAY]: 'Sam',
    [DayOfWeek.SUNDAY]: 'Dim',
};

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
    [ScheduleType.DEFAULT]: 'Par défaut',
    [ScheduleType.RECURRING]: 'Récurrente',
    [ScheduleType.EVENT]: 'Événementielle',
};

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

export function timeStringToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
}

export function minutesToTimeString(value: number) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function createDateOnlyUTC(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

export function createTimeOfDayUTC(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

export function timeToMinutes(value: Date) {
    return (value.getUTCHours() * 60) + value.getUTCMinutes();
}

export function addSecondsToTimeString(startTime: string, secondsToAdd: number) {
    const totalMinutes = timeStringToMinutes(startTime) + Math.ceil(secondsToAdd / 60);
    const bounded = Math.min(totalMinutes, (23 * 60) + 59);
    return minutesToTimeString(bounded);
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
    if (days.length === 0) return 'Aucun jour';
    if (days.length === ALL_DAYS_OF_WEEK.length) return 'Tous les jours';

    const weekDays = ALL_DAYS_OF_WEEK.slice(0, 5);
    const weekEndDays = ALL_DAYS_OF_WEEK.slice(5);
    const hasWeekdays = weekDays.every((day) => days.includes(day));
    const hasWeekend = weekEndDays.every((day) => days.includes(day));

    if (days.length === 5 && hasWeekdays) return 'Lun au ven';
    if (days.length === 2 && hasWeekend) return 'Week-end';

    return days.map((day) => DAY_OF_WEEK_LABELS[day]).join(', ');
}

export function formatScheduleTimeRange(startTime: Date, endTime: Date) {
    return `${minutesToTimeString(timeToMinutes(startTime))} - ${minutesToTimeString(timeToMinutes(endTime))}`;
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
                timeToMinutes(slot.endTime),
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
        endTime: createTimeOfDayUTC('23:59'),
    }));
}

export function createRecurringScheduleSlots(daysOfWeek: DayOfWeek[], startTime: string, endTime: string) {
    return daysOfWeek.map((dayOfWeek) => ({
        dayOfWeek,
        startTime: createTimeOfDayUTC(startTime),
        endTime: createTimeOfDayUTC(endTime),
    }));
}

export function createEventScheduleSlots(date: string, startTime: string, endTime: string) {
    const dayOfWeek = dateStringToDayOfWeek(date);
    return [{
        dayOfWeek,
        startTime: createTimeOfDayUTC(startTime),
        endTime: createTimeOfDayUTC(endTime),
    }];
}

export function dateStringToDayOfWeek(value: string) {
    const plainDate = Temporal.PlainDate.from(value);
    const dayNumber = plainDate.dayOfWeek;
    return ALL_DAYS_OF_WEEK[dayNumber - 1];
}

export function getScheduleFormInitialDate(value: Date | null) {
    if (!value) return '';
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getScheduleFormInitialTime(value: Date | null | undefined) {
    if (!value) return '';
    return minutesToTimeString(timeToMinutes(value));
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
            endMinutes: timeToMinutes(slot.endTime),
        })),
    } satisfies ScheduleDraft;
}
