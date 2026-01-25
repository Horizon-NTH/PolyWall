'use server';

import { auth } from '@/auth';
import { AppSidebarClient } from '@/components/sidebar/app-sidebar-client';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/rbac';

export async function AppSidebar() {
    const session = await auth();
    if (!session) return null;

    const isUserSuperAdmin = isSuperAdmin(session);

    const organizations =
        isUserSuperAdmin
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
            canSwitchOrganizations={isUserSuperAdmin}
            user={{
                name: session.user.name,
                email: session.user.email,
                avatar: '',
            }}
        />
    );
}
