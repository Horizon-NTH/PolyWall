import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { PlaylistForm } from '@/components/playlists/playlist-form';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';

type PlaylistEditPageProps = {
    params: Promise<{ playlistId: string }>
};

export default async function Page({params}: PlaylistEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('update', 'Playlist')) redirect('/dashboard');

    const {playlistId} = await params;
    if (!playlistId) notFound();

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
                        {label: 'Playlists', href: '/dashboard/playlists'},
                        {label: 'Modifier'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const playlist = await prisma.playlist.findFirst({
        where: {
            id: playlistId,
            organizationId,
        },
        select: {
            id: true,
            name: true,
            description: true,
        },
    });

    if (!playlist) notFound();

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Playlists', href: '/dashboard/playlists'},
                    {label: playlist.name, href: `/dashboard/playlists/${playlist.id}`},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <PlaylistForm
                    mode="edit"
                    playlistId={playlist.id}
                    cancelHref={`/dashboard/playlists/${playlist.id}`}
                    defaultValues={{
                        name: playlist.name,
                        description: playlist.description,
                    }}
                />
            </div>
        </>
    );
}
