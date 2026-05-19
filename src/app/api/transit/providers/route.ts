import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createActionLogger } from '@/actions/action-logging';
import { auth } from '@/auth';
import { searchTransitProviders } from '@/lib/transit/transit-index';

const transitProvidersQuerySchema = z.object({
    q: z.string().trim().max(120).default(''),
});

export async function GET(request: Request) {
    const log = createActionLogger({
        event: 'transit.providers.search',
        action: 'change',
    });
    const session = await auth();
    if (!session?.user) {
        log.denied({reason: 'not_authenticated'});
        return NextResponse.json({error: 'Authentification requise.'}, {status: 401});
    }

    const url = new URL(request.url);
    const parsed = transitProvidersQuerySchema.safeParse({
        q: url.searchParams.get('q') ?? '',
    });

    if (!parsed.success) {
        log.invalid({
            reason: 'invalid_query_params',
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
        });
        return NextResponse.json({error: 'Paramètres invalides.'}, {status: 400});
    }

    try {
        const providers = await searchTransitProviders(parsed.data.q);
        log.success({
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
            query: parsed.data.q,
            resultCount: providers.length,
        });
        return NextResponse.json({providers});
    } catch (error) {
        log.error(error, {
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
            query: parsed.data.q,
        });
        return NextResponse.json({error: 'Impossible de charger les réseaux transport.'}, {status: 502});
    }
}
