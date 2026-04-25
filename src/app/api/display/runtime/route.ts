import { NextResponse } from 'next/server';

import { createActionLogger } from '@/actions/action-logging';
import { ScreenStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { guardDisplayRateLimit } from '@/lib/screens/display-route-utils';
import { getDisplayRuntimeSnapshotByDeviceId } from '@/lib/screens/display-runtime-snapshot';
import { screenStateQuerySchema } from '@/schemas/screen-schema';
import { getRequestIp } from '@/lib/utils';

export async function GET(request: Request) {
    const ip = getRequestIp(request) ?? 'unknown';
    const log = createActionLogger({
        event: 'display.runtime',
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
        const runtime = await getDisplayRuntimeSnapshotByDeviceId(parsed.data.deviceId);

        if (runtime.screenStatus === null) {
            log.invalid({reason: 'screen_not_found', ip, deviceId: parsed.data.deviceId});
            return NextResponse.json({error: 'Écran introuvable.'}, {status: 404});
        }

        if (runtime.snapshot) {
            await prisma.screen.update({
                where: {id: runtime.snapshot.screen.screenId},
                data: {lastSeenAt: new Date()},
                select: {id: true},
            });
            log.success({
                ip,
                targetId: runtime.snapshot.screen.screenId,
                channelId: runtime.snapshot.screen.channelId,
                revision: runtime.snapshot.revision,
            });
            return NextResponse.json(runtime.snapshot);
        }

        if (runtime.screenStatus === ScreenStatus.REVOKED) {
            log.denied({reason: 'screen_revoked', ip, deviceId: parsed.data.deviceId});
            return NextResponse.json({error: 'Cet écran est révoqué.'}, {status: 403});
        }

        return NextResponse.json({error: 'L’écran n’est pas prêt pour la diffusion.'}, {status: 409});
    } catch (error) {
        log.error(error, {ip, deviceId: parsed.data.deviceId});
        return NextResponse.json({error: 'Erreur interne.'}, {status: 500});
    }
}
