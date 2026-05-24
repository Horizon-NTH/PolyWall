'use client';

import * as React from 'react';

import { type DisplayWidgetProps } from '@/components/screens/display-widget-types';
import { WidgetPlaceholder } from '@/components/screens/display-widget-placeholder';
import {
    getDisplayWidgetColorScheme,
    type DisplayWidgetColorScheme,
} from '@/components/screens/display-widget-theme';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { parseTransitWidgetConfig } from '@/lib/transit/transit-config';
import { type TransitDeparture, type TransitDeparturesResult } from '@/lib/transit/transit-types';
import { cn } from '@/lib/utils';

function getMinutesUntil(departureTime: string) {
    const diffMinutes = Math.round((Date.parse(departureTime) - Date.now()) / 60000);
    if (!Number.isFinite(diffMinutes)) return null;
    return Math.max(diffMinutes, 0);
}

function formatDepartureDelay(departure: TransitDeparture) {
    const minutes = getMinutesUntil(departure.departureTime);
    if (minutes === null) return 'N/D';
    if (minutes <= 0) return 'À quai';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}

function getTransitModeLabel(routeType: number, shortName: string) {
    if (/^[A-Za-z]+/.test(shortName)) return shortName.match(/^[A-Za-z]+/)?.[0].toUpperCase() ?? 'L';

    switch (routeType) {
        case 0:
            return 'T';
        case 1:
            return 'M';
        case 2:
            return 'R';
        case 3:
            return 'B';
        case 4:
        case 7:
            return 'F';
        default:
            return 'L';
    }
}

function TransitLineBadge({departure}: { departure: TransitDeparture }) {
    const shortName = departure.line.shortName || departure.line.longName || 'Ligne';
    const modeLabel = getTransitModeLabel(departure.line.type, shortName);
    const numericLabel = shortName.replace(/^[A-Za-z]+/, '') || shortName;

    return (
        <span className="flex shrink-0 items-center overflow-hidden rounded-md bg-white/90 p-1 shadow-sm">
            <span
                className="rounded-sm px-[clamp(.35rem,.8cqw,.65rem)] py-[clamp(.15rem,.35cqw,.3rem)] text-[clamp(.7rem,1.25cqw,1.15rem)] font-bold leading-none"
                style={{backgroundColor: departure.line.color, color: departure.line.textColor}}
            >
                {modeLabel} {numericLabel}
            </span>
        </span>
    );
}

function getTransitGroupKey(departure: TransitDeparture) {
    return `${departure.stopId}:${departure.line.routeId}:${departure.destination}`;
}

function groupTransitDepartures(departures: TransitDeparture[]) {
    const groups: Array<{ departure: TransitDeparture; departures: TransitDeparture[] }> = [];
    const groupByKey = new Map<string, { departure: TransitDeparture; departures: TransitDeparture[] }>();

    for (const departure of departures) {
        const key = getTransitGroupKey(departure);
        const group = groupByKey.get(key);
        if (group) {
            group.departures.push(departure);
            continue;
        }

        const nextGroup = {departure, departures: [departure]};
        groupByKey.set(key, nextGroup);
        groups.push(nextGroup);
    }

    return groups;
}

function DepartureTimeBadge({
                                departure,
                                colorScheme,
                            }: {
    departure: TransitDeparture;
    colorScheme: DisplayWidgetColorScheme;
}) {
    return (
        <Badge
            variant={departure.realtime ? 'default' : 'secondary'}
            className={cn(
                'rounded-full text-[clamp(.6rem,.9cqw,.9rem)]',
                colorScheme.timeBadgeClassName,
            )}
        >
            {formatDepartureDelay(departure)}
        </Badge>
    );
}

