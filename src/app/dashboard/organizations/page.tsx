import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

import { OrganizationsTable, type OrganizationRow } from './organizations-table';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'SuperAdminSection')) redirect('/dashboard');

    const organizations = await prisma.organization.findMany({
        select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            _count: {
                select: {
                    users: true,
                    screens: true,
                    channels: true,
                },
            },
        },
        orderBy: {name: 'asc'},
    });

    const rows: OrganizationRow[] = organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        description: organization.description,
        createdAt: organization.createdAt.toISOString(),
        usersCount: organization._count.users,
        screensCount: organization._count.screens,
        channelsCount: organization._count.channels,
    }));

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Organisations'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <OrganizationsTable data={rows} />
            </div>
        </>
    );
}
