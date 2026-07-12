import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DisplayPlaylistCarousel } from '@/components/screens/display-playlist-carousel';
import { type TemplateRendererProps } from '@/components/screens/display-template-shell';
import { DayOfWeek, ScheduleType, ZoneType } from '@/generated/prisma/enums';
import { type DisplayRuntimeSnapshot, type DisplaySequenceItem } from '@/lib/display-runtime/types';

const mocks = vi.hoisted(() => ({
    scrollTo: vi.fn(),
}));

vi.mock('@/components/ui/carousel', () => ({
    Carousel: ({
                   setApi,
                   opts,
                   children,
                   ...props
               }: React.ComponentProps<'div'> & {
        setApi?: (api: { scrollTo: ReturnType<typeof vi.fn> }) => void;
        opts?: { loop?: boolean };
    }) => {
        React.useEffect(() => {
            setApi?.({scrollTo: mocks.scrollTo});
        }, [setApi]);

        return (
            <div data-testid="carousel" data-loop={String(Boolean(opts?.loop))} {...props}>
                {children}
            </div>
        );
    },
    CarouselContent: ({children, ...props}: React.ComponentProps<'div'>) => (
        <div data-testid="carousel-content" {...props}>{children}</div>
    ),
    CarouselItem: ({children, ...props}: React.ComponentProps<'div'>) => (
        <div data-testid="carousel-item" {...props}>{children}</div>
    ),
}));

vi.mock('@/components/screens/display-sequence-media', () => ({
    DisplaySequenceMedia: ({
                               item,
                               src,
                               playing,
                               itemOffsetSeconds,
                               className,
                               style,
                           }: {
        item: DisplaySequenceItem;
        src: string | null;
        playing: boolean;
        itemOffsetSeconds: number;
        className?: string;
        style?: React.CSSProperties;
    }) => (
        <div
            data-testid="sequence-media"
            data-item-id={item.id}
            data-src={src ?? ''}
            data-playing={String(playing)}
            data-offset={String(itemOffsetSeconds)}
            className={className}
            style={style}
        >
            {item.mediaTitle}
        </div>
    ),
}));

function buildItem(index: number): DisplaySequenceItem {
    return {
        id: `item-${index}`,
        playlistItemId: `playlist-item-${index}`,
        mediaItemId: `media-${index}`,
        mediaTitle: `Media ${index}`,
        mediaKind: 'image',
        durationSeconds: 30,
        orderIndex: index,
        frameIndex: 0,
        asset: {
            assetId: `asset-${index}`,
            mediaFileId: `asset-${index}`,
            cacheKey: `asset-${index}`,
            signedUrl: `https://example.com/media-${index}.png`,
            expiresAt: '2026-05-02T11:00:00.000Z',
            mimeType: 'image/png',
            width: 1920,
            height: 1080,
        },
    };
}

function buildProps(items: DisplaySequenceItem[], currentIndex: number): TemplateRendererProps {
    const snapshot: DisplayRuntimeSnapshot = {
        revision: 'rev-1',
        serverNow: '2026-05-02T10:00:00.000Z',
        screen: {
            screenId: 'screen-1',
            channelId: 'channel-1',
            interactive: false,
            interactiveUrl: null,
        },
        channel: {
            id: 'channel-1',
            name: 'Hall',
            timezone: 'Europe/Paris',
            template: {
                id: 'template-1',
                name: 'Template',
                templateKey: 'carousel',
                resolutionX: 1920,
                resolutionY: 1080,
                zones: [{
                    id: 'zone-1',
                    name: 'Main',
                    zoneType: ZoneType.PLAYLIST,
                    orderIndex: 0,
                    positionX: 0,
                    positionY: 0,
                    width: 1920,
                    height: 1080,
                    configurationJson: {displayMode: 'carousel'},
                }],
            },
        },
        schedules: [{
            id: 'schedule-1',
            type: ScheduleType.DEFAULT,
            active: true,
            playlistId: 'playlist-1',
            playlistName: 'Playlist',
            startDate: null,
            endDate: null,
            updatedAt: '2026-05-02T09:00:00.000Z',
            slots: Object.values(DayOfWeek).map((dayOfWeek) => ({
                dayOfWeek,
                startMinutes: 0,
                endMinutes: 1440,
            })),
        }],
        playlists: [{
            playlistId: 'playlist-1',
            playlistName: 'Playlist',
            totalDurationSeconds: items.reduce((total, item) => total + item.durationSeconds, 0),
            items,
        }],
    };

    return {
        snapshot,
        resolvedState: {
            status: 'PLAYING',
            schedule: snapshot.schedules[0]!,
            playlist: snapshot.playlists[0]!,
            currentItem: items[currentIndex]!,
            nextTransitionAt: '2026-05-02T10:00:30.000Z',
            slotStartedAt: '2026-05-02T10:00:00.000Z',
            slotEndsAt: '2026-05-02T11:00:00.000Z',
            loopOffsetSeconds: 0,
            itemOffsetSeconds: 4,
            isFallbackToDefault: false,
            reason: null,
        },
        syncStatus: 'PLAYING',
        assetSrc: `blob:${items[currentIndex]!.asset.cacheKey}`,
        playlistAssetSrcByCacheKey: Object.fromEntries(items.map((item) => [item.asset.cacheKey, `blob:${item.asset.cacheKey}`])),
    };
}

