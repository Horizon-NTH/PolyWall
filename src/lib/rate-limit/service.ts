import 'server-only';

import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';

import { env } from '@/env';
import { logger } from '@/lib/logger';

type LimiterStore = RateLimiterMemory | RateLimiterRedis;

type LimiterDefinition = {
    duration: number;
    keyPrefix: string;
    points: number;
};

type LimiterDefinitions<TName extends string> = Record<TName, LimiterDefinition>;
type LimiterInstances<TName extends string> = Record<TName, LimiterStore>;
type LimiterKeys<TName extends string> = Record<TName, string>;

let redisClient: Redis | null = null;
let hasRedisErrorListener = false;

function getRedisClient() {
    if (!env.REDIS_URL) {
        return null;
    }

    if (!redisClient) {
        redisClient = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            lazyConnect: true,
        });
    }

    if (!hasRedisErrorListener) {
        hasRedisErrorListener = true;
        redisClient.on('error', (error) => {
            logger.error({error}, 'Redis connection error for rate limiters');
        });
    }

    return redisClient;
}

function buildLimiters<TName extends string>(
    definitions: LimiterDefinitions<TName>,
    factory: (definition: LimiterDefinition) => LimiterStore,
) {
    return Object.fromEntries(
        Object.entries(definitions).map(([name, definition]) => [name, factory(definition as LimiterDefinition)]),
    ) as LimiterInstances<TName>;
}

export function isRateLimitError(error: unknown): error is RateLimiterRes {
    return error instanceof RateLimiterRes;
}

export function createRateLimitService<TName extends string>(options: {
    definitions: LimiterDefinitions<TName>;
    name: string;
}) {
    let redisLimiters: LimiterInstances<TName> | null = null;
    let memoryLimiters: LimiterInstances<TName> | null = null;

    function getRedisLimiters() {
        const client = getRedisClient();
        if (!client) {
            return null;
        }

        if (!redisLimiters) {
            redisLimiters = buildLimiters(options.definitions, (definition) => {
                return new RateLimiterRedis({
                    storeClient: client,
                    points: definition.points,
                    duration: definition.duration,
                    keyPrefix: definition.keyPrefix,
                });
            });
        }

        return redisLimiters;
    }

    function getMemoryLimiters() {
        if (!memoryLimiters) {
            memoryLimiters = buildLimiters(options.definitions, (definition) => {
                return new RateLimiterMemory({
                    points: definition.points,
                    duration: definition.duration,
                });
            });
        }

        return memoryLimiters;
    }

    async function consumeAll(keys: LimiterKeys<TName>) {
        if (env.RATE_LIMIT_DISABLED) {
            return;
        }

        const redis = getRedisLimiters();
        if (redis) {
            try {
                for (const [name, key] of Object.entries(keys) as Array<[TName, string]>) {
                    await redis[name].consume(key);
                }
                return;
            } catch (error) {
                if (isRateLimitError(error)) {
                    throw error;
                }

                logger.error({error, rateLimiter: options.name}, 'Redis rate limiter failed, falling back to memory');
            }
        }

        try {
            const memory = getMemoryLimiters();
            for (const [name, key] of Object.entries(keys) as Array<[TName, string]>) {
                await memory[name].consume(key);
            }
        } catch (error) {
            if (isRateLimitError(error)) {
                throw error;
            }

            logger.error({error, rateLimiter: options.name}, 'Memory rate limiter failed');
        }
    }

    async function reset(keys: Partial<LimiterKeys<TName>>) {
        if (env.RATE_LIMIT_DISABLED) {
            return;
        }

        const redis = getRedisLimiters();
        const memory = getMemoryLimiters();

        for (const [name, key] of Object.entries(keys) as Array<[TName, string | undefined]>) {
            if (!key) {
                continue;
            }

            try {
                if (redis) {
                    await redis[name].delete(key);
                }
            } catch (error) {
                logger.error({error, rateLimiter: options.name, limiter: name}, 'Failed to reset Redis limiter');
            }

            try {
                await memory[name].delete(key);
            } catch (error) {
                logger.error({error, rateLimiter: options.name, limiter: name}, 'Failed to reset memory limiter');
            }
        }
    }

    return {
        consumeAll,
        reset,
    };
}
