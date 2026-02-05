import 'server-only';

import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';

import { env } from '@/env';
import { logger } from '@/lib/logger';

type Limiters = {
    loginByEmailIp: RateLimiterMemory | RateLimiterRedis;
    loginByIp: RateLimiterMemory | RateLimiterRedis;
};

class RateLimitExceeded extends Error {
    readonly msBeforeNext: number;

    constructor(msBeforeNext: number) {
        super('rate_limited');
        this.msBeforeNext = msBeforeNext;
    }
}

let redisClient: Redis | null = null;
let redisLimiters: Limiters | null = null;
let memoryLimiters: Limiters | null = null;

function createMemoryLimiters(): Limiters {
    return {
        loginByEmailIp: new RateLimiterMemory({
            points: 5,
            duration: 10 * 60,
        }),
        loginByIp: new RateLimiterMemory({
            points: 20,
            duration: 60 * 60,
        }),
    };
}

function createRedisLimiters(): Limiters | null {
    if (!env.REDIS_URL) return null;

    if (!redisClient) {
        redisClient = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            lazyConnect: true,
        });
        redisClient.on('error', (error) => {
            logger.error({error}, 'Redis connection error for rate limiter');
        });
    }

    return {
        loginByEmailIp: new RateLimiterRedis({
            storeClient: redisClient,
            points: 5,
            duration: 10 * 60,
            keyPrefix: 'rl:login:email-ip',
        }),
        loginByIp: new RateLimiterRedis({
            storeClient: redisClient,
            points: 20,
            duration: 60 * 60,
            keyPrefix: 'rl:login:ip',
        }),
    };
}

function getRedisLimiters(): Limiters | null {
    if (!redisLimiters) {
        redisLimiters = createRedisLimiters();
    }
    return redisLimiters;
}

function getMemoryLimiters(): Limiters {
    if (!memoryLimiters) {
        memoryLimiters = createMemoryLimiters();
    }
    return memoryLimiters;
}

function isRateLimitError(error: unknown): error is RateLimiterRes {
    return error instanceof RateLimiterRes;
}

async function consumeWith(limiters: Limiters, ip: string, email: string) {
    await limiters.loginByIp.consume(ip);
    await limiters.loginByEmailIp.consume(`${email}|${ip}`);
}

export async function consumeLoginAttempt(params: { ip: string; email: string }) {
    if (env.RATE_LIMIT_DISABLED) return;

    const ip = params.ip || 'unknown';
    const email = params.email.toLowerCase();

    const redis = getRedisLimiters();
    if (redis) {
        try {
            await consumeWith(redis, ip, email);
            return;
        } catch (error) {
            if (isRateLimitError(error)) {
                throw new RateLimitExceeded(error.msBeforeNext);
            }

            logger.error({error}, 'Redis rate limiter failed, falling back to memory');
        }
    }

    const memory = getMemoryLimiters();
    try {
        await consumeWith(memory, ip, email);
    } catch (error) {
        if (isRateLimitError(error)) {
            throw new RateLimitExceeded(error.msBeforeNext);
        }
        logger.error({error}, 'Memory rate limiter failed');
    }
}

export async function resetLoginAttempt(params: { ip: string; email: string }) {
    if (env.RATE_LIMIT_DISABLED) return;

    const ip = params.ip || 'unknown';
    const email = params.email.toLowerCase();
    const key = `${email}|${ip}`;

    const redis = getRedisLimiters();
    const memory = getMemoryLimiters();

    try {
        if (redis) {
            await redis.loginByEmailIp.delete(key);
        }
    } catch (error) {
        logger.error({error}, 'Failed to reset Redis login limiter');
    }

    try {
        await memory.loginByEmailIp.delete(key);
    } catch (error) {
        logger.error({error}, 'Failed to reset memory login limiter');
    }
}

export { RateLimitExceeded };
