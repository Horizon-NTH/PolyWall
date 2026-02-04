'use server';

import argon2 from 'argon2';
import { z } from 'zod';

import { auth } from '@/auth';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { getFirstZodIssue } from '@/actions/action-utils';
import { userCreateSchema, userUpdateSchema } from '@/schemas/user-schema';
import { UserRole } from '@/generated/prisma/enums';

type UserField = keyof z.infer<typeof userCreateSchema> | 'root';

type UserActionResult =
    | { ok: true; userId?: string }
    | { ok: false; field?: UserField; message: string };

async function ensureUserAccess() {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, field: 'root', message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'OrganizationAdminSection') && !ability.can('view', 'SuperAdminSection')) {
        return {ok: false as const, field: 'root', message: 'Accès refusé.'};
    }

    if (!session.user.organizationId) {
        return {ok: false as const, field: 'root', message: 'Aucune organisation sélectionnée.'};
    }

    return {ok: true as const, session};
}

async function ensureUserTarget(userId: string, organizationId: string) {
    const user = await prisma.user.findUnique({
        where: {id: userId},
        select: {id: true, role: true, organizationId: true, active: true},
    });

    if (!user || user.role !== UserRole.CONTENT_MANAGER) {
        return null;
    }

    if (user.organizationId !== organizationId) {
        return null;
    }

    return user;
}

export async function createUser(
    data: z.infer<typeof userCreateSchema>,
): Promise<UserActionResult> {
    const access = await ensureUserAccess();
    if (!access.ok) {
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = userCreateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        return {ok: false, field: issue.field as UserField, message: issue.message};
    }

    const passwordHash = await argon2.hash(parsed.data.password);

    try {
        const created = await prisma.user.create({
            data: {
                fullName: parsed.data.fullName,
                email: parsed.data.email,
                description: parsed.data.description,
                role: UserRole.CONTENT_MANAGER,
                organizationId: access.session.user.organizationId,
                passwordHash,
                active: parsed.data.active,
            },
            select: {id: true},
        });

        return {ok: true, userId: created.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            return {
                ok: false,
                field: 'email',
                message: 'Cet email est déjà utilisé.',
            };
        }

        return {ok: false, field: 'root', message: 'Impossible de créer cet utilisateur.'};
    }
}

export async function updateUser(
    userId: string,
    data: z.infer<typeof userUpdateSchema>,
): Promise<UserActionResult> {
    const access = await ensureUserAccess();
    if (!access.ok) {
        return {ok: false, field: 'root', message: access.message};
    }

    if (!userId) {
        return {ok: false, field: 'root', message: 'Utilisateur introuvable.'};
    }

    const parsed = userUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        return {ok: false, field: issue.field as UserField, message: issue.message};
    }

    const user = await ensureUserTarget(userId, access.session.user.organizationId!);
    if (!user) {
        return {ok: false, field: 'root', message: 'Utilisateur introuvable.'};
    }

    try {
        const updated = await prisma.user.update({
            where: {id: userId},
            data: {
                fullName: parsed.data.fullName,
                email: parsed.data.email,
                description: parsed.data.description,
                active: parsed.data.active,
            },
            select: {id: true},
        });

        return {ok: true, userId: updated.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            return {
                ok: false,
                field: 'email',
                message: 'Cet email est déjà utilisé.',
            };
        }

        return {ok: false, field: 'root', message: 'Impossible de mettre à jour cet utilisateur.'};
    }
}

export async function toggleUserActive(
    userId: string,
): Promise<UserActionResult> {
    const access = await ensureUserAccess();
    if (!access.ok) {
        return {ok: false, field: 'root', message: access.message};
    }

    if (!userId) {
        return {ok: false, field: 'root', message: 'Utilisateur introuvable.'};
    }

    if (userId === access.session.user.id) {
        return {ok: false, field: 'root', message: 'Vous ne pouvez pas modifier votre propre statut.'};
    }

    const user = await ensureUserTarget(userId, access.session.user.organizationId!);
    if (!user) {
        return {ok: false, field: 'root', message: 'Utilisateur introuvable.'};
    }

    const updated = await prisma.user.update({
        where: {id: user.id},
        data: {active: !user.active},
        select: {id: true},
    });

    return {ok: true, userId: updated.id};
}

export async function deleteUser(
    userId: string,
): Promise<UserActionResult> {
    const access = await ensureUserAccess();
    if (!access.ok) {
        return {ok: false, field: 'root', message: access.message};
    }

    if (!userId) {
        return {ok: false, field: 'root', message: 'Utilisateur introuvable.'};
    }

    if (userId === access.session.user.id) {
        return {ok: false, field: 'root', message: 'Vous ne pouvez pas supprimer votre propre compte.'};
    }

    const user = await ensureUserTarget(userId, access.session.user.organizationId!);
    if (!user) {
        return {ok: false, field: 'root', message: 'Utilisateur introuvable.'};
    }

    await prisma.user.delete({
        where: {id: user.id},
    });

    return {ok: true};
}
