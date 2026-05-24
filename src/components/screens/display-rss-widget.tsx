'use client';

import * as React from 'react';

import { WidgetPlaceholder } from '@/components/screens/display-widget-placeholder';
import { getDisplayWidgetColorScheme } from '@/components/screens/display-widget-theme';
import { type DisplayWidgetProps } from '@/components/screens/display-widget-types';
import { parseRssWidgetConfig } from '@/lib/rss/rss-config';
import { type RssFeedItem, type RssFeedResult } from '@/lib/rss/rss-types';
import { cn } from '@/lib/utils';

function formatRssDate(value: string | null) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function RssItem({
                     item,
                     colorScheme,
                 }: {
    item: RssFeedItem;
    colorScheme: ReturnType<typeof getDisplayWidgetColorScheme>;
}) {
    const formattedDate = formatRssDate(item.date);

    return (
        <article className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-[clamp(.35rem,.7cqw,.7rem)]">
                <h3 className={cn(
                    'min-w-0 truncate text-[clamp(.75rem,1.25cqw,1.15rem)] font-semibold leading-tight',
                    colorScheme.textClassName,
                )}>
                    {item.title}
                </h3>
                {formattedDate ? (
                    <time className={cn(
                        'shrink-0 text-[clamp(.55rem,.8cqw,.8rem)]',
                        colorScheme.mutedTextClassName,
                    )}>
                        {formattedDate}
                    </time>
                ) : null}
            </div>
            {item.summary ? (
                <p className={cn(
                    'mt-[clamp(.15rem,.35cqh,.3rem)] line-clamp-2 text-[clamp(.6rem,.9cqw,.9rem)] leading-snug',
                    colorScheme.mutedTextClassName,
                )}>
                    {item.summary}
                </p>
            ) : null}
        </article>
    );
}

export function RssWidget({widget, deviceId, zoneConfiguration}: DisplayWidgetProps) {
    const [data, setData] = React.useState<RssFeedResult | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const refreshMs = Math.max(widget.refreshPeriodSeconds, 60) * 1000;
    const config = parseRssWidgetConfig(widget.configurationJson);
    const colorScheme = getDisplayWidgetColorScheme(zoneConfiguration);

    const loadFeed = React.useCallback(async (signal: AbortSignal) => {
        if (!deviceId || !config.source) return;

        try {
            const response = await fetch(
                `/api/display/widgets/rss?deviceId=${encodeURIComponent(deviceId)}&widgetId=${encodeURIComponent(widget.id)}`,
                {cache: 'no-store', signal},
            );

            if (!response.ok) throw new Error('RSS widget request failed');

            const result = await response.json() as RssFeedResult;
            if (signal.aborted) return;

            setData(result);
            setError(null);
        } catch {
            if (signal.aborted) return;
            setError('Flux RSS indisponible.');
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, [config.source, deviceId, widget.id]);

    React.useEffect(() => {
        if (!deviceId || !config.source) {
            return;
        }

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

            void loadFeed(abortController.signal);
        };
        const timeout = window.setTimeout(refresh, 0);
        const interval = window.setInterval(refresh, refreshMs);

        return () => {
            abortController.abort();
            window.clearTimeout(timeout);
            window.clearInterval(interval);
        };
    }, [config.source, deviceId, loadFeed, refreshMs]);

    if (!deviceId) {
        return (
            <WidgetPlaceholder
                label="Flux RSS"
                detail="Données disponibles uniquement sur un écran appairé."
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (!config.source) {
        return (
            <WidgetPlaceholder
                label="Flux RSS"
                detail="URL du flux à configurer."
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (loading) {
        return (
            <WidgetPlaceholder
                label="Flux RSS"
                detail="Chargement des actualités"
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    if (error || !data) {
        return (
            <WidgetPlaceholder
                label="Flux RSS"
                detail={error ?? 'Flux RSS indisponible.'}
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden p-[clamp(.7rem,1.5cqw,1.4rem)] @container-[size]">
            {data.items.length > 0 ? (
                <div
                    className="flex min-h-0 flex-1 flex-col justify-center gap-[clamp(.35rem,.85cqh,.85rem)] overflow-hidden">
                    {data.items.map((item) => (
                        <RssItem
                            key={`${item.link ?? item.title}-${item.date ?? ''}`}
                            item={item}
                            colorScheme={colorScheme}
                        />
                    ))}
                </div>
            ) : (
                <div className={cn(
                    'flex h-full flex-1 items-center justify-center text-center text-[clamp(.75rem,1.25cqw,1.1rem)]',
                    colorScheme.mutedTextClassName,
                )}>
                    Aucun élément dans le flux.
                </div>
            )}
        </div>
    );
}
