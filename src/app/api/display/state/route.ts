import { NextResponse } from 'next/server';

import { createActionLogger } from '@/actions/action-logging';
import { ScreenStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { guardDisplayRateLimit } from '@/lib/screens/display-route-utils';
import { getDisplayStateByDeviceId } from '@/lib/screens/display-runtime-snapshot';
import { screenStateQuerySchema } from '@/schemas/screen-schema';
import { getRequestIp } from '@/lib/utils';

export async function GET(request: Request) {
    const ip = getRequestIp(request) ?? 'unknown';
    const log = createActionLogger({
        event: 'display.state',
        action: 'change',
    });

    const rateLimit = await guardDisplayRateLimit(ip, 'state', log);
    if (!rateLimit.ok) {
        return rateLimit.response;
    }

    const url = new URL(request.url);
    const parsed = screenStateQuerySchema.safeParse({
        deviceId: url.searchParams.get('deviceId') ?? '',
    });

    if (!parsed.success) {
        log.invalid({reason: 'invalid_query_params', ip});
        return NextResponse.json({error: 'Paramètres invalides.'}, {status: 400});
    }

    try {
        const screen = await getDisplayStateByDeviceId(parsed.data.deviceId);

        if (!screen) {
            log.invalid({reason: 'screen_not_found', ip, deviceId: parsed.data.deviceId});
            return NextResponse.json({error: 'Écran introuvable.'}, {status: 404});
        }

        await prisma.screen.update({
            where: {id: screen.screenId},
            data: {lastSeenAt: new Date()},
            select: {id: true},
        });

        if (screen.status === ScreenStatus.REVOKED) {
            log.denied({reason: 'screen_revoked', ip, targetId: screen.screenId});
            return NextResponse.json({status: 'REVOKED', screenId: screen.screenId}, {status: 403});
        }

        if (screen.status === ScreenStatus.ACTIVE && screen.channelId) {
            log.success({ip, targetId: screen.screenId, resolvedStatus: 'ACTIVE'});
            return NextResponse.json({
                status: 'ACTIVE',
                screenId: screen.screenId,
                channelId: screen.channelId,
                interactive: screen.interactive,
                interactiveUrl: screen.interactiveUrl,
                revision: screen.revision,
                serverNow: screen.serverNow,
            });
        }

        log.success({ip, targetId: screen.screenId, resolvedStatus: 'PENDING'});
        return NextResponse.json({
            status: 'PENDING',
            screenId: screen.screenId,
            revision: null,
            serverNow: screen.serverNow,
        });
    } catch (error) {
        log.error(error, {ip, deviceId: parsed.data.deviceId});
        return NextResponse.json({error: 'Erreur interne.'}, {status: 500});
    }
}
