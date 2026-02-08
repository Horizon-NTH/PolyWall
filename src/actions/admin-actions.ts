'use server';

import argon2 from 'argon2';
import { z } from 'zod';

import { auth } from '@/auth';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { getFirstZodIssue } from '@/actions/action-utils';
import { createActionLogger } from '@/actions/action-logging';
import {
    adminCreateSchema,
    adminDeleteSchema,
    adminToggleActiveSchema,
    adminUpdateSchema, isAdminRole,
} from '@/schemas/admin-schema';
import { UserRole } from '@/generated/prisma/enums';

type AdminField = keyof z.infer<typeof adminCreateSchema> | 'root';

type AdminActionResult =
    | { ok: true; adminId?: string }
    | { ok: false; field?: AdminField; message: string };

async function ensureSuperAdminAccess(requiredAction: 'create' | 'update' | 'delete') {
    const session = await auth();
    if (!session?.user) {
        return {ok: false as const, field: 'root', message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) {
        return {ok: false as const, field: 'root', message: 'Accès refusé.'};
    }
    if (!ability.can(requiredAction, 'User')) {
        return {ok: false as const, field: 'root', message: 'Accès refusé.'};
    }

    return {ok: true as const, session};
}

async function ensureOrganizationExists(organizationId: string) {
    const organization = await prisma.organization.findUnique({
        where: {id: organizationId},
        select: {id: true},
    });

    return organization?.id ?? null;
}

async function ensureAdminTarget(adminId: string) {
    const admin = await prisma.user.findUnique({
        where: {id: adminId},
        select: {id: true, role: true, organizationId: true, active: true},
    });

    if (!admin || !isAdminRole(admin.role)) {
        return null;
    }

    return admin;
}

async function countOtherActiveSuperAdmins(excludeId: string) {
    return prisma.user.count({
        where: {
            id: {not: excludeId},
            role: UserRole.PLATFORM_SUPER_ADMIN,
            active: true,
        },
    });
}

export async function createAdmin(
    data: z.infer<typeof adminCreateSchema>,
): Promise<AdminActionResult> {
    const log = createActionLogger({event: 'admin.create', action: 'create'});
    const access = await ensureSuperAdminAccess('create');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = adminCreateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
        });
        return {ok: false, field: issue.field as AdminField, message: issue.message};
    }

    const {role, organizationId} = parsed.data;
    if (role === UserRole.ORGANIZATION_ADMIN) {
        if (!organizationId) {
            log.invalid({
                field: 'organizationId',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
            });
            return {
                ok: false,
                field: 'organizationId',
                message: 'Organisation obligatoire pour les administrateurs d\'organisations.',
            };
        }
        const orgExists = await ensureOrganizationExists(organizationId);
        if (!orgExists) {
            log.invalid({
                field: 'organizationId',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
            });
            return {
                ok: false,
                field: 'organizationId',
                message: 'Organisation introuvable.',
            };
        }
    }

    const passwordHash = await argon2.hash(parsed.data.password);

    try {
        const created = await prisma.user.create({
            data: {
                fullName: parsed.data.fullName,
                email: parsed.data.email,
                description: parsed.data.description,
                role: parsed.data.role,
                organizationId:
                    parsed.data.role === UserRole.ORGANIZATION_ADMIN
                        ? parsed.data.organizationId
                        : null,
                passwordHash,
                active: parsed.data.active,
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: created.id,
        });
        return {ok: true, adminId: created.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'email',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
            });
            return {
                ok: false,
                field: 'email',
                message: 'Cet email est déjà utilisé.',
            };
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
        });
        return {ok: false, field: 'root', message: 'Impossible de créer cet administrateur.'};
    }
}

