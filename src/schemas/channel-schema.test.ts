import { describe, expect, it } from 'vitest';

import {
    channelCreateSchema,
    channelListFilterSchema,
    channelUpdateSchema,
} from '@/schemas/channel-schema';

describe('channelCreateSchema', () => {
    it('accepts valid payload', () => {
        const parsed = channelCreateSchema.safeParse({
            name: 'Hall principal',
            description: 'Canal principal',
            displayTemplateId: 'template-1',
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects invalid payload', () => {
        const parsed = channelCreateSchema.safeParse({
            name: '',
            description: '',
            displayTemplateId: '',
        });

        expect(parsed.success).toBe(false);
    });
});

describe('channelUpdateSchema', () => {
    it('rejects too long name', () => {
        const parsed = channelUpdateSchema.safeParse({
            name: 'a'.repeat(121),
            description: 'Description valide',
            displayTemplateId: 'template-1',
        });

        expect(parsed.success).toBe(false);
    });
});

describe('channelListFilterSchema', () => {
    it('applies defaults', () => {
        const parsed = channelListFilterSchema.parse({});

        expect(parsed).toEqual({
            q: '',
            screens: 'all',
            schedules: 'all',
            sort: 'updatedAt-desc',
        });
    });

    it('rejects unsupported sort values', () => {
        const parsed = channelListFilterSchema.safeParse({sort: 'invalid-sort'});
        expect(parsed.success).toBe(false);
    });
});
