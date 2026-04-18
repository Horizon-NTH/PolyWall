'use server';

import { z } from 'zod';

import { auth } from '@/auth';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';
import { defineAbilityFor } from '@/lib/casl/ability';
import { getPlaylistMetrics } from '@/lib/playlists/playlist-metrics';
import { prisma } from '@/lib/prisma';
import { ScheduleType } from '@/generated/prisma/enums';
import {
    addSecondsToTimeString,
    createDateOnlyUTC,
    createDefaultScheduleSlots,
    createEventScheduleSlots,
    createRecurringScheduleSlots,
    createScheduleDraft,
    findScheduleConflicts,
    type ScheduleConflict,
} from '@/lib/schedules/schedule-utils';
import {
    scheduleCreateSchema,
    scheduleDeleteSchema,
    scheduleUpdateSchema,
} from '@/schemas/schedule-schema';
import { timeStringToMinutes } from '@/lib/utils';

type ScheduleField = keyof z.infer<typeof scheduleCreateSchema> | 'root';

type ScheduleActionResult =
    | { ok: true; scheduleId?: string }
    | { ok: false; field?: ScheduleField; message: string; conflicts?: ScheduleConflict[] };

async function ensureScheduleAccess(requiredAction: 'read' | 'create' | 'update' | 'delete') {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can(requiredAction, 'PlaylistSchedule')) {
        return {ok: false as const, message: 'Accès refusé.'};
    }

    if (!session.user.organizationId) {
        return {ok: false as const, message: 'Aucune organisation sélectionnée.'};
    }

    return {
        ok: true as const,
        session,
        organizationId: session.user.organizationId,
    };
}

async function findScheduleInOrganization(scheduleId: string, organizationId: string) {
    return prisma.playlistSchedule.findFirst({
        where: {
            id: scheduleId,
            channel: {
                organizationId,
            },
        },
        select: {
            id: true,
            type: true,
            channelId: true,
        },
    });
}

async function findChannelInOrganization(channelId: string, organizationId: string) {
    return prisma.channel.findFirst({
        where: {
            id: channelId,
            organizationId,
        },
        select: {
            id: true,
            organizationId: true,
            name: true,
        },
    });
}

async function findPlaylistInOrganization(playlistId: string, organizationId: string) {
    return prisma.playlist.findFirst({
        where: {
            id: playlistId,
            organizationId,
        },
        select: {
            id: true,
            name: true,
            items: {
                select: {
                    mediaItem: {
                        select: {
                            durationSeconds: true,
                            active: true,
                        },
                    },
                },
            },
        },
    });
}

async function getExistingSchedulesForConflicts(channelId: string) {
    return prisma.playlistSchedule.findMany({
        where: {
            channelId,
        },
        select: {
            id: true,
            type: true,
            active: true,
            startDate: true,
            endDate: true,
            playlist: {
                select: {
                    name: true,
                },
            },
            timeSlots: {
                select: {
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                },
            },
        },
    });
}

async function buildSchedulePersistencePayload(
    data: z.infer<typeof scheduleCreateSchema>,
    options?: { scheduleId?: string; organizationId?: string },
) {
    const channel = await findChannelInOrganization(data.channelId, options?.organizationId ?? '');
    if (!channel) {
        return {ok: false as const, field: 'channelId' as const, message: 'Canal introuvable.'};
    }

    const playlist = await findPlaylistInOrganization(data.playlistId, options?.organizationId ?? '');
    if (!playlist) {
        return {ok: false as const, field: 'playlistId' as const, message: 'Playlist introuvable.'};
    }

    const playlistDurationSeconds = getPlaylistMetrics(
        playlist.items.map((item) => ({
            durationSeconds: item.mediaItem.durationSeconds,
            active: item.mediaItem.active,
        })),
    ).diffusableDurationSeconds;
    let resolvedEndTime = data.endTime ?? '24:00';

    if (data.type !== ScheduleType.DEFAULT && data.endMode === 'playlist') {
        if (playlistDurationSeconds <= 0) {
            return {
                ok: false as const,
                field: 'playlistId' as const,
                message: 'La playlist doit contenir au moins une durée exploitable.',
            };
        }

        const endMinutes = timeStringToMinutes(data.startTime ?? '00:00') + Math.ceil(playlistDurationSeconds / 60);
        if (endMinutes > (24 * 60)) {
            return {
                ok: false as const,
                field: 'startTime' as const,
                message: 'La durée de la playlist dépasse la journée autorisée.',
            };
        }

        resolvedEndTime = addSecondsToTimeString(data.startTime ?? '00:00', playlistDurationSeconds);
        if (resolvedEndTime <= (data.startTime ?? '')) {
            return {
                ok: false as const,
                field: 'startTime' as const,
                message: 'La durée de la playlist dépasse la journée autorisée.',
            };
        }
    }

    if (data.type === ScheduleType.DEFAULT) {
        return {
            ok: true as const,
            channel,
            playlist,
            startDate: null,
            endDate: null,
            slots: createDefaultScheduleSlots(),
            conflicts: [],
        };
    }

    const eventEndDate = data.endDate?.trim() || data.date || '';
    const slots = data.type === ScheduleType.RECURRING
        ? createRecurringScheduleSlots(data.daysOfWeek, data.startTime ?? '00:00', resolvedEndTime)
        : createEventScheduleSlots(data.date ?? '', eventEndDate, data.startTime ?? '00:00', resolvedEndTime);

    const startDate = data.type === ScheduleType.EVENT ? createDateOnlyUTC(data.date!) : null;
    const endDate = data.type === ScheduleType.EVENT ? createDateOnlyUTC(eventEndDate) : null;
    const existingSchedules = await getExistingSchedulesForConflicts(channel.id);
    const conflicts = findScheduleConflicts(
        createScheduleDraft({
            scheduleId: options?.scheduleId,
            channelId: channel.id,
            playlistId: playlist.id,
            type: data.type,
            active: data.active,
            startDate,
            endDate,
            slots,
        }),
        existingSchedules,
    );

    return {
        ok: true as const,
        channel,
        playlist,
        startDate,
        endDate,
        slots,
        conflicts,
    };
}

