const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
]);

export function isAllowedMediaMimeType(mimeType: string) {
    return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function inferDefaultDurationSeconds(mimeType: string) {
    if (mimeType.startsWith('video/')) return 60;
    if (mimeType === 'application/pdf') return 15;
    if (
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
        return 15;
    }

    return 10;
}
