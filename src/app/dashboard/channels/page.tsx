import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ChannelsTable, type ChannelRow } from '@/components/channels/channels-table';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'Channel')) redirect('/dashboard');

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
                        {label: 'Canaux'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const channels = await prisma.channel.findMany({
        where: {organizationId},
        select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            displayTemplate: {
                select: {
                    name: true,
                },
            },
            _count: {
                select: {
                    screens: true,
                    schedules: true,
                },
            },
        },
        orderBy: {updatedAt: 'desc'},
    });

    const rows: ChannelRow[] = channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        displayTemplateName: channel.displayTemplate.name,
        screensCount: channel._count.screens,
        schedulesCount: channel._count.schedules,
        createdAt: channel.createdAt.toISOString(),
        updatedAt: channel.updatedAt.toISOString(),
    }));

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Canaux'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <ChannelsTable data={rows} canManage={ability.can('create', 'Channel')} />
            </div>
        </>
    );
}
