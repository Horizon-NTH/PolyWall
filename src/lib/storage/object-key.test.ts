import { describe, expect, it } from 'vitest';
import { buildDerivedMediaObjectKey, buildMediaObjectKey } from '@/lib/storage/object-key';

describe('buildMediaObjectKey', () => {
    it('builds a key scoped by organization and media item', () => {
        const key = buildMediaObjectKey({
            organizationId: 'org-1',
            mediaItemId: 'media-1',
            originalFileName: 'image promo.png',
        });

        expect(key.startsWith('org/org-1/media/media-1/original/')).toBe(true);
        expect(key.includes('image promo.png')).toBe(true);
    });

    it('sanitizes dangerous file names', () => {
        const key = buildMediaObjectKey({
            organizationId: 'org-1',
            mediaItemId: 'media-1',
            originalFileName: '../../secret.txt',
        });

        expect(key.includes('secret.txt')).toBe(true);
        expect(key.includes('..')).toBe(false);
    });
});

describe('buildDerivedMediaObjectKey', () => {
    it('builds a deterministic key for variants', () => {
        const key = buildDerivedMediaObjectKey({
            organizationId: 'org-1',
            mediaItemId: 'media-1',
            sourceMediaFileId: 'source-1',
            variant: 'thumb',
            extension: 'webp',
        });

        expect(key).toBe('org/org-1/media/media-1/thumb/src-source-1/0.webp');
    });

    it('uses variant index for page or slide renders', () => {
        const key = buildDerivedMediaObjectKey({
            organizationId: 'org-1',
            mediaItemId: 'media-1',
            sourceMediaFileId: 'source-1',
            variant: 'render',
            variantIndex: 3,
            extension: '.jpg',
        });

        expect(key).toBe('org/org-1/media/media-1/render/src-source-1/3.jpg');
    });
});
