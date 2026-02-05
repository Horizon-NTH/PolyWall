import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { UsersTable, type UserRow } from '@/components/users/users-table';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma/enums';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    const canView =
        ability.can('view', 'OrganizationAdminSection') ||
        ability.can('view', 'SuperAdminSection');

    if (!canView) redirect('/dashboard');

    const organizationId = session.user.organizationId;
    if (!organizationId) {
        const organizations = await prisma.organization.findMany({
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        });

        return (
            <>
                <DashboardHeader
                    items={[
                        {label: 'Tableau de bord', href: '/dashboard'},
                        {label: 'Utilisateurs'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const users = await prisma.user.findMany({
        where: {
            role: UserRole.CONTENT_MANAGER,
            organizationId,
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            description: true,
            active: true,
            createdAt: true,
        },
        orderBy: [{fullName: 'asc'}],
    });

    const rows: UserRow[] = users.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        description: user.description,
        role: UserRole.CONTENT_MANAGER,
        active: user.active,
        createdAt: user.createdAt.toISOString(),
    }));

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Utilisateurs'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <UsersTable data={rows} />
            </div>
        </>
    );
}
