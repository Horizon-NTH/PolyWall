import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createActionLogger } from '@/actions/action-logging';
import { ScreenStatus } from '@/generated/prisma/enums';
import { asConfigurationRecord } from '@/lib/config/json-config';
import { guardDisplayRateLimit } from '@/lib/screens/display-route-utils';
import { findDisplayWidgetForDevice } from '@/lib/screens/display-widget-route-utils';
import { getRequestIp } from '@/lib/utils';
import { isValidWeatherCity, parseWeatherWidgetConfig } from '@/lib/weather/weather-config';
import { getWeather } from '@/lib/weather/weather-service';

const weatherWidgetQuerySchema = z.object({
    deviceId: z.string().trim().min(1),
    widgetId: z.string().trim().min(1),
});

export async function GET(request: Request) {
    const ip = getRequestIp(request) ?? 'unknown';
    const log = createActionLogger({
        event: 'display.widget.weather',
        action: 'change',
    });

    const rateLimit = await guardDisplayRateLimit(ip, 'state', log);
    if (!rateLimit.ok) {
        return rateLimit.response;
    }

    const url = new URL(request.url);
    const parsed = weatherWidgetQuerySchema.safeParse({
        deviceId: url.searchParams.get('deviceId') ?? '',
        widgetId: url.searchParams.get('widgetId') ?? '',
    });

    if (!parsed.success) {
        log.invalid({reason: 'invalid_query_params', ip});
        return NextResponse.json({error: 'Paramètres invalides.'}, {status: 400});
    }

    try {
        const screen = await findDisplayWidgetForDevice(parsed.data.deviceId, parsed.data.widgetId, 'weather');

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

        const config = parseWeatherWidgetConfig(asConfigurationRecord(widget.configurationJson));
        if (!isValidWeatherCity(config.city)) {
            log.denied({reason: 'invalid_weather_city', ip, targetId: screen.id});
            return NextResponse.json({error: 'Ville météo invalide.'}, {status: 400});
        }

        const result = await getWeather(config);
        log.success({ip, targetId: screen.id, widgetId: widget.id});
        return NextResponse.json(result);
    } catch (error) {
        log.error(error, {ip, deviceId: parsed.data.deviceId, widgetId: parsed.data.widgetId});
        return NextResponse.json({error: 'Impossible de récupérer la météo.'}, {status: 500});
    }
}
