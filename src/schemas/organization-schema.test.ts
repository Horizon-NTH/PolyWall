import { describe, expect, it } from 'vitest';

import { organizationSchema } from '@/schemas/organization-schema';

describe('organizationSchema', () => {
    it('rejects short values', () => {
        const result = organizationSchema.safeParse({
            name: 'A',
            description: 'B',
        });
        expect(result.success).toBe(false);
    });

    it('accepts valid values', () => {
        const result = organizationSchema.safeParse({
            name: 'Organisation Exemple',
            description: 'Description claire.',
        });
        expect(result.success).toBe(true);
    });

    it('rejects overly long values', () => {
        const result = organizationSchema.safeParse({
            name: 'A'.repeat(121),
            description: 'B'.repeat(501),
        });
        expect(result.success).toBe(false);
    });
});
