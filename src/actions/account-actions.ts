'use server';

import argon2 from 'argon2';
import { z } from 'zod';

import { auth, unstable_update } from '@/auth';
import { prisma } from '@/lib/prisma';
import { changePasswordSchema, profileSchema } from '@/schemas/account-schema';

type ProfileField = keyof z.infer<typeof profileSchema> | 'root';
type PasswordField = keyof z.infer<typeof changePasswordSchema> | 'root';

export type ProfileActionResult =
    | { ok: true }
    | { ok: false; field?: ProfileField; message: string };

export type PasswordActionResult =
    | { ok: true }
    | { ok: false; field?: PasswordField; message: string };

function getFirstZodIssue(error: z.ZodError) {
    const issue = error.issues[0];
    if (!issue) {
        return {field: 'root', message: 'Données invalides.'};
    }

    return {
        field: issue.path[0] ? String(issue.path[0]) : 'root',
        message: issue.message,
    };
}

export async function updateProfile(
    data: z.infer<typeof profileSchema>,
): Promise<ProfileActionResult> {
    const session = await auth();
    if (!session?.user) {
        return {ok: false, field: 'root', message: 'Vous devez être connecté.'};
    }

    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        return {ok: false, field: issue.field as ProfileField, message: issue.message};
    }

    await prisma.user.update({
        where: {id: session.user.id},
        data: {fullName: parsed.data.fullName},
    });

    await unstable_update({user: {name: parsed.data.fullName}});
    return {ok: true};
}

export async function changePassword(
    data: z.infer<typeof changePasswordSchema>,
): Promise<PasswordActionResult> {
    const session = await auth();
    if (!session?.user) {
        return {ok: false, field: 'root', message: 'Vous devez être connecté.'};
    }

    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        return {ok: false, field: issue.field as PasswordField, message: issue.message};
    }

    const user = await prisma.user.findUnique({
        where: {id: session.user.id},
        select: {passwordHash: true},
    });

    if (!user?.passwordHash) {
        return {
            ok: false,
            field: 'root',
            message: 'Aucun mot de passe local n\'est configuré.',
        };
    }

    const isValid = await argon2.verify(user.passwordHash, parsed.data.currentPassword);
    if (!isValid) {
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

    return {ok: true};
}