async function ensureSingleDefault(channelId: string, excludedScheduleId?: string) {
    return prisma.playlistSchedule.findFirst({
        where: {
            channelId,
            type: ScheduleType.DEFAULT,
            active: true,
            ...(excludedScheduleId
                ? {
                    id: {
                        not: excludedScheduleId,
                    },
                }
                : {}),
        },
        select: {
            id: true,
        },
    });
}

export async function createSchedule(
    data: z.infer<typeof scheduleCreateSchema>,
): Promise<ScheduleActionResult> {
    const log = createActionLogger({event: 'schedule.create', action: 'create'});
    const access = await ensureScheduleAccess('create');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = scheduleCreateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: issue.field as ScheduleField, message: issue.message};
    }

    const prepared = await buildSchedulePersistencePayload(parsed.data, {organizationId: access.organizationId});
    if (!prepared.ok) {
        log.invalid({
            field: prepared.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return prepared;
    }

    if (parsed.data.type === ScheduleType.DEFAULT && parsed.data.active) {
        const existingDefault = await ensureSingleDefault(parsed.data.channelId);
        if (existingDefault) {
            log.denied({
                reason: 'default_schedule_already_exists',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: existingDefault.id,
                channelId: parsed.data.channelId,
            });
            return {ok: false, field: 'channelId', message: 'Une playlist par défaut existe déjà pour ce canal.'};
        }
    }

    if (prepared.conflicts.length > 0) {
        log.denied({
            reason: 'schedule_conflict',
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            conflictCount: prepared.conflicts.length,
            channelId: prepared.channel.id,
            playlistId: prepared.playlist.id,
        });
        return {
            ok: false,
            field: 'root',
            message: `${prepared.conflicts.length} conflit${prepared.conflicts.length > 1 ? 's' : ''} détecté${prepared.conflicts.length > 1 ? 's' : ''}.`,
            conflicts: prepared.conflicts,
        };
    }

    try {
        const created = await prisma.playlistSchedule.create({
            data: {
                type: parsed.data.type,
                active: parsed.data.active,
                channelId: prepared.channel.id,
                playlistId: prepared.playlist.id,
                startDate: prepared.startDate,
                endDate: prepared.endDate,
                timeSlots: {
                    create: prepared.slots,
                },
            },
            select: {
                id: true,
            },
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: created.id,
        });
        return {ok: true, scheduleId: created.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'root', message: 'Impossible de créer cette programmation.'};
    }
}

export async function updateSchedule(
    scheduleId: string,
    data: z.infer<typeof scheduleUpdateSchema>,
): Promise<ScheduleActionResult> {
    const log = createActionLogger({event: 'schedule.update', action: 'update', targetId: scheduleId});
    const access = await ensureScheduleAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!scheduleId) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Programmation introuvable.'};
    }

    const parsed = scheduleUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: scheduleId,
        });
        return {ok: false, field: issue.field as ScheduleField, message: issue.message};
    }

    const schedule = await findScheduleInOrganization(scheduleId, access.organizationId);
    if (!schedule) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: scheduleId,
        });
        return {ok: false, field: 'root', message: 'Programmation introuvable.'};
    }

    const prepared = await buildSchedulePersistencePayload(parsed.data, {
        scheduleId,
        organizationId: access.organizationId,
    });
    if (!prepared.ok) {
        log.invalid({
            field: prepared.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: schedule.id,
        });
        return prepared;
    }

    if (parsed.data.type === ScheduleType.DEFAULT && parsed.data.active) {
        const existingDefault = await ensureSingleDefault(parsed.data.channelId, scheduleId);
        if (existingDefault) {
            log.denied({
                reason: 'default_schedule_already_exists',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: existingDefault.id,
                channelId: parsed.data.channelId,
            });
            return {ok: false, field: 'channelId', message: 'Une playlist par défaut existe déjà pour ce canal.'};
        }
    }

    if (prepared.conflicts.length > 0) {
        log.denied({
            reason: 'schedule_conflict',
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: schedule.id,
            conflictCount: prepared.conflicts.length,
            channelId: prepared.channel.id,
            playlistId: prepared.playlist.id,
        });
        return {
            ok: false,
            field: 'root',
            message: `${prepared.conflicts.length} conflit${prepared.conflicts.length > 1 ? 's' : ''} détecté${prepared.conflicts.length > 1 ? 's' : ''}.`,
            conflicts: prepared.conflicts,
        };
    }

    try {
        const updated = await prisma.playlistSchedule.update({
            where: {id: schedule.id},
            data: {
                type: parsed.data.type,
                active: parsed.data.active,
                channelId: prepared.channel.id,
                playlistId: prepared.playlist.id,
                startDate: prepared.startDate,
                endDate: prepared.endDate,
                timeSlots: {
                    deleteMany: {},
                    create: prepared.slots,
                },
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: updated.id,
        });
        return {ok: true, scheduleId: updated.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: scheduleId,
        });
        return {ok: false, field: 'root', message: 'Impossible de mettre à jour cette programmation.'};
    }
}

