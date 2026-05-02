import { NextResponse } from 'next/server';

import { createActionLogger } from '@/actions/action-logging';
import { auth } from '@/auth';
import { defineAbilityFor } from '@/lib/casl/ability';
import { getDisplayRuntimeSnapshotByChannelId } from '@/lib/screens/display-runtime-snapshot';
import { getRequestIp } from '@/lib/utils';

type Params = {
    params: Promise<{
        channelId: string;
    }>;
};

export async function GET(request: Request, {params}: Params) {
    const ip = getRequestIp(request) ?? 'unknown';
    const session = await auth();
    if (!session?.user) {
        createActionLogger({
            event: 'channel.display_preview',
            action: 'change',
        }).denied({reason: 'unauthenticated', ip});
        return NextResponse.json({error: 'Authentification requise.'}, {status: 401});
    }

    const log = createActionLogger({
        event: 'channel.display_preview',
        action: 'change',
        organizationId: session.user.organizationId,
        actorUserId: session.user.id,
    });

    const ability = defineAbilityFor(session.user);
    if (!ability.can('read', 'Channel')) {
        log.denied({reason: 'forbidden', ip});
        return NextResponse.json({error: 'Accès refusé.'}, {status: 403});
    }

    try {
        const {channelId} = await params;
        const snapshot = await getDisplayRuntimeSnapshotByChannelId(channelId, session.user.organizationId);

        if (!snapshot) {
            log.invalid({reason: 'channel_not_found', ip, targetId: channelId});
            return NextResponse.json({error: 'Canal introuvable.'}, {status: 404});
        }

        log.success({
            ip,
            targetId: channelId,
            revision: snapshot.revision,
        });
        return NextResponse.json({snapshot});
    } catch (error) {
        log.error(error, {ip});
        return NextResponse.json({error: 'Erreur interne.'}, {status: 500});
    }
}
