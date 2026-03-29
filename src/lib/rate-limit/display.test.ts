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

const loadDisplayRateLimiter = async () => {
    return await import('@/lib/rate-limit/display');
};

describe('display rate limiter', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mocks.consumeAll.mockResolvedValue(undefined);
        mocks.isRateLimitError.mockReturnValue(false);
    });

    it('passes the display key through to the shared service', async () => {
        const {consumeDisplayApiLimit} = await loadDisplayRateLimiter();

        await consumeDisplayApiLimit('192.0.2.10:pair');

        expect(mocks.consumeAll).toHaveBeenCalledWith({api: '192.0.2.10:pair'});
    });

    it('translates shared rate-limit errors to DisplayRateLimitExceeded', async () => {
        const error = {msBeforeNext: 4321};
        mocks.consumeAll.mockRejectedValue(error);
        mocks.isRateLimitError.mockReturnValue(true);

        const {consumeDisplayApiLimit, DisplayRateLimitExceeded} = await loadDisplayRateLimiter();

        const promise = consumeDisplayApiLimit('192.0.2.10:state');

        await expect(promise).rejects.toEqual(
            expect.objectContaining({msBeforeNext: 4321}),
        );
        await expect(promise).rejects.toBeInstanceOf(
            DisplayRateLimitExceeded,
        );
    });
});
