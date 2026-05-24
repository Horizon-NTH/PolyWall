import { MediaFileStatus, MediaFileVariant } from '@/generated/prisma/enums';
import {
    type MediaFileLike,
    selectPrimaryOriginalFile,
    selectThumbFile,
} from '@/lib/media/media-view-model';
import { prisma } from '@/lib/prisma';
import { resolveThumbUrl } from '@/lib/storage/presigned-url';

export type StaticImageMediaOption = {
    id: string;
    title: string;
    thumbUrl: string | null;
};

export async function findStaticImageMediaOptions(organizationId: string | null | undefined) {
    if (!organizationId) return [];

    const mediaItems = await prisma.mediaItem.findMany({
        where: {
            organizationId,
            active: true,
            files: {
                some: {
                    status: MediaFileStatus.READY,
                    variant: MediaFileVariant.ORIGINAL,
                    mimeType: {
                        startsWith: 'image/',
                    },
                },
            },
        },
        orderBy: [
            {title: 'asc'},
            {updatedAt: 'desc'},
        ],
        select: {
            id: true,
            title: true,
            files: {
                where: {
                    variant: {
                        in: [MediaFileVariant.ORIGINAL, MediaFileVariant.THUMB],
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
    });

    return Promise.all(mediaItems.map(async (mediaItem) => {
        const files = mediaItem.files as MediaFileLike[];
        const original = selectPrimaryOriginalFile(files);
        const thumb = original ? selectThumbFile(files, original.id) : null;
        const previewFile = thumb ?? original;

        return {
            id: mediaItem.id,
            title: mediaItem.title,
            thumbUrl: previewFile ? await resolveThumbUrl(previewFile) : null,
        };
    }));
}