describe('DisplayPlaylistCarousel', () => {
    beforeEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('renders repeated slides and disables Embla loop for short playlists', async () => {
        render(<DisplayPlaylistCarousel {...buildProps([buildItem(1), buildItem(2)], 1)} />);

        await waitFor(() => expect(mocks.scrollTo).toHaveBeenCalledWith(5, true));
        expect(screen.getByTestId('carousel')).toHaveAttribute('data-loop', 'true');
        expect(screen.getAllByTestId('carousel-item')).toHaveLength(10);
        expect(screen.getAllByTestId('sequence-media')).toHaveLength(10);
        expect(screen.getAllByTestId('sequence-media').filter((node) => node.dataset.playing === 'true')).toHaveLength(1);
    });

    it('keeps Embla loop enabled and only loads neighboring assets for longer playlists', async () => {
        render(<DisplayPlaylistCarousel {...buildProps([1, 2, 3, 4, 5].map(buildItem), 2)} />);

        await waitFor(() => expect(mocks.scrollTo).toHaveBeenCalledWith(2, true));
        expect(screen.getByTestId('carousel')).toHaveAttribute('data-loop', 'true');
        expect(screen.getAllByTestId('carousel-item')).toHaveLength(5);

        const renderedMediaIds = screen.getAllByTestId('sequence-media').map((node) => node.dataset.itemId);
        expect(renderedMediaIds).toEqual(['item-2', 'item-3', 'item-4']);
    });

    it('applies carousel appearance options', async () => {
        render(
            <DisplayPlaylistCarousel
                {...buildProps([1, 2, 3, 4, 5].map(buildItem), 2)}
                configurationJson={{
                    carouselMediaBorderRadius: 24,
                    carouselItemGap: 48,
                    carouselSideDimOpacity: 0.25,
                }}
            />,
        );

        await waitFor(() => expect(mocks.scrollTo).toHaveBeenCalledWith(2, true));
        expect(screen.getByTestId('carousel-content')).toHaveStyle({marginLeft: '-48px'});
        expect(screen.getAllByTestId('carousel-item')[0]).toHaveStyle({paddingLeft: '48px'});

        expect(screen.getAllByTestId('sequence-media')[0]).toHaveClass('h-auto', 'w-auto', 'max-h-full', 'max-w-full');
        expect(screen.getAllByTestId('sequence-media')[0]).toHaveStyle({borderRadius: '24px'});
        expect(screen.getAllByTestId('sequence-media')[0]?.parentElement).toHaveClass(
            'h-auto',
            'w-auto',
            'max-h-full',
            'max-w-full',
        );
        expect(screen.getAllByTestId('sequence-media')[0]?.parentElement).toHaveStyle({borderRadius: '24px'});
        expect(screen.getAllByTestId('sequence-media')[0]?.parentElement?.querySelector('.bg-black')).toHaveStyle({
            borderRadius: '24px',
        });
        expect(screen.getAllByTestId('sequence-media')[0]?.parentElement?.querySelector('.bg-black')).toHaveStyle({
            opacity: '0.25',
            transition: 'opacity 1000ms ease',
        });
    });

    it('scrolls through synthetic copies without recentering short playlists', async () => {
        vi.useFakeTimers();
        const items = [1, 2, 3, 4].map(buildItem);
        const {rerender} = render(<DisplayPlaylistCarousel {...buildProps(items, 3)} />);

        await act(async () => {
            await Promise.resolve();
        });
        expect(mocks.scrollTo).toHaveBeenCalledWith(11, true);

        rerender(<DisplayPlaylistCarousel {...buildProps(items, 0)} />);

        await act(async () => {
            await Promise.resolve();
        });
        expect(mocks.scrollTo).toHaveBeenCalledWith(12);

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(mocks.scrollTo).not.toHaveBeenCalledWith(8, true);

        vi.useRealTimers();
    });
});