function TransitDepartureGroup({
                                   departure,
                                   departures,
                                   layoutDirection,
                                   colorScheme,
                               }: {
    departure: TransitDeparture;
    departures: TransitDeparture[];
    layoutDirection: 'row' | 'column';
    colorScheme: DisplayWidgetColorScheme;
}) {
    return (
        <div className={cn(
            'flex min-w-0 flex-col items-center justify-center gap-[clamp(.3rem,.55cqw,.55rem)] px-[clamp(.35rem,.8cqw,.75rem)]',
            layoutDirection === 'row' ? 'h-full flex-1 basis-0' : 'w-full',
        )}>
            <div className="flex max-w-full min-w-0 flex-col items-start gap-[clamp(.3rem,.55cqw,.55rem)]">
                <div className="flex max-w-full min-w-0 items-center gap-[clamp(.45rem,.85cqw,.8rem)]">
                    <TransitLineBadge departure={departure} />
                    <div className="min-w-0">
                        <p className={cn(
                            'truncate text-[clamp(.75rem,1.25cqw,1.15rem)] font-semibold leading-tight',
                            colorScheme.textClassName,
                        )}>
                            {departure.destination}
                        </p>
                        <p className={cn(
                            'truncate text-[clamp(.55rem,.8cqw,.8rem)]',
                            colorScheme.mutedTextClassName,
                        )}>
                            {departure.stopName}
                        </p>
                    </div>
                </div>
                <div className="flex max-w-full flex-wrap justify-start gap-[clamp(.25rem,.45cqw,.45rem)]">
                    {departures.map((item) => (
                        <DepartureTimeBadge
                            key={`${item.stopId}-${item.line.routeId}-${item.departureTime}`}
                            departure={item}
                            colorScheme={colorScheme}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TransitWidget({widget, deviceId, zoneConfiguration}: DisplayWidgetProps) {
    const [data, setData] = React.useState<TransitDeparturesResult | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const refreshMs = Math.max(widget.refreshPeriodSeconds, 15) * 1000;
    const {layoutDirection} = parseTransitWidgetConfig(widget.configurationJson);
    const colorScheme = getDisplayWidgetColorScheme(zoneConfiguration);

    const loadDepartures = React.useCallback(async (signal: AbortSignal) => {
        if (!deviceId) return;

        try {
            const response = await fetch(
                `/api/display/widgets/transit?deviceId=${encodeURIComponent(deviceId)}&widgetId=${encodeURIComponent(widget.id)}`,
                {cache: 'no-store', signal},
            );

            if (!response.ok) {
                throw new Error('Transit widget request failed');
            }

            const result = await response.json() as TransitDeparturesResult;
            if (signal.aborted) return;

            setData(result);
            setError(null);
        } catch {
            if (signal.aborted) return;
            setError('Horaires indisponibles.');
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, [deviceId, widget.id]);

    React.useEffect(() => {
        if (!deviceId) return;

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

            void loadDepartures(abortController.signal);
        };
        const timeout = window.setTimeout(refresh, 0);
        const interval = window.setInterval(refresh, refreshMs);

        return () => {
            abortController.abort();
            window.clearTimeout(timeout);
            window.clearInterval(interval);
        };
    }, [deviceId, loadDepartures, refreshMs]);

    if (!deviceId) {
        return (
            <WidgetPlaceholder
                label="Transports"
                detail="Données disponibles uniquement sur un écran appairé."
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (loading) {
        return (
            <WidgetPlaceholder
                label="Transports"
                detail="Chargement des prochains passages"
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (error || !data) {
        return (
            <WidgetPlaceholder
                label="Transports"
                detail={error ?? 'Horaires indisponibles.'}
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    return (
        <div
            className="flex h-full w-full overflow-hidden p-[clamp(.55rem,1.4cqw,1.25rem)] text-white @container-[size]">
            <div className="min-h-0 flex-1 overflow-hidden">
                {data.departures.length > 0 ? (
                    <div className={cn(
                        'flex h-full',
                        layoutDirection === 'row'
                            ? 'items-center overflow-hidden'
                            : 'flex-col justify-center gap-[clamp(.35rem,.8cqh,.75rem)]',
                    )}>
                        {groupTransitDepartures(data.departures).map((group, index) => (
                            <React.Fragment key={getTransitGroupKey(group.departure)}>
                                {index > 0 ? (
                                    <Separator
                                        orientation={layoutDirection === 'row' ? 'vertical' : 'horizontal'}
                                        className={cn(
                                            colorScheme.separatorClassName,
                                            'max-h-[60%]',
                                        )}
                                    />
                                ) : null}
                                <TransitDepartureGroup
                                    departure={group.departure}
                                    departures={group.departures}
                                    layoutDirection={layoutDirection}
                                    colorScheme={colorScheme}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    <div className={cn(
                        'flex h-full items-center justify-center px-[clamp(.5rem,1cqw,1rem)] text-center text-[clamp(.75rem,1.25cqw,1.1rem)]',
                        colorScheme.mutedTextClassName,
                    )}>
                        Aucun passage imminent.
                    </div>
                )}
            </div>
        </div>
    );
}
