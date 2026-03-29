import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { ScreenPairingCard } from '@/components/screens/screen-pairing-card';
import { ScreensTable, type ScreenRow } from '@/components/screens/screens-table';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'Screen')) redirect('/dashboard');

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
                        {label: 'Écrans'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const [screens, channels] = await Promise.all([
        prisma.screen.findMany({
            where: {organizationId},
            select: {
                id: true,
                name: true,
                location: true,
                status: true,
                interactive: true,
                channelId: true,
                lastSeenAt: true,
                createdAt: true,
                updatedAt: true,
                channel: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {updatedAt: 'desc'},
        }),
        prisma.channel.findMany({
            where: {organizationId},
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        }),
    ]);

    const rows: ScreenRow[] = screens.map((screen) => ({
        id: screen.id,
        name: screen.name,
        location: screen.location,
        status: screen.status,
        channelId: screen.channelId,
        channelName: screen.channel?.name ?? null,
        interactive: screen.interactive,
        lastSeenAt: screen.lastSeenAt?.toISOString() ?? null,
        createdAt: screen.createdAt.toISOString(),
        updatedAt: screen.updatedAt.toISOString(),
    }));

    const canManage = ability.can('update', 'Screen');

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Écrans'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {canManage ? <ScreenPairingCard organizationId={organizationId} /> : null}
                <ScreensTable data={rows} canManage={canManage} channels={channels} />
            </div>
        </>
    );
}
