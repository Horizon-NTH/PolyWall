import { describe, expect, it } from 'vitest';
import { buildMediaObjectKey } from '@/lib/storage/object-key';

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
