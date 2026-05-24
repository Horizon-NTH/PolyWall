'use client';

import * as React from 'react';
import Image from 'next/image';
import { Droplets, Wind } from 'lucide-react';

import clearDayIcon from '@meteocons/svg/flat/clear-day.svg';
import clearNightIcon from '@meteocons/svg/flat/clear-night.svg';
import cloudyIcon from '@meteocons/svg/flat/cloudy.svg';
import drizzleIcon from '@meteocons/svg/flat/drizzle.svg';
import fogIcon from '@meteocons/svg/flat/fog.svg';
import partlyCloudyDayIcon from '@meteocons/svg/flat/partly-cloudy-day.svg';
import partlyCloudyNightIcon from '@meteocons/svg/flat/partly-cloudy-night.svg';
import rainIcon from '@meteocons/svg/flat/rain.svg';
import snowIcon from '@meteocons/svg/flat/snow.svg';
import thunderstormsIcon from '@meteocons/svg/flat/thunderstorms.svg';

import { WidgetPlaceholder } from '@/components/screens/display-widget-placeholder';
import { getDisplayWidgetColorScheme } from '@/components/screens/display-widget-theme';
import { type DisplayWidgetProps } from '@/components/screens/display-widget-types';
import { parseWeatherWidgetConfig } from '@/lib/weather/weather-config';
import { type WeatherIconKey } from '@/lib/weather/weather-codes';
import { type WeatherDailyForecast, type WeatherResult } from '@/lib/weather/weather-types';
import { cn } from '@/lib/utils';

const WEATHER_ICON_BY_KEY = {
    'clear-day': clearDayIcon,
    'clear-night': clearNightIcon,
    'partly-cloudy-day': partlyCloudyDayIcon,
    'partly-cloudy-night': partlyCloudyNightIcon,
    cloudy: cloudyIcon,
    fog: fogIcon,
    drizzle: drizzleIcon,
    rain: rainIcon,
    snow: snowIcon,
    thunderstorms: thunderstormsIcon,
} satisfies Record<WeatherIconKey, string | { src: string }>;

function formatForecastDay(date: string) {
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;

    return new Intl.DateTimeFormat('fr-FR', {weekday: 'short'}).format(parsed);
}

function WeatherIcon({
                         icon,
                         label,
                         className,
                     }: {
    icon: WeatherIconKey;
    label: string;
    className?: string;
}) {
    return (
        <Image
            src={WEATHER_ICON_BY_KEY[icon]}
            alt={label}
            width={96}
            height={96}
            unoptimized
            className={cn('shrink-0 object-contain drop-shadow-sm', className)}
        />
    );
}

function ForecastDay({
                         day,
                         textClassName,
                         mutedTextClassName,
                     }: {
    day: WeatherDailyForecast;
    textClassName: string;
    mutedTextClassName: string;
}) {
    return (
        <div className="flex min-w-0 flex-1 basis-16 flex-col items-center gap-[clamp(.12rem,.4cqw,.4rem)] text-center">
            <p className={cn(
                'text-[clamp(.55rem,.85cqw,.8rem)] font-medium uppercase',
                mutedTextClassName,
            )}>
                {formatForecastDay(day.date)}
            </p>
            <WeatherIcon
                icon={day.icon}
                label={day.label}
                className="size-[clamp(1.15rem,min(3cqw,5cqh),3rem)]"
            />
            <p className={cn(
                'text-[clamp(.65rem,1cqw,.95rem)] font-semibold leading-none',
                textClassName,
            )}>
                {day.maxTemperature}°
            </p>
            <p className={cn(
                'text-[clamp(.55rem,.85cqw,.8rem)] leading-none',
                mutedTextClassName,
            )}>
                {day.minTemperature}°
            </p>
        </div>
    );
}

function WeatherMetric({
                           icon: Icon,
                           label,
                           value,
                           textClassName,
                           mutedTextClassName,
                       }: {
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    value: string;
    textClassName: string;
    mutedTextClassName: string;
}) {
    return (
        <div
            className={cn(
                'flex min-w-0 items-center gap-[clamp(.25rem,.55cqw,.5rem)] text-[clamp(.65rem,1cqw,.95rem)]',
                textClassName,
            )}
            aria-label={`${label}: ${value}`}
        >
            <Icon
                aria-hidden
                className={cn(
                    'size-[clamp(.85rem,1.25cqw,1.15rem)] shrink-0',
                    mutedTextClassName,
                )}
            />
            <span className="min-w-0 truncate font-semibold">{value}</span>
        </div>
    );
}

