import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { PlaylistsTable, type PlaylistRow } from '@/components/playlists/playlists-table';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'Playlist')) redirect('/dashboard');

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
                        {label: 'Playlists'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const playlists = await prisma.playlist.findMany({
        where: {organizationId},
        select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            items: {
                select: {
                    id: true,
                    mediaItem: {
                        select: {
                            id: true,
                            durationSeconds: true,
                            active: true,
                        },
                    },
                },
            },
        },
        orderBy: {updatedAt: 'desc'},
    });

    const rows: PlaylistRow[] = playlists.map((playlist) => {
        const mediaCount = playlist.items.length;
        const totalDurationSeconds = playlist.items.reduce((sum, item) => sum + item.mediaItem.durationSeconds, 0);
        const activeMediaCount = playlist.items.reduce((sum, item) => sum + (item.mediaItem.active ? 1 : 0), 0);

        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            mediaCount,
            activeMediaCount,
            totalDurationSeconds,
            createdAt: playlist.createdAt.toISOString(),
            updatedAt: playlist.updatedAt.toISOString(),
        };
    });

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Playlists'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <PlaylistsTable data={rows} />
            </div>
        </>
    );
}
