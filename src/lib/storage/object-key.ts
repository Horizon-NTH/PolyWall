import sanitizeFilename from 'sanitize-filename';

function randomKeyPart(size = 16) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, size);
}

export type MediaObjectVariant = 'original' | 'thumb' | 'render';

export function buildMediaObjectKey(params: {
    organizationId: string;
    mediaItemId: string;
    originalFileName: string;
    variant?: MediaObjectVariant;
}) {
    const sanitized = sanitizeFilename(params.originalFileName)
        .replace(/\.\.+/g, '.')
        .replace(/^\.+/, '')
        .trim();
    const safe = sanitized || 'file.bin';
    const variant = params.variant ?? 'original';
    const keySuffix = `${Date.now()}-${randomKeyPart()}-${safe}`;

    return `org/${params.organizationId}/media/${params.mediaItemId}/${variant}/${keySuffix}`;
}

export function buildDerivedMediaObjectKey(params: {
    organizationId: string;
    mediaItemId: string;
    sourceMediaFileId: string;
    variant: Exclude<MediaObjectVariant, 'original'>;
    variantIndex?: number;
    extension: string;
}) {
    const extension = params.extension.replace(/^\.+/, '').toLowerCase() || 'bin';
    const index = params.variantIndex ?? 0;

    return [
        `org/${params.organizationId}/media/${params.mediaItemId}`,
        params.variant,
        `src-${params.sourceMediaFileId}`,
        `${index}.${extension}`,
    ].join('/');
}
