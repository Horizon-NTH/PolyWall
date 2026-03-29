'use server';

import { z } from 'zod';

import { auth } from '@/auth';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';
import { ScreenStatus } from '@/generated/prisma/enums';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { hashPairingToken } from '@/lib/screens/pairing';
import {
    screenApproveSchema,
    screenReactivateSchema,
    screenUpdateSchema,
} from '@/schemas/screen-schema';

type ScreenField = keyof z.infer<typeof screenApproveSchema> | 'root';

type ScreenActionResult =
    | { ok: true; screenId?: string }
    | { ok: false; field?: ScreenField; message: string };

type PairingActionResult =
    | { ok: true; otpCode: string; expiresAt: string }
    | { ok: false; field?: 'root'; message: string };
type PairingStateActionResult =
    | { ok: true; hasActiveToken: boolean; expiresAt?: string }
    | { ok: false; field?: 'root'; message: string };
type PairingRevokeActionResult =
    | { ok: true }
    | { ok: false; field?: 'root'; message: string };

const PAIRING_TOKEN_TTL_MINUTES = 10;

async function ensureScreenAccess(requiredAction: 'read' | 'create' | 'update' | 'delete') {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can(requiredAction, 'Screen')) {
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

async function findScreenInOrganization(screenId: string, organizationId: string) {
    return prisma.screen.findFirst({
        where: {id: screenId, organizationId},
        select: {
            id: true,
            status: true,
            organizationId: true,
            channelId: true,
            name: true,
        },
    });
}

async function findChannelInOrganization(channelId: string, organizationId: string) {
    return prisma.channel.findFirst({
        where: {id: channelId, organizationId},
        select: {id: true},
    });
}

function generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createScreenPairingToken(): Promise<PairingActionResult> {
    const log = createActionLogger({event: 'screen.pairing_token.create', action: 'create'});
    const access = await ensureScreenAccess('create');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const otpCode = generateOtpCode();
    const tokenHash = hashPairingToken(otpCode);
    const expiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MINUTES * 60 * 1000);

    try {
        await prisma.screenPairingToken.updateMany({
            where: {
                organizationId: access.organizationId,
                invalidatedAt: null,
                expiresAt: {gt: new Date()},
            },
            data: {
                invalidatedAt: new Date(),
            },
        });

        await prisma.screenPairingToken.create({
            data: {
                organizationId: access.organizationId,
                tokenHash,
                expiresAt,
                createdByUserId: access.session.user.id,
            },
            select: {id: true},
        });

        log.success({organizationId: access.organizationId, expiresAt: expiresAt.toISOString()});
        return {
            ok: true,
            otpCode,
            expiresAt: expiresAt.toISOString(),
        };
    } catch (error) {
        log.error(error, {organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Impossible de créer une URL d\'appairage.'};
    }
}

export async function getActiveScreenPairingTokenState(): Promise<PairingStateActionResult> {
    const log = createActionLogger({event: 'screen.pairing_token.state', action: 'change'});
    const access = await ensureScreenAccess('read');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    try {
        const activeToken = await prisma.screenPairingToken.findFirst({
            where: {
                organizationId: access.organizationId,
                invalidatedAt: null,
                expiresAt: {gt: new Date()},
            },
            select: {
                expiresAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!activeToken) {
            log.success({organizationId: access.organizationId, hasActiveToken: false});
            return {ok: true, hasActiveToken: false};
        }

        log.success({
            organizationId: access.organizationId,
            hasActiveToken: true,
            expiresAt: activeToken.expiresAt.toISOString(),
        });
        return {
            ok: true,
            hasActiveToken: true,
            expiresAt: activeToken.expiresAt.toISOString(),
        };
    } catch (error) {
        log.error(error, {organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Impossible de vérifier l\'état du code OTP.'};
    }
}

export async function revokeActiveScreenPairingToken(): Promise<PairingRevokeActionResult> {
    const log = createActionLogger({event: 'screen.pairing_token.revoke', action: 'update'});
    const access = await ensureScreenAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    try {
        await prisma.screenPairingToken.updateMany({
            where: {
                organizationId: access.organizationId,
                invalidatedAt: null,
                expiresAt: {gt: new Date()},
            },
            data: {
                invalidatedAt: new Date(),
            },
        });
        log.success({organizationId: access.organizationId});
        return {ok: true};
    } catch (error) {
        log.error(error, {organizationId: access.organizationId});
        return {ok: false, field: 'root', message: 'Impossible d\'invalider le code OTP actif.'};
    }
}

export async function approvePendingScreen(
    screenId: string,
    data: z.infer<typeof screenApproveSchema>,
): Promise<ScreenActionResult> {
    const log = createActionLogger({event: 'screen.approve', action: 'update', targetId: screenId});
    const access = await ensureScreenAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = screenApproveSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({field: issue.field, actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: issue.field as ScreenField, message: issue.message};
    }

    const screen = await findScreenInOrganization(screenId, access.organizationId);
    if (!screen) {
        log.denied({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            reason: 'screen_not_found',
        });
        return {ok: false, field: 'root', message: 'Écran introuvable.'};
    }

    if (screen.status !== ScreenStatus.PENDING) {
        log.denied({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            reason: 'screen_not_pending',
            currentStatus: screen.status,
        });
        return {ok: false, field: 'root', message: 'Cet écran n\'est plus en attente.'};
    }

    const channel = await findChannelInOrganization(parsed.data.channelId, access.organizationId);
    if (!channel) {
        log.invalid({
            field: 'channelId',
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'channelId', message: 'Canal introuvable.'};
    }

    try {
        const updated = await prisma.screen.update({
            where: {id: screen.id},
            data: {
                name: parsed.data.name,
                location: parsed.data.location,
                channelId: channel.id,
                status: ScreenStatus.ACTIVE,
                approvedAt: new Date(),
                approvedByUserId: access.session.user.id,
                revokedAt: null,
                revokedByUserId: null,
                interactive: parsed.data.interactive,
                interactiveUrl: parsed.data.interactiveUrl?.trim() ? parsed.data.interactiveUrl.trim() : null,
                inactivityTimeoutSeconds: parsed.data.inactivityTimeoutSeconds ?? null,
            },
            select: {id: true},
        });

        log.success({actorUserId: access.session.user.id, organizationId: access.organizationId, targetId: updated.id});
        return {ok: true, screenId: updated.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'name',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
            });
            return {ok: false, field: 'name', message: 'Un écran avec ce nom existe déjà.'};
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: screen.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de valider cet écran.'};
    }
}

export async function updateScreen(
    screenId: string,
    data: z.infer<typeof screenUpdateSchema>,
): Promise<ScreenActionResult> {
    const log = createActionLogger({event: 'screen.update', action: 'update', targetId: screenId});
    const access = await ensureScreenAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = screenUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({field: issue.field, actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: issue.field as ScreenField, message: issue.message};
    }

    const screen = await findScreenInOrganization(screenId, access.organizationId);
    if (!screen) {
        log.denied({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            reason: 'screen_not_found',
        });
        return {ok: false, field: 'root', message: 'Écran introuvable.'};
    }

    if (screen.status === ScreenStatus.PENDING) {
        log.denied({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            reason: 'screen_pending_requires_approval',
            currentStatus: screen.status,
        });
        return {ok: false, field: 'root', message: 'Validez d\'abord cet écran en attente.'};
    }

    const channel = await findChannelInOrganization(parsed.data.channelId, access.organizationId);
    if (!channel) {
        log.invalid({
            field: 'channelId',
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'channelId', message: 'Canal introuvable.'};
    }

    try {
        const updated = await prisma.screen.update({
            where: {id: screen.id},
            data: {
                name: parsed.data.name,
                location: parsed.data.location,
                channelId: channel.id,
                interactive: parsed.data.interactive,
                interactiveUrl: parsed.data.interactiveUrl?.trim() ? parsed.data.interactiveUrl.trim() : null,
                inactivityTimeoutSeconds: parsed.data.inactivityTimeoutSeconds ?? null,
            },
            select: {id: true},
        });

        log.success({actorUserId: access.session.user.id, organizationId: access.organizationId, targetId: updated.id});
        return {ok: true, screenId: updated.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'name',
                actorUserId: access.session.user.id,
                organizationId: access.organizationId,
            });
            return {ok: false, field: 'name', message: 'Un écran avec ce nom existe déjà.'};
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: screen.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de mettre à jour cet écran.'};
    }
}

export async function revokeScreen(screenId: string): Promise<ScreenActionResult> {
    const log = createActionLogger({event: 'screen.revoke', action: 'update', targetId: screenId});
    const access = await ensureScreenAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const screen = await findScreenInOrganization(screenId, access.organizationId);
    if (!screen) {
        log.denied({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            reason: 'screen_not_found',
        });
        return {ok: false, field: 'root', message: 'Écran introuvable.'};
    }

    try {
        await prisma.screen.update({
            where: {id: screen.id},
            data: {
                status: ScreenStatus.REVOKED,
                channelId: null,
                revokedAt: new Date(),
                revokedByUserId: access.session.user.id,
            },
            select: {id: true},
        });

        log.success({actorUserId: access.session.user.id, organizationId: access.organizationId, targetId: screen.id});
        return {ok: true, screenId: screen.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: screen.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de révoquer cet écran.'};
    }
}

export async function reactivateScreen(
    screenId: string,
    data: z.infer<typeof screenReactivateSchema>,
): Promise<ScreenActionResult> {
    const log = createActionLogger({event: 'screen.reactivate', action: 'update', targetId: screenId});
    const access = await ensureScreenAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = screenReactivateSchema.safeParse(data);
    if (!parsed.success) {
        log.invalid({field: 'channelId', actorUserId: access.session.user.id, organizationId: access.organizationId});
        return {ok: false, field: 'channelId', message: 'Canal requis.'};
    }

    const screen = await findScreenInOrganization(screenId, access.organizationId);
    if (!screen) {
        log.denied({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            reason: 'screen_not_found',
        });
        return {ok: false, field: 'root', message: 'Écran introuvable.'};
    }

    const channel = await findChannelInOrganization(parsed.data.channelId, access.organizationId);
    if (!channel) {
        log.invalid({
            field: 'channelId',
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
        });
        return {ok: false, field: 'channelId', message: 'Canal introuvable.'};
    }

    try {
        await prisma.screen.update({
            where: {id: screen.id},
            data: {
                status: ScreenStatus.ACTIVE,
                channelId: channel.id,
                revokedAt: null,
                revokedByUserId: null,
            },
            select: {id: true},
        });

        log.success({actorUserId: access.session.user.id, organizationId: access.organizationId, targetId: screen.id});
        return {ok: true, screenId: screen.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: screen.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de réactiver cet écran.'};
    }
}

export async function deleteScreen(screenId: string): Promise<ScreenActionResult> {
    const log = createActionLogger({event: 'screen.delete', action: 'delete', targetId: screenId});
    const access = await ensureScreenAccess('delete');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const screen = await findScreenInOrganization(screenId, access.organizationId);
    if (!screen) {
        log.denied({
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            reason: 'screen_not_found',
        });
        return {ok: false, field: 'root', message: 'Écran introuvable.'};
    }

    try {
        await prisma.screen.delete({
            where: {id: screen.id},
            select: {id: true},
        });

        log.success({actorUserId: access.session.user.id, organizationId: access.organizationId, targetId: screen.id});
        return {ok: true, screenId: screen.id};
    } catch (error) {
        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.organizationId,
            targetId: screen.id,
        });
        return {ok: false, field: 'root', message: 'Impossible de supprimer cet écran.'};
    }
}