export function WeatherWidget({widget, deviceId, zoneConfiguration}: DisplayWidgetProps) {
    const [data, setData] = React.useState<WeatherResult | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const refreshMs = Math.max(widget.refreshPeriodSeconds, 300) * 1000;
    const config = parseWeatherWidgetConfig(widget.configurationJson);
    const colorScheme = getDisplayWidgetColorScheme(zoneConfiguration);

    const loadWeather = React.useCallback(async (signal: AbortSignal) => {
        if (!deviceId || !config.city) return;

        try {
            const response = await fetch(
                `/api/display/widgets/weather?deviceId=${encodeURIComponent(deviceId)}&widgetId=${encodeURIComponent(widget.id)}`,
                {cache: 'no-store', signal},
            );

            if (!response.ok) throw new Error('Weather widget request failed');

            const result = await response.json() as WeatherResult;
            if (signal.aborted) return;

            setData(result);
            setError(null);
        } catch {
            if (signal.aborted) return;
            setError('Météo indisponible.');
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, [config.city, deviceId, widget.id]);

    React.useEffect(() => {
        if (!deviceId || !config.city) return;

        let isInitialLoad = true;
        let abortController = new AbortController();
        const refresh = () => {
            abortController.abort();
            abortController = new AbortController();

            if (isInitialLoad) {
                setData(null);
                setError(null);
                setLoading(true);
                isInitialLoad = false;
            }

            void loadWeather(abortController.signal);
        };
        const timeout = window.setTimeout(refresh, 0);
        const interval = window.setInterval(refresh, refreshMs);

        return () => {
            abortController.abort();
            window.clearTimeout(timeout);
            window.clearInterval(interval);
        };
    }, [config.city, deviceId, loadWeather, refreshMs]);

    if (!deviceId) {
        return (
            <WidgetPlaceholder
                label="Météo"
                detail="Données disponibles uniquement sur un écran appairé."
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (!config.city) {
        return (
            <WidgetPlaceholder
                label="Météo"
                detail="Ville à configurer."
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (loading) {
        return (
            <WidgetPlaceholder
                label="Météo"
                detail="Chargement des prévisions"
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (error || !data) {
        return (
            <WidgetPlaceholder
                label="Météo"
                detail={error ?? 'Météo indisponible.'}
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    const showForecast = config.displayMode === 'forecast' && data.daily.length > 0;
    const showDetails = config.displayMode === 'current';

    return (
        <div className="flex h-full w-full overflow-hidden p-[clamp(.5rem,1.4cqw,1.35rem)] @container-[size]">
            <div className={cn(
                'flex min-h-0 flex-1 flex-wrap items-center justify-center overflow-hidden',
                showForecast
                    ? 'gap-x-[clamp(.7rem,2cqw,1.8rem)] gap-y-[clamp(.45rem,1.4cqh,1rem)]'
                    : 'gap-[clamp(.55rem,1.4cqw,1.3rem)]',
            )}>
                <div className={cn(
                    'flex max-w-full min-w-0 items-center justify-center gap-[clamp(.45rem,1.2cqw,1.2rem)]',
                    showForecast || showDetails ? 'flex-1 basis-44' : 'max-w-full',
                )}>
                    <WeatherIcon
                        icon={data.current.icon}
                        label={data.current.label}
                        className="size-[clamp(1.8rem,min(7cqw,16cqh),5.4rem)]"
                    />
                    <div className="min-w-0">
                        <div
                            className="flex max-w-full flex-wrap items-baseline gap-x-[clamp(.35rem,.7cqw,.65rem)] gap-y-[clamp(.08rem,.25cqh,.2rem)]">
                            <p className={cn(
                                'text-[clamp(1.45rem,min(5.2cqw,13cqh),5rem)] font-semibold leading-none',
                                colorScheme.textClassName,
                            )}>
                                {data.current.temperature}°
                            </p>
                            {showDetails ? (
                                <p className={cn(
                                    'text-[clamp(.58rem,.9cqw,.9rem)] leading-none',
                                    colorScheme.mutedTextClassName,
                                )}>
                                    ressenti {data.current.apparentTemperature}°
                                </p>
                            ) : null}
                        </div>
                        <p className={cn(
                            'mt-[clamp(.15rem,.4cqh,.35rem)] truncate text-[clamp(.75rem,1.35cqw,1.2rem)] font-medium',
                            colorScheme.textClassName,
                        )}>
                            {data.locationName}
                        </p>
                        <p className={cn(
                            'truncate text-[clamp(.6rem,.95cqw,.9rem)]',
                            colorScheme.mutedTextClassName,
                        )}>
                            {data.current.label}
                        </p>
                    </div>
                </div>

                {showDetails ? (
                    <div
                        className="flex max-w-full flex-wrap items-center justify-center gap-x-[clamp(.7rem,1.6cqw,1.45rem)] gap-y-[clamp(.3rem,.8cqh,.7rem)]">
                        <WeatherMetric
                            icon={Droplets}
                            label="Humidité"
                            value={`${data.current.humidity}%`}
                            textClassName={colorScheme.textClassName}
                            mutedTextClassName={colorScheme.mutedTextClassName}
                        />
                        <WeatherMetric
                            icon={Wind}
                            label="Vent"
                            value={`${data.current.windSpeed} km/h`}
                            textClassName={colorScheme.textClassName}
                            mutedTextClassName={colorScheme.mutedTextClassName}
                        />
                    </div>
                ) : null}

                {showForecast ? (
                    <div
                        className="flex min-w-0 flex-1 basis-64 items-center justify-center gap-[clamp(.35rem,.9cqw,.85rem)] overflow-hidden">
                        {data.daily.slice(0, config.forecastDays).map((day) => (
                            <ForecastDay
                                key={day.date}
                                day={day}
                                textClassName={colorScheme.textClassName}
                                mutedTextClassName={colorScheme.mutedTextClassName}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
