import { MediaFileStatus, MediaFileVariant } from '@/generated/prisma/enums';
import { isPresentationMimeType } from '@/lib/media/media-constraints';

export type MediaKind = 'image' | 'video' | 'pdf' | 'presentation' | 'other';

export type MediaFileLike = {
    id: string;
    sourceMediaFileId: string | null;
    status: MediaFileStatus;
    variant: MediaFileVariant;
    variantIndex: number;
    mimeType: string;
    fileSizeBytes: bigint | number;
    storageBucket: string;
    objectKey: string;
    originalFileName: string;
    metaJson: unknown;
    createdAt: Date;
    updatedAt: Date;
};

export function getMediaKindFromMimeType(mimeType: string): MediaKind {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (isPresentationMimeType(mimeType)) {
        return 'presentation';
    }
    return 'other';
}

export function getMediaKindLabel(kind: MediaKind) {
    if (kind === 'image') return 'Image';
    if (kind === 'video') return 'Vidéo';
    if (kind === 'pdf') return 'PDF';
    if (kind === 'presentation') return 'Présentation';
    return 'Autre';
}

export function getMediaStatusLabel(status: MediaFileStatus) {
    if (status === 'AWAITING_UPLOAD') return 'En attente d\'upload';
    if (status === 'UPLOADED') return 'Uploadé';
    if (status === 'PROCESSING') return 'Traitement';
    if (status === 'READY') return 'Prêt';
    return 'En erreur';
}

export function selectPrimaryOriginalFile(files: readonly MediaFileLike[]) {
    const originals = files.filter((file) => file.variant === 'ORIGINAL');
    return originals[0] ?? null;
}

export function selectThumbFile(files: readonly MediaFileLike[], sourceMediaFileId: string | null) {
    if (!sourceMediaFileId) return null;
    return (
        files.find(
            (file) =>
                file.variant === 'THUMB' &&
                file.sourceMediaFileId === sourceMediaFileId &&
                file.variantIndex === 0 &&
                file.status === 'READY',
        ) ?? null
    );
}

export function selectRenderFiles(files: readonly MediaFileLike[], sourceMediaFileId: string | null) {
    if (!sourceMediaFileId) return [];
    return files
        .filter(
            (file) =>
                file.variant === 'RENDER' &&
                file.sourceMediaFileId === sourceMediaFileId &&
                file.status === 'READY',
        )
        .sort((left, right) => left.variantIndex - right.variantIndex);
}

export function toNumberFileSize(value: bigint | number) {
    if (typeof value === 'number') return value;
    return Number(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    return null;
}

export type MediaMetaSummary = {
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    pageCount: number | null;
    slideCount: number | null;
    codec: string | null;
    detectedMimeType: string | null;
};

export function extractMediaMetaSummary(metaJson: unknown): MediaMetaSummary {
    const meta = asRecord(metaJson);

    return {
        width: asNumber(meta.width),
        height: asNumber(meta.height),
        durationSeconds: asNumber(meta.durationSeconds),
        pageCount: asNumber(meta.pageCount),
        slideCount: asNumber(meta.slideCount),
        codec: typeof meta.codec === 'string' ? meta.codec : null,
        detectedMimeType: typeof meta.detectedMimeType === 'string' ? meta.detectedMimeType : null,
    };
}
