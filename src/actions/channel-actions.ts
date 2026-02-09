'use server';

import { z } from 'zod';

import { auth } from '@/auth';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import {
    channelCreateSchema,
    channelDeleteSchema,
    channelUpdateSchema,
} from '@/schemas/channel-schema';

type ChannelField = keyof z.infer<typeof channelCreateSchema> | 'reassignToChannelId' | 'root';

type ChannelActionResult =
    | { ok: true; channelId?: string }
    | { ok: false; field?: ChannelField; message: string };

async function ensureChannelAccess(requiredAction: 'read' | 'create' | 'update' | 'delete') {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can(requiredAction, 'Channel')) {
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

async function findChannelInOrganization(channelId: string, organizationId: string) {
    return prisma.channel.findFirst({
        where: {
            id: channelId,
            organizationId,
        },
        select: {
            id: true,
            organizationId: true,
            _count: {
                select: {
                    screens: true,
                },
            },
        },
    });
}

async function findTemplateInScope(displayTemplateId: string, organizationId: string) {
    return prisma.displayTemplate.findFirst({
        where: {
            id: displayTemplateId,
            OR: [{organizationId: null}, {organizationId}],
        },
        select: {id: true},
    });
}

export async function createChannel(
    data: z.infer<typeof channelCreateSchema>,
): Promise<ChannelActionResult> {
    const log = createActionLogger({event: 'channel.create', action: 'create'});
    const access = await ensureChannelAccess('create');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = channelCreateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: issue.field as ChannelField, message: issue.message};
    }

    const template = await findTemplateInScope(parsed.data.displayTemplateId, access.organizationId);
    if (!template) {
        log.denied({
            reason: 'template_not_in_scope',
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'displayTemplateId', message: 'Modèle d\'affichage introuvable.'};
    }

    try {
        const created = await prisma.channel.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
                organizationId: access.organizationId,
                displayTemplateId: template.id,
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: created.id,
        });
        return {ok: true, channelId: created.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'name',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
            });
            return {ok: false, field: 'name', message: 'Un canal avec ce nom existe déjà.'};
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'root', message: 'Impossible de créer ce canal.'};
    }
}

export async function updateChannel(
    channelId: string,
    data: z.infer<typeof channelUpdateSchema>,
): Promise<ChannelActionResult> {
    const log = createActionLogger({event: 'channel.update', action: 'update', targetId: channelId});
    const access = await ensureChannelAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!channelId) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Canal introuvable.'};
    }

    const parsed = channelUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: channelId,
        });
        return {ok: false, field: issue.field as ChannelField, message: issue.message};
    }

    const channel = await findChannelInOrganization(channelId, access.organizationId);
    if (!channel) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: channelId,
        });
        return {ok: false, field: 'root', message: 'Canal introuvable.'};
    }

    const template = await findTemplateInScope(parsed.data.displayTemplateId, access.organizationId);
    if (!template) {
        log.denied({
            reason: 'template_not_in_scope',
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: channel.id,
        });
        return {ok: false, field: 'displayTemplateId', message: 'Modèle d\'affichage introuvable.'};
    }

    try {
        const updated = await prisma.channel.update({
            where: {id: channel.id},
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
                displayTemplateId: template.id,
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: updated.id,
        });
        return {ok: true, channelId: updated.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'name',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: channel.id,
            });
            return {ok: false, field: 'name', message: 'Un canal avec ce nom existe déjà.'};
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: channel.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de mettre à jour ce canal.'};
    }
}

export async function deleteChannel(
    channelId: string,
    options?: z.infer<typeof channelDeleteSchema>,
): Promise<ChannelActionResult> {
    const log = createActionLogger({event: 'channel.delete', action: 'delete', targetId: channelId});
    const access = await ensureChannelAccess('delete');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!channelId) {
        log.invalid({actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Canal introuvable.'};
    }

    const parsedOptions = channelDeleteSchema.safeParse(options);
    if (!parsedOptions.success) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: channelId,
        });
        return {ok: false, field: 'reassignToChannelId', message: 'Paramètres de suppression invalides.'};
    }

    const channel = await findChannelInOrganization(channelId, access.organizationId);
    if (!channel) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: channelId,
        });
        return {ok: false, field: 'root', message: 'Canal introuvable.'};
    }

    const screensCount = channel._count.screens;
    const reassignToChannelId = parsedOptions.data?.reassignToChannelId;

    if (screensCount > 0) {
        if (!reassignToChannelId) {
            log.invalid({
                field: 'reassignToChannelId',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: channel.id,
            });
            return {
                ok: false,
                field: 'reassignToChannelId',
                message: 'Sélectionnez un canal de réaffectation pour les écrans.',
            };
        }

        if (reassignToChannelId === channel.id) {
            log.invalid({
                field: 'reassignToChannelId',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: channel.id,
            });
            return {
                ok: false,
                field: 'reassignToChannelId',
                message: 'Le canal de réaffectation doit être différent.',
            };
        }

        const targetChannel = await findChannelInOrganization(reassignToChannelId, access.organizationId);
        if (!targetChannel) {
            log.denied({
                reason: 'reassign_channel_not_found',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: channel.id,
                reassignToChannelId,
            });
            return {
                ok: false,
                field: 'reassignToChannelId',
                message: 'Canal de réaffectation introuvable.',
            };
        }

        try {
            await prisma.$transaction([
                prisma.screen.updateMany({
                    where: {channelId: channel.id},
                    data: {channelId: targetChannel.id},
                }),
                prisma.channel.delete({
                    where: {id: channel.id},
                    select: {id: true},
                }),
            ]);

            log.success({
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: channel.id,
                screensReassigned: screensCount,
                reassignToChannelId: targetChannel.id,
            });
            return {ok: true, channelId: channel.id};
        } catch (error) {
            log.error(error, {
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
                targetId: channel.id,
                reassignToChannelId: targetChannel.id,
            });
            return {ok: false, field: 'root', message: 'Impossible de supprimer ce canal.'};
        }
    }

    try {
        const deleted = await prisma.channel.delete({
            where: {id: channel.id},
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: deleted.id,
        });
        return {ok: true, channelId: deleted.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: channel.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de supprimer ce canal.'};
    }
}
