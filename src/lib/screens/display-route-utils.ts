import { NextResponse } from 'next/server';

import { consumeDisplayApiLimit, DisplayRateLimitExceeded } from '@/lib/display-rate-limit';

type DisplayRouteLogger = {
    invalid?: (extra?: Record<string, unknown>) => void;
    error?: (error: unknown, extra?: Record<string, unknown>) => void;
};

export function getDisplayRequestIp(request: Request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }

    return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function guardDisplayRateLimit(
    ip: string,
    scope: 'pair' | 'state',
    log?: DisplayRouteLogger,
) {
    try {
        await consumeDisplayApiLimit(`${ip}:${scope}`);
        return {ok: true as const};
    } catch (error) {
        if (error instanceof DisplayRateLimitExceeded) {
            log?.invalid?.({reason: 'rate_limit_exceeded', ip, scope});
            return {
                ok: false as const,
                response: NextResponse.json({error: 'Trop de requêtes.'}, {status: 429}),
            };
        }

        log?.error?.(error, {reason: 'rate_limit_unavailable', ip, scope});
        return {
            ok: false as const,
            response: NextResponse.json({error: 'Rate limit indisponible.'}, {status: 500}),
        };
    }
}
