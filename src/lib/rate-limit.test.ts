import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env', () => ({
    env: {
        REDIS_URL: undefined,
        RATE_LIMIT_DISABLED: false,
    },
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));

const loadRateLimiter = async () => {
    return await import('@/lib/rate-limit');
};

describe('rate limiter', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('limits 5 attempts per email and ip', async () => {
        const {consumeLoginAttempt, RateLimitExceeded} = await loadRateLimiter();
        const params = {ip: '192.0.2.10', email: 'user@example.com'};

        for (let i = 0; i < 5; i += 1) {
            await consumeLoginAttempt(params);
        }

        await expect(consumeLoginAttempt(params)).rejects.toBeInstanceOf(RateLimitExceeded);
    });

    it('limits 20 attempts per ip across emails', async () => {
        const {consumeLoginAttempt, RateLimitExceeded} = await loadRateLimiter();
        const ip = '192.0.2.20';

        for (let i = 0; i < 20; i += 1) {
            await consumeLoginAttempt({ip, email: `user${i}@example.com`});
        }

        await expect(
            consumeLoginAttempt({ip, email: 'overflow@example.com'}),
        ).rejects.toBeInstanceOf(RateLimitExceeded);
    });

    it('resets email+ip limiter on success', async () => {
        const {consumeLoginAttempt, resetLoginAttempt} = await loadRateLimiter();
        const params = {ip: '192.0.2.30', email: 'reset@example.com'};

        for (let i = 0; i < 5; i += 1) {
            await consumeLoginAttempt(params);
        }

        await resetLoginAttempt(params);

        await expect(consumeLoginAttempt(params)).resolves.toBeUndefined();
    });
});