export async function updateAdmin(
    adminId: string,
    data: z.infer<typeof adminUpdateSchema>,
): Promise<AdminActionResult> {
    const log = createActionLogger({event: 'admin.update', action: 'update', targetId: adminId});
    const access = await ensureSuperAdminAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    if (!adminId) {
        log.invalid({actorUserId: access.session.user.id});
        return {ok: false, field: 'root', message: 'Administrateur introuvable.'};
    }

    const parsed = adminUpdateSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: adminId,
        });
        return {ok: false, field: issue.field as AdminField, message: issue.message};
    }

    const admin = await ensureAdminTarget(adminId);
    if (!admin) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: adminId,
        });
        return {ok: false, field: 'root', message: 'Administrateur introuvable.'};
    }

    if (
        admin.role === UserRole.PLATFORM_SUPER_ADMIN &&
        parsed.data.role !== UserRole.PLATFORM_SUPER_ADMIN
    ) {
        const otherSuperAdmins = await countOtherActiveSuperAdmins(adminId);
        if (otherSuperAdmins === 0) {
            log.denied({
                reason: 'last_super_admin',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
                targetId: adminId,
            });
            return {
                ok: false,
                field: 'role',
                message: 'Impossible de retirer le dernier super admin actif.',
            };
        }
    }

    if (
        admin.role === UserRole.PLATFORM_SUPER_ADMIN &&
        admin.active &&
        !parsed.data.active
    ) {
        const otherSuperAdmins = await countOtherActiveSuperAdmins(adminId);
        if (otherSuperAdmins === 0) {
            log.denied({
                reason: 'last_super_admin',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
                targetId: adminId,
            });
            return {
                ok: false,
                field: 'active',
                message: 'Impossible de désactiver le dernier super admin actif.',
            };
        }
    }

    if (parsed.data.role === UserRole.ORGANIZATION_ADMIN) {
        if (!parsed.data.organizationId) {
            log.invalid({
                field: 'organizationId',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
                targetId: adminId,
            });
            return {
                ok: false,
                field: 'organizationId',
                message: 'Organisation obligatoire pour les administrateurs d\'organisations.',
            };
        }
        const orgExists = await ensureOrganizationExists(parsed.data.organizationId);
        if (!orgExists) {
            log.invalid({
                field: 'organizationId',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
                targetId: adminId,
            });
            return {
                ok: false,
                field: 'organizationId',
                message: 'Organisation introuvable.',
            };
        }
    }

    try {
        const updated = await prisma.user.update({
            where: {id: adminId},
            data: {
                fullName: parsed.data.fullName,
                email: parsed.data.email,
                description: parsed.data.description,
                role: parsed.data.role,
                organizationId:
                    parsed.data.role === UserRole.ORGANIZATION_ADMIN
                        ? parsed.data.organizationId
                        : null,
                active: parsed.data.active,
            },
            select: {id: true},
        });

        log.success({
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: updated.id,
        });
        return {ok: true, adminId: updated.id};
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            log.invalid({
                field: 'email',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
                targetId: adminId,
            });
            return {
                ok: false,
                field: 'email',
                message: 'Cet email est déjà utilisé.',
            };
        }

        log.error(error, {
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: adminId,
        });
        return {ok: false, field: 'root', message: 'Impossible de mettre à jour cet administrateur.'};
    }
}

export async function toggleAdminActive(
    adminId: string,
): Promise<AdminActionResult> {
    const log = createActionLogger({event: 'admin.toggle', action: 'toggle', targetId: adminId});
    const access = await ensureSuperAdminAccess('update');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = adminToggleActiveSchema.safeParse({adminId});
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
        });
        return {ok: false, field: issue.field as AdminField, message: issue.message};
    }

    if (parsed.data.adminId === access.session.user.id) {
        log.denied({
            reason: 'self_action',
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: parsed.data.adminId,
        });
        return {ok: false, field: 'root', message: 'Vous ne pouvez pas modifier votre propre statut.'};
    }

    const admin = await ensureAdminTarget(parsed.data.adminId);
    if (!admin) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: parsed.data.adminId,
        });
        return {ok: false, field: 'root', message: 'Administrateur introuvable.'};
    }

    if (admin.role === UserRole.PLATFORM_SUPER_ADMIN && admin.active) {
        const otherSuperAdmins = await countOtherActiveSuperAdmins(admin.id);
        if (otherSuperAdmins === 0) {
            log.denied({
                reason: 'last_super_admin',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
                targetId: admin.id,
            });
            return {
                ok: false,
                field: 'active',
                message: 'Impossible de désactiver le dernier super admin actif.',
            };
        }
    }

    const updated = await prisma.user.update({
        where: {id: admin.id},
        data: {active: !admin.active},
        select: {id: true},
    });

    log.success({
        actorUserId: access.session.user.id,
        organizationId: access.session.user.organizationId,
        targetId: updated.id,
    });
    return {ok: true, adminId: updated.id};
}

export async function deleteAdmin(
    adminId: string,
): Promise<AdminActionResult> {
    const log = createActionLogger({event: 'admin.delete', action: 'delete', targetId: adminId});
    const access = await ensureSuperAdminAccess('delete');
    if (!access.ok) {
        log.denied({reason: access.message});
        return {ok: false, field: 'root', message: access.message};
    }

    const parsed = adminDeleteSchema.safeParse({adminId});
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        log.invalid({
            field: issue.field,
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
        });
        return {ok: false, field: issue.field as AdminField, message: issue.message};
    }

    if (parsed.data.adminId === access.session.user.id) {
        log.denied({
            reason: 'self_action',
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: parsed.data.adminId,
        });
        return {ok: false, field: 'root', message: 'Vous ne pouvez pas supprimer votre propre compte.'};
    }

    const admin = await ensureAdminTarget(parsed.data.adminId);
    if (!admin) {
        log.invalid({
            actorUserId: access.session.user.id,
            organizationId: access.session.user.organizationId,
            targetId: parsed.data.adminId,
        });
        return {ok: false, field: 'root', message: 'Administrateur introuvable.'};
    }

    if (admin.role === UserRole.PLATFORM_SUPER_ADMIN) {
        const otherSuperAdmins = await countOtherActiveSuperAdmins(admin.id);
        if (otherSuperAdmins === 0) {
            log.denied({
                reason: 'last_super_admin',
                actorUserId: access.session.user.id,
                organizationId: access.session.user.organizationId,
                targetId: admin.id,
            });
            return {
                ok: false,
                field: 'root',
                message: 'Impossible de supprimer le dernier super admin actif.',
            };
        }
    }

    await prisma.user.delete({
        where: {id: admin.id},
    });

    log.success({
        actorUserId: access.session.user.id,
        organizationId: access.session.user.organizationId,
        targetId: admin.id,
    });
    return {ok: true};
}
