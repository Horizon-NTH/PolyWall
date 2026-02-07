'use server';

import { z } from 'zod';

import { auth } from '@/auth';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';
import { mediaUpdateSchema } from '@/schemas/media-schema';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { getStorageService } from '@/lib/storage/storage-service';

type MediaField = keyof z.infer<typeof mediaUpdateSchema> | 'root';

type MediaActionResult =
    | { ok: true; mediaItemId?: string }
    | { ok: false; field?: MediaField; message: string };

async function ensureMediaAccess(requiredAction: 'read' | 'update' | 'delete') {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, field: 'root', message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can(requiredAction, 'MediaItem')) {
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

async function findMediaItemInOrganization(mediaItemId: string, organizationId: string) {
    return prisma.mediaItem.findFirst({
        where: {
            id: mediaItemId,
            organizationId,
        },
        select: {
            id: true,
            active: true,
            files: {
                select: {
                    id: true,
                    storageBucket: true,
                    objectKey: true,
                },
            },
        },
    });
}

export async function updateMediaItem(
    mediaItemId: string,
    data: z.infer<typeof mediaUpdateSchema>,
): Promise<MediaActionResult> {
    const log = createActionLogger({event: 'media_item.update', action: 'update', targetId: mediaItemId});
    const access = await ensureMediaAccess('update');

    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!mediaItemId) {
        log.invalid({actorUserId: access.session.user.id});
        return {ok: false, field: 'root', message: 'Média introuvable.'};
    }

    const parsed = mediaUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: mediaItemId,
        });
        return {ok: false, field: issue.field as MediaField, message: issue.message};
    }

    const mediaItem = await findMediaItemInOrganization(mediaItemId, access.organizationId);
    if (!mediaItem) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: mediaItemId,
        });
        return {ok: false, field: 'root', message: 'Média introuvable.'};
    }

    try {
        const updated = await prisma.mediaItem.update({
            where: {id: mediaItem.id},
            data: {
                title: parsed.data.title,
                description: parsed.data.description,
                durationSeconds: parsed.data.durationSeconds,
                active: parsed.data.active,
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: updated.id,
        });

        return {ok: true, mediaItemId: updated.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: mediaItemId,
        });
        return {ok: false, field: 'root', message: 'Impossible de mettre à jour ce média.'};
    }
}

export async function toggleMediaItemActive(mediaItemId: string): Promise<MediaActionResult> {
    const log = createActionLogger({event: 'media_item.toggle', action: 'toggle', targetId: mediaItemId});
    const access = await ensureMediaAccess('update');

    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!mediaItemId) {
        log.invalid({actorUserId: access.session.user.id});
        return {ok: false, field: 'root', message: 'Média introuvable.'};
    }

    const mediaItem = await findMediaItemInOrganization(mediaItemId, access.organizationId);
    if (!mediaItem) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: mediaItemId,
        });
        return {ok: false, field: 'root', message: 'Média introuvable.'};
    }

    const updated = await prisma.mediaItem.update({
        where: {id: mediaItem.id},
        data: {
            active: !mediaItem.active,
        },
        select: {id: true},
    });

    log.success({
        actorUserId: access.session.user.id,
        organizationId: access.organizationId,
        targetId: updated.id,
    });

    return {ok: true, mediaItemId: updated.id};
}

export async function deleteMediaItem(mediaItemId: string): Promise<MediaActionResult> {
    const log = createActionLogger({event: 'media_item.delete', action: 'delete', targetId: mediaItemId});
    const access = await ensureMediaAccess('delete');

    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!mediaItemId) {
        log.invalid({actorUserId: access.session.user.id});
        return {ok: false, field: 'root', message: 'Média introuvable.'};
    }

    const mediaItem = await findMediaItemInOrganization(mediaItemId, access.organizationId);
    if (!mediaItem) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: mediaItemId,
        });
        return {ok: false, field: 'root', message: 'Média introuvable.'};
    }

    try {
        const storage = getStorageService();

        await Promise.all(
            mediaItem.files.map(async (file) => {
                try {
                    await storage.deleteObject(file.storageBucket, file.objectKey);
                } catch (error) {
                    log.error(error, {
                        actorUserId: access.session.user.id,
                        organizationId: access.organizationId,
                        targetId: mediaItemId,
                        mediaFileId: file.id,
                        phase: 'storage_cleanup',
                    });
                }
            }),
        );

        const deleted = await prisma.mediaItem.delete({
            where: {id: mediaItem.id},
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: deleted.id,
        });

        return {ok: true, mediaItemId: deleted.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: mediaItemId,
        });
        return {ok: false, field: 'root', message: 'Impossible de supprimer ce média.'};
    }
}
