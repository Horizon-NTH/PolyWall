import { describe, expect, it } from 'vitest';

import { computeServerOffsetMs } from '@/lib/screens/display-clock';

describe('display-clock', () => {
    it('computes the server offset using the midpoint of the request', () => {
        const offset = computeServerOffsetMs('2026-05-02T10:00:10.000Z', 1000, 3000);

        expect(offset).toBe(Date.parse('2026-05-02T10:00:10.000Z') - 2000);
    });

    it('returns null for an invalid server date', () => {
        expect(computeServerOffsetMs('not-a-date', 1000, 2000)).toBeNull();
    });
});
