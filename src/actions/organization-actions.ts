'use server';

import { z } from 'zod';

import { auth, unstable_update } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/rbac';

const switchOrganizationSchema = z.object({
    organizationId: z.string().min(1),
});

export async function switchOrganization(organizationId: string) {
    const parsed = switchOrganizationSchema.safeParse({organizationId});
    if (!parsed.success) {
        return {ok: false};
    }

    const session = await auth();
    if (!session) {
        return {ok: false};
    }

    const isUserSuperAdmin = isSuperAdmin(session);
    if (!isUserSuperAdmin && session.user.organizationId !== organizationId) {
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
