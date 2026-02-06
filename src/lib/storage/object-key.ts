import sanitizeFilename from 'sanitize-filename';

function randomKeyPart(size = 16) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, size);
}

export function buildMediaObjectKey(params: {
    organizationId: string;
    mediaItemId: string;
    originalFileName: string;
    variant?: 'original' | 'thumb' | 'poster' | 'webp' | 'derived';
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
