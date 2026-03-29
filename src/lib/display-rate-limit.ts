import 'server-only';

import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';

import { env } from '@/env';
import { logger } from '@/lib/logger';

type Limiter = RateLimiterMemory | RateLimiterRedis;

class DisplayRateLimitExceeded extends Error {
    readonly msBeforeNext: number;

    constructor(msBeforeNext: number) {
        super('display_rate_limited');
        this.msBeforeNext = msBeforeNext;
    }
}

let redisClient: Redis | null = null;
let redisLimiter: Limiter | null = null;
let memoryLimiter: Limiter | null = null;

function getRedisLimiter(): Limiter | null {
    if (!env.REDIS_URL) return null;

    if (!redisClient) {
        redisClient = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            lazyConnect: true,
        });
        redisClient.on('error', (error) => {
            logger.error({error}, 'Redis connection error for display rate limiter');
        });
    }

    if (!redisLimiter) {
        redisLimiter = new RateLimiterRedis({
            storeClient: redisClient,
            points: 120,
            duration: 60,
            keyPrefix: 'rl:display',
        });
    }

    return redisLimiter;
}

function getMemoryLimiter(): Limiter {
    if (!memoryLimiter) {
        memoryLimiter = new RateLimiterMemory({
            points: 120,
            duration: 60,
        });
    }

    return memoryLimiter;
}

function isRateLimitError(error: unknown): error is RateLimiterRes {
    return error instanceof RateLimiterRes;
}

export async function consumeDisplayApiLimit(key: string) {
    if (env.RATE_LIMIT_DISABLED) return;

    const redis = getRedisLimiter();
    if (redis) {
        try {
            await redis.consume(key);
            return;
        } catch (error) {
            if (isRateLimitError(error)) {
                throw new DisplayRateLimitExceeded(error.msBeforeNext);
            }
            logger.error({error}, 'Redis display limiter failed, fallback to memory');
        }
    }

    try {
        await getMemoryLimiter().consume(key);
    } catch (error) {
        if (isRateLimitError(error)) {
            throw new DisplayRateLimitExceeded(error.msBeforeNext);
        }
        logger.error({error}, 'Memory display limiter failed');
    }
}

export { DisplayRateLimitExceeded };
