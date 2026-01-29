'use server';

import { auth } from '@/auth';
import { AppSidebarClient } from '@/components/sidebar/app-sidebar-client';
import { prisma } from '@/lib/prisma';
import { defineAbilityFor } from '@/lib/casl/ability';

export async function AppSidebar() {
    const session = await auth();
    if (!session) return null;

    const ability = defineAbilityFor(session.user);
    const canSwitchOrganizations = ability.can('switch', 'Organization');

    const organizations =
        canSwitchOrganizations
            ? await prisma.organization.findMany({
                select: {id: true, name: true},
                orderBy: {name: 'asc'},
            })
            : session.user.organizationId
                ? await prisma.organization.findMany({
                    where: {id: session.user.organizationId},
                    select: {id: true, name: true},
                })
                : [];

    return (
        <AppSidebarClient
            organizations={organizations}
            currentOrganizationId={session.user.organizationId}
            userRole={session.user.role}
            userOrganizationId={session.user.organizationId}
            user={{
                name: session.user.name,
                email: session.user.email,
                avatar: '',
            }}
        />
    );
}
