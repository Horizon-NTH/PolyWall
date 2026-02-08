import path from 'path';

const ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'application/pdf': '.pdf',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
};

export function isAllowedMediaMimeType(mimeType: string) {
    return mimeType.toLowerCase() in ALLOWED_MIME_TYPES;
}

export function resolveSourceExtension(mimeType: string, originalFileName?: string): string {
    const mapped = ALLOWED_MIME_TYPES[mimeType];
    if (mapped) {
        return mapped;
    }

    const originalExt = originalFileName ? path.extname(originalFileName).toLowerCase() : null;
    if (originalExt) {
        return originalExt;
    }
    return '';
}

export function isPresentationMimeType(mimeType: string) {
    return (
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
}

export function inferDefaultDurationSeconds(mimeType: string) {
    if (mimeType.startsWith('video/')) return 60;
    if (mimeType === 'application/pdf') return 15;
    if (isPresentationMimeType(mimeType)) {
        return 15;
    }

    return 10;
}