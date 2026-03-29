import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    class MockRateLimiterRes extends Error {
        msBeforeNext: number;

        constructor(msBeforeNext: number) {
            super('rate_limited');
            this.msBeforeNext = msBeforeNext;
        }
    }

    return {
        env: {
            REDIS_URL: undefined as string | undefined,
            RATE_LIMIT_DISABLED: false,
        },
        logger: {
            error: vi.fn(),
        },
        redisInstances: [] as Array<{ on: ReturnType<typeof vi.fn> }>,
        redisConsumeFailures: [] as unknown[],
        redisDeleteFailures: [] as unknown[],
        memoryConsumeFailures: [] as unknown[],
        memoryDeleteFailures: [] as unknown[],
        memoryConsumedKeys: [] as string[],
        memoryDeletedKeys: [] as string[],
        redisConsumedKeys: [] as string[],
        redisDeletedKeys: [] as string[],
        MockRateLimiterRes,
    };
});

vi.mock('@/env', () => ({
    env: mocks.env,
}));

vi.mock('@/lib/logger', () => ({
    logger: mocks.logger,
}));

vi.mock('ioredis', () => {
    class MockRedis {
        on = vi.fn();

        constructor() {
            mocks.redisInstances.push(this);
        }
    }

    return {
        default: MockRedis,
    };
});

vi.mock('rate-limiter-flexible', () => ({
    RateLimiterRes: mocks.MockRateLimiterRes,
    RateLimiterMemory: class MockRateLimiterMemory {
        async consume(key: string) {
            const error = mocks.memoryConsumeFailures.shift();
            if (error) {
                throw error;
            }

            mocks.memoryConsumedKeys.push(key);
        }

        async delete(key: string) {
            const error = mocks.memoryDeleteFailures.shift();
            if (error) {
                throw error;
            }

            mocks.memoryDeletedKeys.push(key);
        }
    },
    RateLimiterRedis: class MockRateLimiterRedis {
        async consume(key: string) {
            const error = mocks.redisConsumeFailures.shift();
            if (error) {
                throw error;
            }

            mocks.redisConsumedKeys.push(key);
        }

        async delete(key: string) {
            const error = mocks.redisDeleteFailures.shift();
            if (error) {
                throw error;
            }

            mocks.redisDeletedKeys.push(key);
        }
    },
}));

const loadRateLimitService = async () => {
    return await import('@/lib/rate-limit/service');
};

describe('rate-limit service', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mocks.env.REDIS_URL = undefined;
        mocks.env.RATE_LIMIT_DISABLED = false;
        mocks.redisInstances.length = 0;
        mocks.redisConsumeFailures.length = 0;
        mocks.redisDeleteFailures.length = 0;
        mocks.memoryConsumeFailures.length = 0;
        mocks.memoryDeleteFailures.length = 0;
        mocks.memoryConsumedKeys.length = 0;
        mocks.memoryDeletedKeys.length = 0;
        mocks.redisConsumedKeys.length = 0;
        mocks.redisDeletedKeys.length = 0;
    });

    it('uses memory limiters when Redis is not configured', async () => {
        const {createRateLimitService} = await loadRateLimitService();
        const service = createRateLimitService({
            name: 'test',
            definitions: {
                byIp: {points: 2, duration: 60, keyPrefix: 'rl:test:ip'},
                byUser: {points: 1, duration: 60, keyPrefix: 'rl:test:user'},
            },
        });

        await service.consumeAll({
            byIp: '192.0.2.10',
            byUser: 'user@example.com',
        });
        await service.reset({
            byUser: 'user@example.com',
        });

        expect(mocks.memoryConsumedKeys).toEqual(['192.0.2.10', 'user@example.com']);
        expect(mocks.memoryDeletedKeys).toEqual(['user@example.com']);
    });

    it('falls back to memory when Redis fails with a non-rate-limit error', async () => {
        mocks.env.REDIS_URL = 'redis://localhost:6379';
        mocks.redisConsumeFailures.push(new Error('redis down'));

        const {createRateLimitService} = await loadRateLimitService();
        const service = createRateLimitService({
            name: 'test',
            definitions: {
                byIp: {points: 2, duration: 60, keyPrefix: 'rl:test:ip'},
            },
        });

        await service.consumeAll({byIp: '192.0.2.10'});

        expect(mocks.redisConsumedKeys).toEqual([]);
        expect(mocks.memoryConsumedKeys).toEqual(['192.0.2.10']);
        expect(mocks.logger.error).toHaveBeenCalledWith(
            expect.objectContaining({rateLimiter: 'test'}),
            'Redis rate limiter failed, falling back to memory',
        );
    });

    it('rethrows rate-limit errors from Redis without falling back', async () => {
        mocks.env.REDIS_URL = 'redis://localhost:6379';
        const rateLimitError = new mocks.MockRateLimiterRes(2500);
        mocks.redisConsumeFailures.push(rateLimitError);

        const {createRateLimitService} = await loadRateLimitService();
        const service = createRateLimitService({
            name: 'test',
            definitions: {
                byIp: {points: 2, duration: 60, keyPrefix: 'rl:test:ip'},
            },
        });

        await expect(service.consumeAll({byIp: '192.0.2.10'})).rejects.toBe(rateLimitError);
        expect(mocks.memoryConsumedKeys).toEqual([]);
    });

    it('logs reset failures for both Redis and memory stores', async () => {
        mocks.env.REDIS_URL = 'redis://localhost:6379';
        mocks.redisDeleteFailures.push(new Error('redis delete failed'));
        mocks.memoryDeleteFailures.push(new Error('memory delete failed'));

        const {createRateLimitService} = await loadRateLimitService();
        const service = createRateLimitService({
            name: 'test',
            definitions: {
                byIp: {points: 2, duration: 60, keyPrefix: 'rl:test:ip'},
            },
        });

        await service.reset({byIp: '192.0.2.10'});

        expect(mocks.logger.error).toHaveBeenCalledWith(
            expect.objectContaining({rateLimiter: 'test', limiter: 'byIp'}),
            'Failed to reset Redis limiter',
        );
        expect(mocks.logger.error).toHaveBeenCalledWith(
            expect.objectContaining({rateLimiter: 'test', limiter: 'byIp'}),
            'Failed to reset memory limiter',
        );
    });

    it('does nothing when rate limiting is disabled', async () => {
        mocks.env.RATE_LIMIT_DISABLED = true;

        const {createRateLimitService} = await loadRateLimitService();
        const service = createRateLimitService({
            name: 'test',
            definitions: {
                byIp: {points: 2, duration: 60, keyPrefix: 'rl:test:ip'},
            },
        });

        await service.consumeAll({byIp: '192.0.2.10'});
        await service.reset({byIp: '192.0.2.10'});

        expect(mocks.redisInstances).toHaveLength(0);
        expect(mocks.memoryConsumedKeys).toEqual([]);
        expect(mocks.memoryDeletedKeys).toEqual([]);
    });
});
