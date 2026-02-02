'use server';

import { z } from 'zod';

import { auth, unstable_update } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defineAbilityFor } from '@/lib/casl/ability';
import { organizationSchema } from '@/schemas/organization-schema';

const switchOrganizationSchema = z.object({
    organizationId: z.string().min(1),
});

const deleteOrganizationSchema = z.object({
    organizationId: z.string().min(1),
});

export async function switchOrganization(organizationId: string) {
    const parsed = switchOrganizationSchema.safeParse({organizationId});
    if (!parsed.success) {
        return {ok: false};
    }

    const session = await auth();
    if (!session?.user) {
        return {ok: false};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can('switch', 'Organization')) {
        return {ok: false};
    }

    const organization = await prisma.organization.findUnique({
        where: {id: organizationId},
        select: {id: true},
    });

    if (!organization) {
        return {ok: false};
    }

    await unstable_update({user: {organizationId}});
    return {ok: true};
}

type OrganizationField = keyof z.infer<typeof organizationSchema> | 'root';

export type OrganizationActionResult =
    | { ok: true; organizationId?: string }
    | { ok: false; field?: OrganizationField; message: string };

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

function mapPrismaError(error: unknown): { field?: OrganizationField; message: string } {
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            return {field: 'name', message: 'Le nom est déjà utilisé.'};
        }
    }
    return {field: 'root', message: 'Une erreur est survenue.'};
}

export async function createOrganization(
    data: z.infer<typeof organizationSchema>,
): Promise<OrganizationActionResult> {
    const session = await auth();
    if (!session?.user) {
        return {ok: false, field: 'root', message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) {
        return {ok: false, field: 'root', message: 'Accès refusé.'};
    }

    const parsed = organizationSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        return {ok: false, field: issue.field as OrganizationField, message: issue.message};
    }

    try {
        const organization = await prisma.organization.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
            },
            select: {id: true},
        });
        return {ok: true, organizationId: organization.id};
    } catch (error) {
        const mapped = mapPrismaError(error);
        return {ok: false, field: mapped.field, message: mapped.message};
    }
}

export async function updateOrganization(
    organizationId: string,
    data: z.infer<typeof organizationSchema>,
): Promise<OrganizationActionResult> {
    const session = await auth();
    if (!session?.user) {
        return {ok: false, field: 'root', message: 'Vous devez être connecté.'};
    }

    if (!organizationId) {
        return {ok: false, field: 'root', message: 'Organisation introuvable.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) {
        return {ok: false, field: 'root', message: 'Accès refusé.'};
    }

    const parsed = organizationSchema.safeParse(data);
    if (!parsed.success) {
        const issue = getFirstZodIssue(parsed.error);
        return {ok: false, field: issue.field as OrganizationField, message: issue.message};
    }

    try {
        const organization = await prisma.organization.update({
            where: {id: organizationId},
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
            },
            select: {id: true},
        });
        return {ok: true, organizationId: organization.id};
    } catch (error) {
        const mapped = mapPrismaError(error);
        return {ok: false, field: mapped.field, message: mapped.message};
    }
}

export async function deleteOrganization(
    organizationId: string,
): Promise<OrganizationActionResult> {
    const parsed = deleteOrganizationSchema.safeParse({organizationId});
    if (!parsed.success) {
        return {ok: false, field: 'root', message: 'Organisation introuvable.'};
    }

    const session = await auth();
    if (!session?.user) {
        return {ok: false, field: 'root', message: 'Vous devez être connecté.'};
    }

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) {
        return {ok: false, field: 'root', message: 'Accès refusé.'};
    }

    const counts = await prisma.organization.findUnique({
        where: {id: parsed.data.organizationId},
        select: {
            _count: {
                select: {
                    users: true,
                    screens: true,
                    channels: true,
                    playlists: true,
                    displayTemplates: true,
                    widgetInstances: true,
                },
            },
        },
    });

    if (!counts) {
        return {ok: false, field: 'root', message: 'Organisation introuvable.'};
    }

    const hasLinkedData = Object.values(counts._count).some((value) => value > 0);
    if (hasLinkedData) {
        return {
            ok: false,
            field: 'root',
            message: 'Supprimez d\'abord les données liées avant de supprimer l\'organisation.',
        };
    }

    await prisma.organization.delete({
        where: {id: parsed.data.organizationId},
    });

    return {ok: true};
}
