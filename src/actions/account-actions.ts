'use server';

import argon2 from 'argon2';
import { z } from 'zod';

import { auth, unstable_update } from '@/auth';
import { prisma } from '@/lib/prisma';
import { changePasswordSchema, profileSchema } from '@/schemas/account-schema';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';

type ProfileField = keyof z.infer<typeof profileSchema> | 'root';
type PasswordField = keyof z.infer<typeof changePasswordSchema> | 'root';

export type ProfileActionResult =
    | { ok: true }
    | { ok: false; field?: ProfileField; message: string };

export type PasswordActionResult =
    | { ok: true }
    | { ok: false; field?: PasswordField; message: string };

export async function updateProfile(
    data: z.infer<typeof profileSchema>,
): Promise<ProfileActionResult> {
    const log = createActionLogger({event: 'account.profile.update', action: 'update'});
    const session = await auth();
    if (!session?.user) {
        log.denied({reason: 'not_authenticated'});
        return {ok: false, field: 'root', message: 'Vous devez être connecté.'};
    }

    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
        });
        return {ok: false, field: issue.field as ProfileField, message: issue.message};
    }

    await prisma.user.update({
        where: {id: session.user.id},
        data: {fullName: parsed.data.fullName},
    });

    await unstable_update({user: {name: parsed.data.fullName}});
    log.success({
        actorUserId: session.user.id,
        organizationId: session.user.organizationId,
        targetId: session.user.id,
    });
    return {ok: true};
}

export async function changePassword(
    data: z.infer<typeof changePasswordSchema>,
): Promise<PasswordActionResult> {
    const log = createActionLogger({event: 'account.password.change', action: 'change'});
    const session = await auth();
    if (!session?.user) {
        log.denied({reason: 'not_authenticated'});
        return {ok: false, field: 'root', message: 'Vous devez être connecté.'};
    }

    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
        });
        return {ok: false, field: issue.field as PasswordField, message: issue.message};
    }

    const user = await prisma.user.findUnique({
        where: {id: session.user.id},
        select: {passwordHash: true},
    });

    if (!user?.passwordHash) {
        log.invalid({
            reason: 'password_not_configured',
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
        });
        return {
            ok: false,
            field: 'root',
            message: 'Aucun mot de passe local n\'est configuré.',
        };
    }

    const isValid = await argon2.verify(user.passwordHash, parsed.data.currentPassword);
    if (!isValid) {
        log.invalid({
            reason: 'password_mismatch',
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
        });
        return {
            ok: false,
            field: 'currentPassword',
            message: 'Mot de passe actuel incorrect.',
        };
    }

    const newHash = await argon2.hash(parsed.data.newPassword);
    await prisma.user.update({
        where: {id: session.user.id},
        data: {passwordHash: newHash},
    });

    log.success({
        actorUserId: session.user.id,
        organizationId: session.user.organizationId,
        targetId: session.user.id,
    });
    return {ok: true};
}
