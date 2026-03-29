import 'server-only';

import { createRateLimitService, isRateLimitError } from '@/lib/rate-limit/service';

class DisplayRateLimitExceeded extends Error {
    readonly msBeforeNext: number;

    constructor(msBeforeNext: number) {
        super('display_rate_limited');
        this.msBeforeNext = msBeforeNext;
    }
}

const displayRateLimitService = createRateLimitService({
    name: 'display',
    definitions: {
        api: {
            points: 120,
            duration: 60,
            keyPrefix: 'rl:display',
        },
    },
});

export async function consumeDisplayApiLimit(key: string) {
    try {
        await displayRateLimitService.consumeAll({api: key});
    } catch (error) {
        if (isRateLimitError(error)) {
            throw new DisplayRateLimitExceeded(error.msBeforeNext);
        }

        throw error;
    }
}

export { DisplayRateLimitExceeded };
