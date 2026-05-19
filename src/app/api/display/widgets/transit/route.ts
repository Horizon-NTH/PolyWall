import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createActionLogger } from '@/actions/action-logging';
import { ScreenStatus } from '@/generated/prisma/enums';
import { asConfigurationRecord } from '@/lib/config/json-config';
import { prisma } from '@/lib/prisma';
import { guardDisplayRateLimit } from '@/lib/screens/display-route-utils';
import { parseTransitWidgetConfig } from '@/lib/transit/transit-config';
import { getTransitDepartures } from '@/lib/transit/gtfs-service';
import { getRequestIp } from '@/lib/utils';

const transitWidgetQuerySchema = z.object({
    deviceId: z.string().trim().min(1),
    widgetId: z.string().trim().min(1),
});

async function findTransitWidgetForDevice(deviceId: string, widgetId: string) {
    return prisma.screen.findFirst({
        where: {deviceId},
        select: {
            id: true,
            status: true,
            channel: {
                select: {
                    displayTemplate: {
                        select: {
                            zones: {
                                where: {
                                    widgetInstance: {
                                        id: widgetId,
                                        active: true,
                                        widgetType: {
                                            technicalKey: 'transit',
                                        },
                                    },
                                },
                                select: {
                                    widgetInstance: {
                                        select: {
                                            id: true,
                                            configurationJson: true,
                                        },
                                    },
                                },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });
}

export async function GET(request: Request) {
    const ip = getRequestIp(request) ?? 'unknown';
    const log = createActionLogger({
        event: 'display.widget.transit',
        action: 'change',
    });

    const rateLimit = await guardDisplayRateLimit(ip, 'state', log);
    if (!rateLimit.ok) {
        return rateLimit.response;
    }

    const url = new URL(request.url);
    const parsed = transitWidgetQuerySchema.safeParse({
        deviceId: url.searchParams.get('deviceId') ?? '',
        widgetId: url.searchParams.get('widgetId') ?? '',
    });

    if (!parsed.success) {
        log.invalid({reason: 'invalid_query_params', ip});
        return NextResponse.json({error: 'Paramètres invalides.'}, {status: 400});
    }

    try {
        const screen = await findTransitWidgetForDevice(parsed.data.deviceId, parsed.data.widgetId);

        if (!screen) {
            log.invalid({reason: 'screen_not_found', ip, deviceId: parsed.data.deviceId});
            return NextResponse.json({error: 'Écran introuvable.'}, {status: 404});
        }

        if (screen.status !== ScreenStatus.ACTIVE) {
            log.denied({reason: 'screen_not_active', ip, targetId: screen.id});
            return NextResponse.json({error: 'Écran non actif.'}, {status: 403});
        }

        const widget = screen.channel?.displayTemplate.zones[0]?.widgetInstance;
        if (!widget) {
            log.denied({reason: 'widget_not_found', ip, targetId: screen.id});
            return NextResponse.json({error: 'Widget introuvable.'}, {status: 404});
        }

        const result = await getTransitDepartures(parseTransitWidgetConfig(asConfigurationRecord(widget.configurationJson)));
        log.success({ip, targetId: screen.id, widgetId: widget.id});
        return NextResponse.json(result);
    } catch (error) {
        log.error(error, {ip, deviceId: parsed.data.deviceId, widgetId: parsed.data.widgetId});
        return NextResponse.json({error: 'Impossible de récupérer les horaires de transport.'}, {status: 500});
    }
}
