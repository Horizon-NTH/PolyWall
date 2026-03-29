import 'server-only';

import { createRateLimitService, isRateLimitError } from '@/lib/rate-limit/service';

class RateLimitExceeded extends Error {
    readonly msBeforeNext: number;

    constructor(msBeforeNext: number) {
        super('rate_limited');
        this.msBeforeNext = msBeforeNext;
    }
}

const loginRateLimitService = createRateLimitService({
    name: 'login',
    definitions: {
        loginByEmailIp: {
            points: 5,
            duration: 10 * 60,
            keyPrefix: 'rl:login:email-ip',
        },
        loginByIp: {
            points: 20,
            duration: 60 * 60,
            keyPrefix: 'rl:login:ip',
        },
    },
});

export async function consumeLoginAttempt(params: { ip: string; email: string }) {
    const ip = params.ip || 'unknown';
    const email = params.email.toLowerCase();

    try {
        await loginRateLimitService.consumeAll({
            loginByIp: ip,
            loginByEmailIp: `${email}|${ip}`,
        });
    } catch (error) {
        if (isRateLimitError(error)) {
            throw new RateLimitExceeded(error.msBeforeNext);
        }

        throw error;
    }
}

export async function resetLoginAttempt(params: { ip: string; email: string }) {
    const ip = params.ip || 'unknown';
    const email = params.email.toLowerCase();

    await loginRateLimitService.reset({
        loginByEmailIp: `${email}|${ip}`,
    });
}

export { RateLimitExceeded };
