import { type DayOfWeek, type ScheduleType } from '@/generated/prisma/enums';
import {
    formatScheduleDateRange,
    formatScheduleTimeRange,
    SCHEDULE_TYPE_LABELS,
} from '@/lib/schedules/schedule-utils';

export type PlaylistScheduleImpact = {
    id: string;
    typeLabel: string;
    dateLabel: string;
    timeLabel: string;
};

type PlaylistScheduleImpactSource = {
    id: string;
    type: ScheduleType;
    startDate: Date | null;
    endDate: Date | null;
    timeSlots: Array<{
        dayOfWeek: DayOfWeek;
        startTime: Date;
        endTime: Date;
    }>;
};

export function toPlaylistScheduleImpact(schedule: PlaylistScheduleImpactSource): PlaylistScheduleImpact {
    const firstSlot = schedule.timeSlots[0] ?? null;

    return {
        id: schedule.id,
        typeLabel: SCHEDULE_TYPE_LABELS[schedule.type],
        dateLabel: formatScheduleDateRange(schedule.startDate, schedule.endDate),
        timeLabel: firstSlot ? formatScheduleTimeRange(firstSlot.startTime, firstSlot.endTime) : 'Non défini',
    };
}
