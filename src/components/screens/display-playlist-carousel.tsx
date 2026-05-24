'use client';

import * as React from 'react';

import {
    Carousel,
    type CarouselApi,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
import {
    buildRenderedCarouselItems,
    getTargetRenderedIndex,
    isCarouselWindowIndex,
    shouldRepeatCarouselItems,
    SHORT_PLAYLIST_REPEAT_COUNT,
} from '@/components/screens/display-playlist-carousel-model';
import { DisplaySequenceMedia } from '@/components/screens/display-sequence-media';
import { type TemplateRendererProps } from '@/components/screens/display-template-shell';
import { getNumberConfig } from '@/lib/config/json-config';
import { type DisplaySequenceItem } from '@/lib/display-runtime/types';
import { cn } from '@/lib/utils';

const PLAYLIST_CAROUSEL_TRANSITION_MS = 1000;
const EMPTY_SEQUENCE_ITEMS: DisplaySequenceItem[] = [];

type DisplayPlaylistCarouselProps = TemplateRendererProps & {
    configurationJson?: Record<string, unknown>;
};

function getBoundedConfig(
    configurationJson: Record<string, unknown> | undefined,
    key: string,
    fallback: number,
    min: number,
    max: number,
) {
    const value = getNumberConfig(configurationJson ?? {}, key, fallback);
    return Math.min(max, Math.max(min, value));
}

export function DisplayPlaylistCarousel(props: DisplayPlaylistCarouselProps) {
    const [api, setApi] = React.useState<CarouselApi>();
    const [visualRenderedIndex, setVisualRenderedIndex] = React.useState<number | null>(null);
    const [scaledRenderedIndex, setScaledRenderedIndex] = React.useState<number | null>(null);
    const previousOriginalIndexRef = React.useRef<number | null>(null);
    const previousRenderedIndexRef = React.useRef<number | null>(null);
    const growTimerRef = React.useRef<number | null>(null);
    const shrinkTimerRef = React.useRef<number | null>(null);
    const playlist = props.resolvedState.status === 'PLAYING' ? props.resolvedState.playlist : null;
    const currentItem = props.resolvedState.status === 'PLAYING' ? props.resolvedState.currentItem : null;
    const currentItemId = currentItem?.id ?? null;
    const nextTransitionAt = props.resolvedState.status === 'PLAYING' ? props.resolvedState.nextTransitionAt : null;
    const items = playlist?.items ?? EMPTY_SEQUENCE_ITEMS;
    const activeIndex = currentItem ? items.findIndex((item) => item.id === currentItem.id) : -1;
    const shouldRepeatItems = shouldRepeatCarouselItems(items.length);
    const mediaBorderRadius = getBoundedConfig(props.configurationJson, 'carouselMediaBorderRadius', 8, 0, 256);
    const itemGap = getBoundedConfig(props.configurationJson, 'carouselItemGap', 32, 0, 256);
    const sideDimOpacity = getBoundedConfig(props.configurationJson, 'carouselSideDimOpacity', 0.42, 0, 0.9);
    const renderedItems = React.useMemo(
        () => buildRenderedCarouselItems(items, shouldRepeatItems ? SHORT_PLAYLIST_REPEAT_COUNT : 1),
        [items, shouldRepeatItems],
    );
    const setFocusedRenderedIndex = React.useCallback((renderedIndex: number) => {
        setVisualRenderedIndex(renderedIndex);
        setScaledRenderedIndex(renderedIndex);
        previousRenderedIndexRef.current = renderedIndex;
    }, []);
    const visualOriginalIndex = visualRenderedIndex !== null
        ? renderedItems[visualRenderedIndex]?.originalIndex ?? activeIndex
        : activeIndex;

    React.useEffect(() => () => {
        if (growTimerRef.current) window.clearTimeout(growTimerRef.current);
        if (shrinkTimerRef.current) window.clearTimeout(shrinkTimerRef.current);
    }, []);

    React.useEffect(() => {
        if (!api || !currentItemId || activeIndex < 0) return;

        if (growTimerRef.current) window.clearTimeout(growTimerRef.current);

        const previousOriginalIndex = previousOriginalIndexRef.current;
        const previousRenderedIndex = previousRenderedIndexRef.current;
        const renderedIndex = getTargetRenderedIndex({
            originalIndex: activeIndex,
            previousOriginalIndex,
            previousRenderedIndex,
            renderedItems,
            sourceItemsCount: items.length,
        });

        if (previousOriginalIndex === null) {
            api.scrollTo(renderedIndex, true);
            window.queueMicrotask(() => setFocusedRenderedIndex(renderedIndex));
        } else {
            window.queueMicrotask(() => setScaledRenderedIndex(null));
            api.scrollTo(renderedIndex);
            growTimerRef.current = window.setTimeout(
                () => setFocusedRenderedIndex(renderedIndex),
                PLAYLIST_CAROUSEL_TRANSITION_MS,
            );
        }

        previousOriginalIndexRef.current = activeIndex;
        previousRenderedIndexRef.current = renderedIndex;
    }, [activeIndex, api, currentItemId, items.length, renderedItems, setFocusedRenderedIndex, shouldRepeatItems]);

    React.useEffect(() => {
        if (!currentItemId || !nextTransitionAt) return;
        if (shrinkTimerRef.current) window.clearTimeout(shrinkTimerRef.current);

        const transitionAtMs = new Date(nextTransitionAt).getTime();
        if (Number.isNaN(transitionAtMs)) return;

        const shrinkDelayMs = Math.max(0, transitionAtMs - Date.now() - PLAYLIST_CAROUSEL_TRANSITION_MS);

        shrinkTimerRef.current = window.setTimeout(() => {
            setScaledRenderedIndex((currentScaledIndex) =>
                currentScaledIndex === previousRenderedIndexRef.current ? null : currentScaledIndex,
            );
        }, shrinkDelayMs);

        return () => {
            if (shrinkTimerRef.current) {
                window.clearTimeout(shrinkTimerRef.current);
            }
        };
    }, [currentItemId, nextTransitionAt]);

    React.useEffect(() => {
        if (!currentItem || activeIndex < 0 || previousOriginalIndexRef.current !== null) return;
        const renderedIndex = getTargetRenderedIndex({
            originalIndex: activeIndex,
            previousOriginalIndex: null,
            previousRenderedIndex: null,
            renderedItems,
            sourceItemsCount: items.length,
        });

        window.queueMicrotask(() => setFocusedRenderedIndex(renderedIndex));
    }, [activeIndex, currentItem, items.length, renderedItems, setFocusedRenderedIndex]);

    if (!currentItem || items.length === 0) {
        return null;
    }

    return (
        <Carousel
            setApi={setApi}
            opts={{
                align: 'center',
                containScroll: false,
                duration: 60,
                loop: renderedItems.length > 1,
                skipSnaps: false,
                watchDrag: false,
            }}
            className="flex h-full w-full items-center overflow-hidden **:data-[slot=carousel-content]:h-full"
            aria-label={playlist?.playlistName ?? 'Playlist'}
        >
            <CarouselContent className="h-full w-full items-center" style={{marginLeft: -itemGap}}>
                {renderedItems.map(({item, originalIndex, renderedIndex}) => {
                    const scaled = renderedIndex === scaledRenderedIndex;
                    const front = renderedIndex === visualRenderedIndex;
                    const shouldLoad = shouldRepeatItems ||
                        isCarouselWindowIndex(originalIndex, visualOriginalIndex, items.length) ||
                        isCarouselWindowIndex(originalIndex, activeIndex, items.length);
                    const src = shouldLoad
                        ? props.playlistAssetSrcByCacheKey?.[item.asset.cacheKey] ?? item.asset.signedUrl
                        : null;

                    return (
                        <CarouselItem
                            key={`${item.id}-${renderedIndex}`}
                            className={cn(
                                'flex h-full basis-1/3 items-center justify-center',
                                front ? 'z-10' : 'z-0',
                            )}
                            style={{paddingLeft: itemGap}}
                        >
                            <div
                                className="relative flex h-[46%] w-full items-center justify-center"
                                style={{
                                    transform: scaled ? 'scale(2)' : 'scale(1)',
                                    transition: `transform ${PLAYLIST_CAROUSEL_TRANSITION_MS}ms ease`,
                                }}
                            >
                                <div className="flex h-full w-full items-center justify-center overflow-hidden">
                                    {shouldLoad ? (
                                        <div
                                            className="relative flex h-auto w-auto max-w-full max-h-full items-center justify-center overflow-hidden"
                                            style={{borderRadius: mediaBorderRadius}}
                                        >
                                            <DisplaySequenceMedia
                                                item={item}
                                                src={src}
                                                playing={renderedIndex === visualRenderedIndex && item.id === currentItemId}
                                                itemOffsetSeconds={item.id === currentItemId ? props.resolvedState.itemOffsetSeconds : 0}
                                                className="h-auto w-auto max-h-full max-w-full"
                                                style={{borderRadius: mediaBorderRadius}}
                                            />
                                            <div
                                                className="pointer-events-none absolute inset-0 bg-black"
                                                style={{
                                                    opacity: scaled ? 0 : sideDimOpacity,
                                                    borderRadius: 'inherit',
                                                    transition: `opacity ${PLAYLIST_CAROUSEL_TRANSITION_MS}ms ease`,
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </CarouselItem>
                    );
                })}
            </CarouselContent>
        </Carousel>
    );
}
