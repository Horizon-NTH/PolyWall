import { Temporal } from 'temporal-polyfill';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import { formatDateOnlyParts } from '@/lib/date';
import {
    type DisplayPlaylistSequence,
    type DisplayResolvedState,
    type DisplayRuntimeSchedule,
    type DisplayRuntimeSnapshot,
} from '@/lib/display-runtime/types';

const SCHEDULE_PRIORITY: Record<ScheduleType, number> = {
    [ScheduleType.EVENT]: 3,
    [ScheduleType.RECURRING]: 2,
    [ScheduleType.DEFAULT]: 1,
};

function getDayOfWeek(day: number) {
    return [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
        DayOfWeek.SUNDAY,
    ][day - 1]!;
}

function createZonedDateTimeForMinutes(
    date: Temporal.PlainDate,
    timezone: string,
    totalMinutes: number,
) {
    if (totalMinutes >= 24 * 60) {
        const nextDay = date.add({days: 1});
        return Temporal.ZonedDateTime.from({
            timeZone: timezone,
            year: nextDay.year,
            month: nextDay.month,
            day: nextDay.day,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
    }

    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return Temporal.ZonedDateTime.from({
        timeZone: timezone,
        year: date.year,
        month: date.month,
        day: date.day,
        hour,
        minute,
        second: 0,
        millisecond: 0,
    });
}

function isDateIncluded(schedule: DisplayRuntimeSchedule, date: Temporal.PlainDate) {
    const dateKey = formatDateOnlyParts(date);
    if (schedule.startDate && dateKey < schedule.startDate) return false;
    return !(schedule.endDate && dateKey > schedule.endDate);

}

type ActiveScheduleCandidate = {
    schedule: DisplayRuntimeSchedule;
    slotStartedAtMs: number;
    slotEndsAtMs: number;
};

function resolveActiveScheduleCandidate(
    schedules: DisplayRuntimeSchedule[],
    nowMs: number,
    timezone: string,
) {
    const now = Temporal.Instant.fromEpochMilliseconds(nowMs).toZonedDateTimeISO(timezone);
    const nowDate = now.toPlainDate();
    const nowMinutes = (now.hour * 60) + now.minute + (now.second / 60);
    const nowDay = getDayOfWeek(now.dayOfWeek);

    const candidates: ActiveScheduleCandidate[] = [];

    for (const schedule of schedules) {
        if (!schedule.active || !isDateIncluded(schedule, nowDate)) {
            continue;
        }

        for (const slot of schedule.slots) {
            if (slot.dayOfWeek !== nowDay) {
                continue;
            }

            if (nowMinutes < slot.startMinutes || nowMinutes >= slot.endMinutes) {
                continue;
            }

            const slotStartedAt = createZonedDateTimeForMinutes(nowDate, timezone, slot.startMinutes);
            const slotEndsAt = createZonedDateTimeForMinutes(nowDate, timezone, slot.endMinutes);
            candidates.push({
                schedule,
                slotStartedAtMs: slotStartedAt.epochMilliseconds,
                slotEndsAtMs: slotEndsAt.epochMilliseconds,
            });
        }
    }

    candidates.sort((left, right) => {
        const priorityDelta = SCHEDULE_PRIORITY[right.schedule.type] - SCHEDULE_PRIORITY[left.schedule.type];
        if (priorityDelta !== 0) return priorityDelta;

        const updatedAtDelta =
            new Date(right.schedule.updatedAt).getTime() - new Date(left.schedule.updatedAt).getTime();
        if (updatedAtDelta !== 0) return updatedAtDelta;

        return left.schedule.id.localeCompare(right.schedule.id);
    });

    return candidates[0] ?? null;
}

function findPlaylist(playlists: DisplayPlaylistSequence[], playlistId: string) {
    return playlists.find((playlist) => playlist.playlistId === playlistId) ?? null;
}

function findDefaultSchedule(schedules: DisplayRuntimeSchedule[]) {
    return schedules.find((schedule) => schedule.type === ScheduleType.DEFAULT && schedule.active) ?? null;
}

export function getCurrentSequenceItem(sequence: DisplayPlaylistSequence, offsetSeconds: number) {
    if (sequence.totalDurationSeconds <= 0 || sequence.items.length === 0) {
        return null;
    }

    const boundedOffset = ((offsetSeconds % sequence.totalDurationSeconds) + sequence.totalDurationSeconds)
        % sequence.totalDurationSeconds;

    let cursor = 0;
    for (const item of sequence.items) {
        const nextCursor = cursor + item.durationSeconds;
        if (boundedOffset < nextCursor) {
            return {
                item,
                itemOffsetSeconds: boundedOffset - cursor,
            };
        }
        cursor = nextCursor;
    }

    const fallbackItem = sequence.items.at(-1);
    if (!fallbackItem) return null;

    return {
        item: fallbackItem,
        itemOffsetSeconds: Math.max(0, fallbackItem.durationSeconds - 0.001),
    };
}

export function resolveDisplayState(snapshot: DisplayRuntimeSnapshot, nowMs: number): DisplayResolvedState {
    const activeCandidate = resolveActiveScheduleCandidate(snapshot.schedules, nowMs, snapshot.channel.timezone);
    if (!activeCandidate) {
        return {
            status: 'NO_ACTIVE_SCHEDULE',
            schedule: null,
            playlist: null,
            currentItem: null,
            nextTransitionAt: null,
            slotStartedAt: null,
            slotEndsAt: null,
            loopOffsetSeconds: 0,
            itemOffsetSeconds: 0,
            isFallbackToDefault: false,
            reason: 'Aucune programmation active pour ce canal.',
        };
    }

    let resolvedSchedule = activeCandidate.schedule;
    let resolvedPlaylist = findPlaylist(snapshot.playlists, resolvedSchedule.playlistId);
    let isFallbackToDefault = false;
    let reason: string | null = null;

    if (!resolvedPlaylist || resolvedPlaylist.items.length === 0 || resolvedPlaylist.totalDurationSeconds <= 0) {
        const defaultSchedule = findDefaultSchedule(snapshot.schedules);
        const defaultPlaylist = defaultSchedule
            ? findPlaylist(snapshot.playlists, defaultSchedule.playlistId)
            : null;

        if (
            defaultSchedule &&
            defaultPlaylist &&
            defaultPlaylist.items.length > 0 &&
            defaultPlaylist.totalDurationSeconds > 0
        ) {
            resolvedSchedule = defaultSchedule;
            resolvedPlaylist = defaultPlaylist;
            isFallbackToDefault = resolvedSchedule.id !== activeCandidate.schedule.id;
            reason = 'La playlist active est vide. Fallback sur la programmation par défaut.';
        }
    }

    if (!resolvedPlaylist || resolvedPlaylist.items.length === 0 || resolvedPlaylist.totalDurationSeconds <= 0) {
        return {
            status: 'NO_DIFFUSABLE_PLAYLIST',
            schedule: resolvedSchedule,
            playlist: resolvedPlaylist,
            currentItem: null,
            nextTransitionAt: null,
            slotStartedAt: new Date(activeCandidate.slotStartedAtMs).toISOString(),
            slotEndsAt: new Date(activeCandidate.slotEndsAtMs).toISOString(),
            loopOffsetSeconds: 0,
            itemOffsetSeconds: 0,
            isFallbackToDefault,
            reason: reason ?? 'Aucune playlist diffusable n\'est disponible pour la programmation active.',
        };
    }

    const slotStartedAtMs = activeCandidate.slotStartedAtMs;
    const elapsedSeconds = Math.max(0, (nowMs - slotStartedAtMs) / 1000);
    const loopOffsetSeconds = elapsedSeconds % resolvedPlaylist.totalDurationSeconds;
    const resolvedItem = getCurrentSequenceItem(resolvedPlaylist, loopOffsetSeconds);

    if (!resolvedItem) {
        return {
            status: 'NO_DIFFUSABLE_PLAYLIST',
            schedule: resolvedSchedule,
            playlist: resolvedPlaylist,
            currentItem: null,
            nextTransitionAt: null,
            slotStartedAt: new Date(activeCandidate.slotStartedAtMs).toISOString(),
            slotEndsAt: new Date(activeCandidate.slotEndsAtMs).toISOString(),
            loopOffsetSeconds: 0,
            itemOffsetSeconds: 0,
            isFallbackToDefault,
            reason: 'Impossible de déterminer le média courant.',
        };
    }

    const remainingSeconds = Math.max(0.05, resolvedItem.item.durationSeconds - resolvedItem.itemOffsetSeconds);

    return {
        status: 'PLAYING',
        schedule: resolvedSchedule,
        playlist: resolvedPlaylist,
        currentItem: resolvedItem.item,
        nextTransitionAt: new Date(nowMs + (remainingSeconds * 1000)).toISOString(),
        slotStartedAt: new Date(activeCandidate.slotStartedAtMs).toISOString(),
        slotEndsAt: new Date(activeCandidate.slotEndsAtMs).toISOString(),
        loopOffsetSeconds,
        itemOffsetSeconds: resolvedItem.itemOffsetSeconds,
        isFallbackToDefault,
        reason,
    };
}

export function getPriorityAssetDescriptors(
    snapshot: DisplayRuntimeSnapshot,
    resolvedState: DisplayResolvedState,
) {
    const orderedPlaylists: DisplayPlaylistSequence[] = [];

    if (resolvedState.playlist) {
        orderedPlaylists.push(resolvedState.playlist);
    }

    const defaultSchedule = findDefaultSchedule(snapshot.schedules);
    const defaultPlaylist = defaultSchedule ? findPlaylist(snapshot.playlists, defaultSchedule.playlistId) : null;
    if (
        defaultPlaylist &&
        !orderedPlaylists.some((playlist) => playlist.playlistId === defaultPlaylist.playlistId)
    ) {
        orderedPlaylists.push(defaultPlaylist);
    }

    for (const playlist of snapshot.playlists) {
        if (!orderedPlaylists.some((entry) => entry.playlistId === playlist.playlistId)) {
            orderedPlaylists.push(playlist);
        }
    }

    const seen = new Set<string>();
    const orderedAssets = [];
    for (const playlist of orderedPlaylists) {
        for (const item of playlist.items) {
            if (seen.has(item.asset.cacheKey)) {
                continue;
            }
            seen.add(item.asset.cacheKey);
            orderedAssets.push(item.asset);
        }
    }

    for (const zone of snapshot.channel.template.zones) {
        const asset = zone.staticMediaAsset;
        if (!asset || seen.has(asset.cacheKey)) {
            continue;
        }
        seen.add(asset.cacheKey);
        orderedAssets.push(asset);
    }

    return orderedAssets;
}
