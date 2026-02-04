import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { OrganizationOverview } from '@/components/organizations/organization-overview';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('view', 'OrganizationAdminSection')) redirect('/dashboard');

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
                        {label: 'Mon organisation'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const organization = await prisma.organization.findUnique({
        where: {id: organizationId},
        select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    users: true,
                    screens: true,
                    channels: true,
                    playlists: true,
                },
            },
        },
    });

    if (!organization) {
        notFound();
    }

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Mon organisation'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <OrganizationOverview organization={organization} />
            </div>
        </>
    );
}