export async function upsertDefaultSchedule(
    data: z.infer<typeof scheduleCreateSchema>,
): Promise<ScheduleActionResult> {
    const log = createActionLogger({event: 'schedule.default.upsert', action: 'update'});
    const access = await ensureScheduleAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = scheduleCreateSchema.safeParse({
        ...data,
        type: ScheduleType.DEFAULT,
    });
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: issue.field as ScheduleField, message: issue.message};
    }

    const prepared = await buildSchedulePersistencePayload(parsed.data, {organizationId: access.organizationId});
    if (!prepared.ok) {
        log.invalid({
            field: prepared.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return prepared;
    }

    const existingDefault = await prisma.playlistSchedule.findFirst({
        where: {
            channelId: parsed.data.channelId,
            type: ScheduleType.DEFAULT,
        },
        select: {
            id: true,
        },
    });

    try {
        const saved = existingDefault
            ? await prisma.playlistSchedule.update({
                where: {id: existingDefault.id},
                data: {
                    playlistId: prepared.playlist.id,
                    active: parsed.data.active,
                    timeSlots: {
                        deleteMany: {},
                        create: prepared.slots,
                    },
                },
                select: {id: true},
            })
            : await prisma.playlistSchedule.create({
                data: {
                    type: ScheduleType.DEFAULT,
                    active: parsed.data.active,
                    channelId: prepared.channel.id,
                    playlistId: prepared.playlist.id,
                    timeSlots: {
                        create: prepared.slots,
                    },
                },
                select: {id: true},
            });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: saved.id,
        });
        return {ok: true, scheduleId: saved.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'root', message: 'Impossible d\'enregistrer la playlist par défaut.'};
    }
}

export async function deleteSchedule(scheduleId: string): Promise<ScheduleActionResult> {
    const log = createActionLogger({event: 'schedule.delete', action: 'delete', targetId: scheduleId});
    const access = await ensureScheduleAccess('delete');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = scheduleDeleteSchema.safeParse({scheduleId});
    if (!parsed.success) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Programmation introuvable.'};
    }

    const schedule = await findScheduleInOrganization(parsed.data.scheduleId, access.organizationId);
    if (!schedule) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: parsed.data.scheduleId,
        });
        return {ok: false, field: 'root', message: 'Programmation introuvable.'};
    }

    try {
        const deleted = await prisma.playlistSchedule.delete({
            where: {id: schedule.id},
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: deleted.id,
        });
        return {ok: true, scheduleId: deleted.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: schedule.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de supprimer cette programmation.'};
    }
}
