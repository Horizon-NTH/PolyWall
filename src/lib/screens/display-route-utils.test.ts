import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    class MockDisplayRateLimitExceeded extends Error {
        msBeforeNext: number;

        constructor(msBeforeNext: number) {
            super('display_rate_limited');
            this.msBeforeNext = msBeforeNext;
        }
    }

    return {
        consumeDisplayApiLimit: vi.fn(),
        DisplayRateLimitExceeded: MockDisplayRateLimitExceeded,
    };
});

vi.mock('@/lib/rate-limit/display', () => ({
    consumeDisplayApiLimit: mocks.consumeDisplayApiLimit,
    DisplayRateLimitExceeded: mocks.DisplayRateLimitExceeded,
}));

describe('display route utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.consumeDisplayApiLimit.mockResolvedValue(undefined);
    });

    it('returns ok when the display limiter allows the request', async () => {
        const {guardDisplayRateLimit} = await import('@/lib/screens/display-route-utils');

        const result = await guardDisplayRateLimit('192.0.2.10', 'pair');

        expect(result).toEqual({ok: true});
        expect(mocks.consumeDisplayApiLimit).toHaveBeenCalledWith('192.0.2.10:pair');
    });

    it('returns a 429 response and logs invalid requests when rate limited', async () => {
        mocks.consumeDisplayApiLimit.mockRejectedValueOnce(new mocks.DisplayRateLimitExceeded(1000));
        const invalid = vi.fn();
        const error = vi.fn();
        const {guardDisplayRateLimit} = await import('@/lib/screens/display-route-utils');

        const result = await guardDisplayRateLimit('192.0.2.10', 'state', {invalid, error});

        expect(result.ok).toBe(false);
        if (result.ok) {
            throw new Error('Expected guardDisplayRateLimit to reject the request');
        }
        expect(result.response.status).toBe(429);
        await expect(result.response.json()).resolves.toEqual({error: 'Trop de requêtes.'});
        expect(invalid).toHaveBeenCalledWith({
            reason: 'rate_limit_exceeded',
            ip: '192.0.2.10',
            scope: 'state',
        });
        expect(error).not.toHaveBeenCalled();
    });

    it('returns a 500 response and logs unexpected limiter failures', async () => {
        const failure = new Error('boom');
        mocks.consumeDisplayApiLimit.mockRejectedValueOnce(failure);
        const invalid = vi.fn();
        const error = vi.fn();
        const {guardDisplayRateLimit} = await import('@/lib/screens/display-route-utils');

        const result = await guardDisplayRateLimit('192.0.2.10', 'pair', {invalid, error});

        expect(result.ok).toBe(false);
        if (result.ok) {
            throw new Error('Expected guardDisplayRateLimit to reject the request');
        }
        expect(result.response.status).toBe(500);
        await expect(result.response.json()).resolves.toEqual({error: 'Rate limit indisponible.'});
        expect(invalid).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith(failure, {
            reason: 'rate_limit_unavailable',
            ip: '192.0.2.10',
            scope: 'pair',
        });
    });
});
