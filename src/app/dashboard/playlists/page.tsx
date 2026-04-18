import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { PlaylistsTable, type PlaylistRow } from '@/components/playlists/playlists-table';
import { defineAbilityFor } from '@/lib/casl/ability';
import { getPlaylistMetrics } from '@/lib/playlists/playlist-metrics';
import { toPlaylistScheduleImpact } from '@/lib/playlists/playlist-schedule-impact';
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
            schedules: {
                select: {
                    id: true,
                    type: true,
                    startDate: true,
                    endDate: true,
                    timeSlots: {
                        select: {
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true,
                        },
                        orderBy: [
                            {dayOfWeek: 'asc'},
                            {startTime: 'asc'},
                        ],
                    },
                },
                orderBy: {updatedAt: 'desc'},
            },
        },
        orderBy: {updatedAt: 'desc'},
    });

    const rows: PlaylistRow[] = playlists.map((playlist) => {
        const metrics = getPlaylistMetrics(playlist.items.map((item) => ({
            durationSeconds: item.mediaItem.durationSeconds,
            active: item.mediaItem.active,
        })));

        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            mediaCount: metrics.mediaCount,
            activeMediaCount: metrics.activeMediaCount,
            totalDurationSeconds: metrics.diffusableDurationSeconds,
            impactedSchedules: playlist.schedules.map(toPlaylistScheduleImpact),
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
