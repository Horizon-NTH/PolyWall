import { type MediaFileStatus, type MediaFileVariant } from '@/generated/prisma/enums';
import { extractMediaMetaSummary, getMediaKindFromMimeType } from '@/lib/media/media-view-model';

export type DisplayRuntimeMediaFileLike = {
    id: string;
    status: MediaFileStatus;
    variant: MediaFileVariant;
    variantIndex: number;
    sourceMediaFileId: string | null;
    mimeType: string;
    metaJson: unknown;
};

export type DisplayRuntimeSequencePlanItem<FileType extends DisplayRuntimeMediaFileLike = DisplayRuntimeMediaFileLike> = {
    id: string;
    playlistItemId: string;
    mediaItemId: string;
    mediaTitle: string;
    mediaKind: ReturnType<typeof getMediaKindFromMimeType>;
    durationSeconds: number;
    orderIndex: number;
    frameIndex: number;
    file: FileType;
    width: number | null;
    height: number | null;
};

function selectPrimaryOriginalFile<FileType extends DisplayRuntimeMediaFileLike>(files: FileType[]) {
    return files.find((file) => file.variant === 'ORIGINAL') ?? null;
}

function selectRenderFiles<FileType extends DisplayRuntimeMediaFileLike>(files: FileType[], sourceMediaFileId: string | null) {
    if (!sourceMediaFileId) return [];

    return files
        .filter(
            (file) =>
                file.variant === 'RENDER' &&
                file.sourceMediaFileId === sourceMediaFileId,
        )
        .sort((left, right) => left.variantIndex - right.variantIndex);
}

export function buildDisplaySequencePlan<FileType extends DisplayRuntimeMediaFileLike>(
    playlistItems: Array<{
        id: string;
        orderIndex: number;
        mediaItem: {
            id: string;
            title: string;
            active: boolean;
            durationSeconds: number;
            files: FileType[];
        };
    }>,
): DisplayRuntimeSequencePlanItem<FileType>[] {
    const sequenceItems: DisplayRuntimeSequencePlanItem<FileType>[] = [];

    for (const playlistItem of playlistItems) {
        const readyFiles = playlistItem.mediaItem.files.filter((file) => file.status === 'READY');
        const originalFile = selectPrimaryOriginalFile(readyFiles);
        if (!playlistItem.mediaItem.active || !originalFile) {
            continue;
        }

        const originalMeta = extractMediaMetaSummary(originalFile.metaJson);
        const mediaKind = getMediaKindFromMimeType(originalFile.mimeType);

        if (mediaKind === 'image' || mediaKind === 'video') {
            sequenceItems.push({
                id: `${playlistItem.id}:0`,
                playlistItemId: playlistItem.id,
                mediaItemId: playlistItem.mediaItem.id,
                mediaTitle: playlistItem.mediaItem.title,
                mediaKind,
                durationSeconds: mediaKind === 'video'
                    ? Math.max(1, Math.round(originalMeta.durationSeconds ?? playlistItem.mediaItem.durationSeconds))
                    : Math.max(1, playlistItem.mediaItem.durationSeconds),
                orderIndex: playlistItem.orderIndex,
                frameIndex: 0,
                file: originalFile as FileType,
                width: originalMeta.width,
                height: originalMeta.height,
            });
            continue;
        }

        const renderFiles = selectRenderFiles(readyFiles, originalFile.id) as FileType[];
        for (const renderFile of renderFiles) {
            sequenceItems.push({
                id: `${playlistItem.id}:${renderFile.variantIndex}`,
                playlistItemId: playlistItem.id,
                mediaItemId: playlistItem.mediaItem.id,
                mediaTitle: playlistItem.mediaItem.title,
                mediaKind,
                durationSeconds: Math.max(1, playlistItem.mediaItem.durationSeconds),
                orderIndex: playlistItem.orderIndex,
                frameIndex: renderFile.variantIndex,
                file: renderFile,
                width: originalMeta.width,
                height: originalMeta.height,
            });
        }
    }

    return sequenceItems;
}

export function getDisplaySequenceDurationSeconds(sequenceItems: Array<{ durationSeconds: number }>) {
    return sequenceItems.reduce((total, item) => total + item.durationSeconds, 0);
}
