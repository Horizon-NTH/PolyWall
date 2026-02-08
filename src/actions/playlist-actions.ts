'use server';

import { z } from 'zod';

import { auth } from '@/auth';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import {
    playlistCreateSchema,
    playlistTimelineReplaceSchema,
    playlistUpdateSchema,
} from '@/schemas/playlist-schema';

type PlaylistField = keyof z.infer<typeof playlistCreateSchema> | 'items' | 'root';

type PlaylistActionResult =
    | { ok: true; playlistId?: string }
    | { ok: false; field?: PlaylistField; message: string };

async function ensurePlaylistAccess(requiredAction: 'read' | 'create' | 'update' | 'delete') {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, field: 'root', message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can(requiredAction, 'Playlist')) {
        return {ok: false as const, field: 'root', message: 'Accès refusé.'};
    }

    if (!session.user.organizationId) {
        return {ok: false as const, field: 'root', message: 'Aucune organisation sélectionnée.'};
    }

    return {
        ok: true as const,
        session,
        organizationId: session.user.organizationId,
    };
}

async function findPlaylistInOrganization(playlistId: string, organizationId: string) {
    return prisma.playlist.findFirst({
        where: {
            id: playlistId,
            organizationId,
        },
        select: {id: true, organizationId: true},
    });
}

export async function createPlaylist(
    data: z.infer<typeof playlistCreateSchema>,
): Promise<PlaylistActionResult> {
    const log = createActionLogger({event: 'playlist.create', action: 'create'});
    const access = await ensurePlaylistAccess('create');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = playlistCreateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: issue.field as PlaylistField, message: issue.message};
    }

    try {
        const created = await prisma.playlist.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
                organizationId: access.organizationId,
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: created.id,
        });
        return {ok: true, playlistId: created.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'name',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
            });
            return {ok: false, field: 'name', message: 'Une playlist avec ce nom existe déjà.'};
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'root', message: 'Impossible de créer cette playlist.'};
    }
}

export async function updatePlaylist(
    playlistId: string,
    data: z.infer<typeof playlistUpdateSchema>,
): Promise<PlaylistActionResult> {
    const log = createActionLogger({event: 'playlist.update', action: 'update', targetId: playlistId});
    const access = await ensurePlaylistAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!playlistId) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Playlist introuvable.'};
    }

    const parsed = playlistUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlistId,
        });
        return {ok: false, field: issue.field as PlaylistField, message: issue.message};
    }

    const playlist = await findPlaylistInOrganization(playlistId, access.organizationId);
    if (!playlist) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlistId,
        });
        return {ok: false, field: 'root', message: 'Playlist introuvable.'};
    }

    try {
        const updated = await prisma.playlist.update({
            where: {id: playlist.id},
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: updated.id,
        });
        return {ok: true, playlistId: updated.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'name',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: playlist.id,
            });
            return {ok: false, field: 'name', message: 'Une playlist avec ce nom existe déjà.'};
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlist.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de mettre à jour cette playlist.'};
    }
}

export async function deletePlaylist(playlistId: string): Promise<PlaylistActionResult> {
    const log = createActionLogger({event: 'playlist.delete', action: 'delete', targetId: playlistId});
    const access = await ensurePlaylistAccess('delete');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!playlistId) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Playlist introuvable.'};
    }

    const playlist = await findPlaylistInOrganization(playlistId, access.organizationId);
    if (!playlist) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlistId,
        });
        return {ok: false, field: 'root', message: 'Playlist introuvable.'};
    }

    try {
        const deleted = await prisma.playlist.delete({
            where: {id: playlist.id},
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: deleted.id,
        });
        return {ok: true, playlistId: deleted.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlist.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de supprimer cette playlist.'};
    }
}

export async function replacePlaylistTimeline(
    playlistId: string,
    payload: z.infer<typeof playlistTimelineReplaceSchema>,
): Promise<PlaylistActionResult> {
    const log = createActionLogger({event: 'playlist.timeline.replace', action: 'update', targetId: playlistId});
    const access = await ensurePlaylistAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!playlistId) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Playlist introuvable.'};
    }

    const parsed = playlistTimelineReplaceSchema.safeParse(payload);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlistId,
        });
        return {ok: false, field: issue.field as PlaylistField, message: issue.message};
    }

    const playlist = await findPlaylistInOrganization(playlistId, access.organizationId);
    if (!playlist) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlistId,
        });
        return {ok: false, field: 'root', message: 'Playlist introuvable.'};
    }

    const mediaIds = parsed.data.items.map((item) => item.mediaItemId);
    const uniqueMediaIds = Array.from(new Set(mediaIds));
    if (uniqueMediaIds.length > 0) {
        const mediaCount = await prisma.mediaItem.count({
            where: {
                organizationId: access.organizationId,
                id: {in: uniqueMediaIds},
            },
        });

        if (mediaCount !== uniqueMediaIds.length) {
            log.denied({
                reason: 'cross_organization_media',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: playlistId,
            });
            return {ok: false, field: 'items', message: 'Certains médias sont introuvables.'};
        }
    }

    try {
        await prisma.$transaction([
            prisma.playlistItem.deleteMany({where: {playlistId: playlist.id}}),
            ...(parsed.data.items.length > 0
                ? [
                    prisma.playlistItem.createMany({
                        data: parsed.data.items.map((item, index) => ({
                            playlistId: playlist.id,
                            mediaItemId: item.mediaItemId,
                            orderIndex: index,
                        })),
                    }),
                ]
                : []),
        ]);

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlist.id,
            itemCount: parsed.data.items.length,
        });
        return {ok: true, playlistId: playlist.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: playlist.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de sauvegarder la timeline.'};
    }
}
