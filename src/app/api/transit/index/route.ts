import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createActionLogger } from '@/actions/action-logging';
import { auth } from '@/auth';
import { getTransitProviderIndex } from '@/lib/transit/transit-index';

const transitIndexQuerySchema = z.object({
    providerId: z.string().trim().min(1).max(200),
});

export async function GET(request: Request) {
    const log = createActionLogger({
        event: 'transit.provider.index',
        action: 'change',
    });
    const session = await auth();
    if (!session?.user) {
        log.denied({reason: 'not_authenticated'});
        return NextResponse.json({error: 'Authentification requise.'}, {status: 401});
    }

    const url = new URL(request.url);
    const parsed = transitIndexQuerySchema.safeParse({
        providerId: url.searchParams.get('providerId') ?? '',
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
        const index = await getTransitProviderIndex(parsed.data);
        log.success({
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
            providerId: parsed.data.providerId,
            stopCount: index.stops.length,
            routeCount: index.routes.length,
            destinationCount: index.destinations.length,
        });
        return NextResponse.json(index);
    } catch (error) {
        log.error(error, {
            actorUserId: session.user.id,
            organizationId: session.user.organizationId,
            providerId: parsed.data.providerId,
        });
        return NextResponse.json({error: 'Impossible de charger l’index transport.'}, {status: 502});
    }
}
