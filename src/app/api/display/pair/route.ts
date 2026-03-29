import { NextResponse } from 'next/server';

import { createActionLogger } from '@/actions/action-logging';
import { ScreenStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { buildPendingScreenName, hashPairingToken } from '@/lib/screens/pairing';
import { getDisplayRequestIp, guardDisplayRateLimit } from '@/lib/screens/display-route-utils';
import { screenPairingRequestSchema } from '@/schemas/screen-schema';

export async function POST(request: Request) {
    const ip = getDisplayRequestIp(request);
    const log = createActionLogger({
        event: 'display.pair',
        action: 'create',
    });

    const rateLimit = await guardDisplayRateLimit(ip, 'pair', log);
    if (!rateLimit.ok) {
        return rateLimit.response;
    }

    const json = await request.json().catch(() => null);
    const parsed = screenPairingRequestSchema.safeParse(json);
    if (!parsed.success) {
        log.invalid({reason: 'invalid_payload', ip});
        return NextResponse.json({error: 'Payload invalide.'}, {status: 400});
    }

    try {
        const now = new Date();
        const tokenHash = hashPairingToken(parsed.data.otpCode);

        const token = await prisma.screenPairingToken.findUnique({
            where: {tokenHash},
            select: {
                id: true,
                organizationId: true,
                expiresAt: true,
                invalidatedAt: true,
            },
        });

        if (!token || token.invalidatedAt) {
            log.invalid({reason: 'invalid_token', ip});
            return NextResponse.json({error: 'Code OTP invalide.'}, {status: 401});
        }

        if (token.expiresAt.getTime() <= now.getTime()) {
            log.invalid({reason: 'expired_token', ip, organizationId: token.organizationId});
            return NextResponse.json({error: 'Code OTP expiré.'}, {status: 410});
        }

        const existing = await prisma.screen.findFirst({
            where: {
                organizationId: token.organizationId,
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
        });

        const screen =
            existing ??
            await prisma.screen.create({
                data: {
                    organizationId: token.organizationId,
                    deviceId: parsed.data.deviceId,
                    name: buildPendingScreenName(parsed.data.deviceId),
                    location: 'Non renseigné',
                    status: ScreenStatus.PENDING,
                    interactive: false,
                    lastSeenAt: now,
                },
                select: {
                    id: true,
                    status: true,
                    channelId: true,
                    interactive: true,
                    interactiveUrl: true,
                    inactivityTimeoutSeconds: true,
                },
            });

        await prisma.screen.update({
            where: {id: screen.id},
            data: {lastSeenAt: now},
            select: {id: true},
        });

        if (screen.status === ScreenStatus.REVOKED) {
            log.denied({reason: 'screen_revoked', ip, organizationId: token.organizationId, targetId: screen.id});
            return NextResponse.json({error: 'Cet écran a été révoqué.'}, {status: 403});
        }

        if (screen.status === ScreenStatus.ACTIVE && screen.channelId) {
            log.success({
                ip,
                organizationId: token.organizationId,
                targetId: screen.id,
                resolvedStatus: 'ACTIVE',
                createdScreen: !existing,
            });
            return NextResponse.json({
                status: 'ACTIVE',
                screenId: screen.id,
                channelId: screen.channelId,
                interactive: screen.interactive,
                interactiveUrl: screen.interactiveUrl,
                inactivityTimeoutSeconds: screen.inactivityTimeoutSeconds,
            });
        }

        log.success({
            ip,
            organizationId: token.organizationId,
            screenId: screen.id,
            resolvedStatus: 'PENDING',
            createdScreen: !existing,
        });
        return NextResponse.json({
            status: 'PENDING',
            screenId: screen.id,
        });
    } catch (error) {
        log.error(error, {ip});
        return NextResponse.json({error: 'Erreur interne.'}, {status: 500});
    }
}
