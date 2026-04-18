import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { PlaylistActionsCard } from '@/components/playlists/playlist-actions-card';
import {
    PlaylistEditor,
    type AvailableMediaItem,
    type TimelineMediaItem,
} from '@/components/playlists/playlist-editor';
import { PlaylistSummaryCard } from '@/components/playlists/playlist-summary-card';
import { Button } from '@/components/ui/button';
import { defineAbilityFor } from '@/lib/casl/ability';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';
import { resolveThumbUrl } from '@/lib/storage/presigned-url';
import { formatDate } from '@/lib/utils';

type PlaylistDetailsPageProps = {
    params: Promise<{ playlistId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: PlaylistDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'Playlist')) redirect('/dashboard');

    const [{playlistId}, query] = await Promise.all([params, searchParams]);
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
                        {label: 'Playlists'},
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
            createdAt: true,
            updatedAt: true,
            items: {
                orderBy: {orderIndex: 'asc'},
                select: {
                    id: true,
                    mediaItemId: true,
                    mediaItem: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            durationSeconds: true,
                            active: true,
                            files: {
                                where: {
                                    variant: 'THUMB',
                                    status: 'READY',
                                    variantIndex: 0,
                                },
                                select: {
                                    storageBucket: true,
                                    objectKey: true,
                                },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });

    if (!playlist) notFound();

    const availableMediaRaw = await prisma.mediaItem.findMany({
        where: {
            organizationId,
            active: true,
        },
        select: {
            id: true,
            title: true,
            description: true,
            durationSeconds: true,
            files: {
                where: {
                    variant: 'THUMB',
                    status: 'READY',
                    variantIndex: 0,
                },
                select: {
                    storageBucket: true,
                    objectKey: true,
                },
                take: 1,
            },
        },
        orderBy: {title: 'asc'},
    });

    const availableMedia: AvailableMediaItem[] = await Promise.all(
        availableMediaRaw.map(async (media) => ({
            id: media.id,
            title: media.title,
            description: media.description,
            durationSeconds: media.durationSeconds,
            thumbUrl: await resolveThumbUrl(media.files[0] ?? null),
        })),
    );

    const initialTimeline: TimelineMediaItem[] = await Promise.all(
        playlist.items.map(async (item) => ({
            entryId: item.id,
            mediaItemId: item.mediaItem.id,
            title: item.mediaItem.title,
            description: item.mediaItem.description,
            durationSeconds: item.mediaItem.durationSeconds,
            thumbUrl: await resolveThumbUrl(item.mediaItem.files[0] ?? null),
            active: item.mediaItem.active,
        })),
    );

    const mediaCount = initialTimeline.length;
    const activeMediaCount = initialTimeline.reduce((sum, item) => sum + (item.active ? 1 : 0), 0);
    const totalDurationSeconds = initialTimeline.reduce((sum, item) => sum + item.durationSeconds, 0);
    const returnHref = resolveReturnTo(query.returnTo, '/dashboard/playlists');
    const editHref = appendReturnTo(`/dashboard/playlists/${playlist.id}/edit`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Playlists', href: '/dashboard/playlists'},
                    {label: playlist.name},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-140">{playlist.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            Dernière mise à jour le {formatDate(playlist.updatedAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={returnHref}>Retour</Link>
                        </Button>
                        <Button asChild>
                            <Link href={editHref}>Modifier infos</Link>
                        </Button>
                    </div>
                </div>

                <PlaylistEditor
                    playlistId={playlist.id}
                    availableMedia={availableMedia}
                    initialTimeline={initialTimeline}
                />

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="grid gap-4 lg:col-span-2">
                        <PlaylistSummaryCard
                            description={playlist.description}
                            mediaCount={mediaCount}
                            totalDurationSeconds={totalDurationSeconds}
                            inactiveMediaCount={mediaCount - activeMediaCount}
                            createdAt={playlist.createdAt.toISOString()}
                            updatedAt={playlist.updatedAt.toISOString()}
                        />
                    </div>

                    <PlaylistActionsCard playlistId={playlist.id} playlistName={playlist.name} />
                </div>
            </div>
        </>
    );
}
