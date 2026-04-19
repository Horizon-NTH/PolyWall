import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MediaActionsCard } from '@/components/media/media-actions-card';
import { MediaDetailPreview } from '@/components/media/media-detail-preview';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { defineAbilityFor } from '@/lib/casl/ability';
import {
    extractMediaMetaSummary,
    getMediaKindFromMimeType,
    getMediaKindLabel,
    getMediaStatusLabel,
    selectPrimaryOriginalFile,
    selectRenderFiles,
    selectThumbFile,
    toNumberFileSize,
    type MediaFileLike,
} from '@/lib/media/media-view-model';
import { prisma } from '@/lib/prisma';
import { appendReturnTo, resolveReturnTo } from '@/lib/return-to';
import { presignStorageObjectGetUrl } from '@/lib/storage/presigned-url';
import { formatBytes, formatDate } from '@/lib/utils';

type MediaDetailsPageProps = {
    params: Promise<{ mediaItemId: string }>;
    searchParams: Promise<{ returnTo?: string }>;
};

export default async function Page({params, searchParams}: MediaDetailsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'MediaItem')) redirect('/dashboard');

    const [{mediaItemId}, query] = await Promise.all([params, searchParams]);
    if (!mediaItemId) {
        notFound();
    }
    const backHref = resolveReturnTo(query.returnTo, '/dashboard/media');

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
                        {label: 'Médias'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const mediaItem = await prisma.mediaItem.findFirst({
        where: {
            id: mediaItemId,
            organizationId,
        },
        select: {
            id: true,
            title: true,
            description: true,
            durationSeconds: true,
            active: true,
            createdAt: true,
            updatedAt: true,
            playlistItems: {
                distinct: ['playlistId'],
                select: {
                    playlist: {
                        select: {
                            name: true,
                        },
                    },
                },
                orderBy: {
                    playlist: {
                        name: 'asc',
                    },
                },
            },
            files: {
                select: {
                    id: true,
                    sourceMediaFileId: true,
                    status: true,
                    variant: true,
                    variantIndex: true,
                    mimeType: true,
                    fileSizeBytes: true,
                    storageBucket: true,
                    objectKey: true,
                    originalFileName: true,
                    metaJson: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: [{variant: 'asc'}, {variantIndex: 'asc'}],
            },
        },
    });

    if (!mediaItem) {
        notFound();
    }

    const files = mediaItem.files as MediaFileLike[];
    const original = selectPrimaryOriginalFile(files);

    const originalUrl =
        original && (original.status === 'READY' || original.status === 'UPLOADED' || original.status === 'PROCESSING')
            ? await presignStorageObjectGetUrl(original)
            : null;

    const thumb = selectThumbFile(files, original?.id ?? null);
    const hasReadyThumb = Boolean(thumb && thumb.status === 'READY');

    const renderFiles = selectRenderFiles(files, original?.id ?? null);
    const renderUrls = await Promise.all(
        renderFiles.map(async (file) => ({
            index: file.variantIndex,
            url: await presignStorageObjectGetUrl(file),
        })),
    );

    const kind = getMediaKindFromMimeType(original?.mimeType ?? 'application/octet-stream');
    const meta = extractMediaMetaSummary(original?.metaJson ?? null);
    const infoRows: Array<{ label: string; value: string; breakAll?: boolean; muted?: boolean; success?: boolean }> = [
        {label: 'Description', value: mediaItem.description, breakAll: true},
        {label: 'Type', value: getMediaKindLabel(kind)},
        {label: 'Statut fichier', value: original ? getMediaStatusLabel(original.status) : 'Aucun original'},
        {label: 'Actif', value: mediaItem.active ? 'Oui' : 'Non', success: mediaItem.active, muted: !mediaItem.active},
        {label: 'Durée', value: `${mediaItem.durationSeconds} s`},
        {label: 'Créé le', value: formatDate(mediaItem.createdAt)},
    ];

    if (original) {
        infoRows.push(
            {label: 'Taille', value: formatBytes(toNumberFileSize(original.fileSizeBytes))},
            {label: 'Nom fichier', value: original.originalFileName, breakAll: true},
        );
    }
    if (meta.width && meta.height) {
        infoRows.push({label: 'Dimensions', value: `${meta.width} x ${meta.height}`});
    }
    if (meta.codec) {
        infoRows.push({label: 'Codec', value: meta.codec});
    }
    if (meta.pageCount || meta.slideCount) {
        infoRows.push({label: 'Pages / Slides', value: String(meta.pageCount ?? meta.slideCount)});
    }
    if (hasReadyThumb) {
        infoRows.push({label: 'Thumbnail', value: 'Disponible'});
    }
    const editHref = appendReturnTo(`/dashboard/media/${mediaItem.id}/edit`, query.returnTo);

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Médias', href: '/dashboard/media'},
                    {label: mediaItem.title},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-all max-w-140">{mediaItem.title}</h1>
                        <p className="text-muted-foreground text-sm">Dernière mise à jour
                            le {formatDate(mediaItem.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={backHref}>Retour</Link>
                        </Button>
                        <Button asChild>
                            <Link href={editHref}>Modifier</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4">
                    <MediaDetailPreview
                        title={mediaItem.title}
                        kind={kind}
                        originalUrl={originalUrl}
                        originalMimeType={original?.mimeType ?? null}
                        renderUrls={renderUrls}
                    />

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Informations</CardTitle>
                                <CardDescription>Données principales du média.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                                {infoRows.map((row) => (
                                    <div key={row.label}>
                                        <p className="text-muted-foreground text-xs uppercase">{row.label}</p>
                                        <p
                                            className={
                                                row.success
                                                    ? 'text-emerald-600'
                                                    : row.muted
                                                        ? 'text-muted-foreground'
                                                        : row.breakAll
                                                            ? 'break-all'
                                                            : undefined
                                            }
                                        >
                                            {row.value}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="grid gap-4">
                            <MediaActionsCard
                                mediaItemId={mediaItem.id}
                                mediaTitle={mediaItem.title}
                                isActive={mediaItem.active}
                                playlistUsage={{
                                    count: mediaItem.playlistItems.length,
                                    playlistNames: mediaItem.playlistItems.map((item) => item.playlist.name),
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
