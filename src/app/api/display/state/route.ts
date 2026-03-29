import { NextResponse } from 'next/server';

import { createActionLogger } from '@/actions/action-logging';
import { ScreenStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { guardDisplayRateLimit } from '@/lib/screens/display-route-utils';
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
        const screen = await prisma.screen.findFirst({
            where: {
                deviceId: parsed.data.deviceId,
            },
            select: {
                id: true,
                status: true,
                channelId: true,
                interactive: true,
                interactiveUrl: true,
                inactivityTimeoutSeconds: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        if (!screen) {
            log.invalid({reason: 'screen_not_found', ip, deviceId: parsed.data.deviceId});
            return NextResponse.json({error: 'Écran introuvable.'}, {status: 404});
        }

        await prisma.screen.update({
            where: {id: screen.id},
            data: {lastSeenAt: new Date()},
            select: {id: true},
        });

        if (screen.status === ScreenStatus.REVOKED) {
            log.denied({reason: 'screen_revoked', ip, targetId: screen.id});
            return NextResponse.json({status: 'REVOKED', screenId: screen.id}, {status: 403});
        }

        if (screen.status === ScreenStatus.ACTIVE && screen.channelId) {
            log.success({ip, targetId: screen.id, resolvedStatus: 'ACTIVE'});
            return NextResponse.json({
                status: 'ACTIVE',
                screenId: screen.id,
                channelId: screen.channelId,
                interactive: screen.interactive,
                interactiveUrl: screen.interactiveUrl,
                inactivityTimeoutSeconds: screen.inactivityTimeoutSeconds,
            });
        }

        log.success({ip, targetId: screen.id, resolvedStatus: 'PENDING'});
        return NextResponse.json({
            status: 'PENDING',
            screenId: screen.id,
        });
    } catch (error) {
        log.error(error, {ip, deviceId: parsed.data.deviceId});
        return NextResponse.json({error: 'Erreur interne.'}, {status: 500});
    }
}
