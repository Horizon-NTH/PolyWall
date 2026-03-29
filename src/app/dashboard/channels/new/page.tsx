import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ChannelForm } from '@/components/channels/channel-form';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('create', 'Channel')) redirect('/dashboard');

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
                        {label: 'Canaux', href: '/dashboard/channels'},
                        {label: 'Créer'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const templates = await prisma.displayTemplate.findMany({
        where: {
            OR: [{organizationId: null}, {organizationId}],
        },
        select: {
            id: true,
            name: true,
            organizationId: true,
        },
        orderBy: [{organizationId: 'asc'}, {name: 'asc'}],
    });

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Canaux', href: '/dashboard/channels'},
                    {label: 'Créer'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <ChannelForm
                    mode="create"
                    templates={templates}
                    cancelHref="/dashboard/channels"
                />
            </div>
        </>
    );
}
