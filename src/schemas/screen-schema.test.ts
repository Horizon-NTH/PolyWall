import { describe, expect, it } from 'vitest';

import {
    screenApproveSchema,
    screenListFilterSchema,
    screenPairingRequestSchema,
    screenStateQuerySchema,
} from '@/schemas/screen-schema';

describe('screenApproveSchema', () => {
    it('accepts valid payload', () => {
        const parsed = screenApproveSchema.safeParse({
            name: 'Hall A',
            location: 'Entrée',
            channelId: 'channel-1',
            interactive: true,
            interactiveUrl: 'https://example.com/interactive',
        });

        expect(parsed.success).toBe(true);
    });

    it('rejects interactive URL when interactive is false', () => {
        const parsed = screenApproveSchema.safeParse({
            name: 'Hall A',
            location: 'Entrée',
            channelId: 'channel-1',
            interactive: false,
            interactiveUrl: 'https://example.com/interactive',
        });

        expect(parsed.success).toBe(false);
    });
});

describe('screenListFilterSchema', () => {
    it('applies defaults', () => {
        const parsed = screenListFilterSchema.parse({});

        expect(parsed).toEqual({
            q: '',
            status: 'all',
            interactive: 'all',
            sort: 'updatedAt-desc',
        });
    });
});

describe('screenPairingRequestSchema', () => {
    it('requires OTP code and UUID device id', () => {
        const parsed = screenPairingRequestSchema.safeParse({
            otpCode: 'abc',
            deviceId: 'invalid',
        });

        expect(parsed.success).toBe(false);
    });
});

describe('screenStateQuerySchema', () => {
    it('accepts valid UUID', () => {
        const parsed = screenStateQuerySchema.safeParse({
            deviceId: '550e8400-e29b-41d4-a716-446655440000',
        });

        expect(parsed.success).toBe(true);
    });
});
