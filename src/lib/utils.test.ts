import { describe, expect, it } from 'vitest';

import { formatDate } from '@/lib/utils';

describe('utils', () => {
    it('formats dates with the application timezone', () => {
        expect(formatDate(new Date('2026-05-23T22:30:00.000Z'))).toBe('24 mai 2026');
    });
});
