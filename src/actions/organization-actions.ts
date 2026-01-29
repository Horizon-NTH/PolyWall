'use server';

import { z } from 'zod';

import { auth, unstable_update } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defineAbilityFor } from '@/lib/casl/ability';

const switchOrganizationSchema = z.object({
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
