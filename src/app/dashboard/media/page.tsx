import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MediaGrid, type MediaGridItem } from '@/components/media/media-grid';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { env } from '@/env';
import { defineAbilityFor } from '@/lib/casl/ability';
import {
    getMediaKindFromMimeType,
    selectPrimaryOriginalFile,
    selectThumbFile,
    toNumberFileSize,
    type MediaFileLike,
} from '@/lib/media/media-view-model';
import { prisma } from '@/lib/prisma';
import { getStorageService } from '@/lib/storage/storage-service';

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'MediaItem')) redirect('/dashboard');

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

    const mediaItems = await prisma.mediaItem.findMany({
        where: {organizationId},
        select: {
            id: true,
            title: true,
            description: true,
            durationSeconds: true,
            active: true,
            createdAt: true,
            updatedAt: true,
            files: {
                where: {
                    variant: {
                        in: ['ORIGINAL', 'THUMB'],
                    },
                },
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
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });

    const storage = getStorageService();

    const rows = await Promise.all(
        mediaItems.map(async (mediaItem) => {
            const files = mediaItem.files as MediaFileLike[];
            const original = selectPrimaryOriginalFile(files);
            if (!original) return null;

            const thumb = selectThumbFile(files, original.id);
            const thumbUrl =
                thumb && thumb.status === 'READY'
                    ? await storage.presignGet({
                        bucket: thumb.storageBucket,
                        key: thumb.objectKey,
                        expiresInSeconds: env.DOWNLOAD_URL_TTL_SECONDS,
                    })
                    : null;

            const row: MediaGridItem = {
                id: mediaItem.id,
                title: mediaItem.title,
                description: mediaItem.description,
                active: mediaItem.active,
                createdAt: mediaItem.createdAt.toISOString(),
                updatedAt: mediaItem.updatedAt.toISOString(),
                kind: getMediaKindFromMimeType(original.mimeType),
                status: original.status,
                thumbUrl,
                sizeBytes: toNumberFileSize(original.fileSizeBytes),
            };

            return row;
        }),
    );

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Médias'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <MediaGrid data={rows.filter((row): row is MediaGridItem => row !== null)} />
            </div>
        </>
    );
}
