import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    consumeAll: vi.fn(),
    reset: vi.fn(),
    isRateLimitError: vi.fn(),
}));

vi.mock('@/lib/rate-limit/service', () => ({
    createRateLimitService: vi.fn(() => ({
        consumeAll: mocks.consumeAll,
        reset: mocks.reset,
    })),
    isRateLimitError: mocks.isRateLimitError,
}));

const loadRateLimiter = async () => {
    return await import('@/lib/rate-limit/login');
};

describe('rate limiter', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mocks.consumeAll.mockResolvedValue(undefined);
        mocks.reset.mockResolvedValue(undefined);
        mocks.isRateLimitError.mockReturnValue(false);
    });

    it('builds login limiter keys from normalized params', async () => {
        const {consumeLoginAttempt, resetLoginAttempt} = await loadRateLimiter();

        await consumeLoginAttempt({ip: '', email: 'User@Example.com'});
        await resetLoginAttempt({ip: '', email: 'User@Example.com'});

        expect(mocks.consumeAll).toHaveBeenCalledWith({
            loginByIp: 'unknown',
            loginByEmailIp: 'user@example.com|unknown',
        });
        expect(mocks.reset).toHaveBeenCalledWith({
            loginByEmailIp: 'user@example.com|unknown',
        });
    });

    it('translates shared rate-limit errors to RateLimitExceeded', async () => {
        const error = {msBeforeNext: 1234};
        mocks.consumeAll.mockRejectedValue(error);
        mocks.isRateLimitError.mockReturnValue(true);

        const {consumeLoginAttempt, RateLimitExceeded} = await loadRateLimiter();

        const promise = consumeLoginAttempt({ip: '192.0.2.10', email: 'user@example.com'});

        await expect(promise).rejects.toEqual(expect.objectContaining({
            msBeforeNext: 1234,
        }));
        await expect(promise).rejects.toBeInstanceOf(RateLimitExceeded);
    });
});
