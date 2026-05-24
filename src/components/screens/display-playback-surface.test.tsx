import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DisplayPlaybackSurface } from '@/components/screens/display-playback-surface';
import { DayOfWeek, ScheduleType, ZoneType } from '@/generated/prisma/enums';
import { type DisplayResolvedState, type DisplayRuntimeSnapshot } from '@/lib/display-runtime/types';

const mocks = vi.hoisted(() => ({
    resolveDisplayState: vi.fn(),
    getCachedAssetObjectUrl: vi.fn(),
    displayTemplateShell: vi.fn(),
}));

vi.mock('@/lib/display-runtime/runtime', () => ({
    resolveDisplayState: (...args: unknown[]) => mocks.resolveDisplayState(...args),
}));

vi.mock('@/lib/screens/display-cache', () => ({
    getCachedAssetObjectUrl: (...args: unknown[]) => mocks.getCachedAssetObjectUrl(...args),
}));

vi.mock('@/components/screens/display-template-shell', () => ({
    DisplayTemplateShell: (props: {
        syncStatus: string;
        assetSrc: string | null;
        resolvedState: DisplayResolvedState;
        playlistAssetSrcByCacheKey?: Record<string, string>;
    }) => {
        mocks.displayTemplateShell(props);
        return (
            <div data-testid="display-template-shell">
                {props.syncStatus}:{props.assetSrc ?? 'none'}:{props.resolvedState.status}
            </div>
        );
    },
}));

function buildSnapshot(): DisplayRuntimeSnapshot {
    return {
        revision: 'rev-1',
        serverNow: '2026-05-02T10:00:00.000Z',
        screen: {
            screenId: 'screen-1',
            channelId: 'channel-1',
            interactive: false,
            interactiveUrl: null,
            inactivityTimeoutSeconds: null,
        },
        channel: {
            id: 'channel-1',
            name: 'Hall',
            timezone: 'Europe/Paris',
            template: {
                id: 'template-1',
                name: 'Template',
                templateKey: 'fullscreen',
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
            totalDurationSeconds: 30,
            items: [{
                id: 'item-1',
                playlistItemId: 'playlist-item-1',
                mediaItemId: 'media-1',
                mediaTitle: 'Image',
                mediaKind: 'image',
                durationSeconds: 30,
                orderIndex: 0,
                frameIndex: 0,
                asset: {
                    assetId: 'asset-1',
                    mediaFileId: 'asset-1',
                    cacheKey: 'asset-1',
                    signedUrl: 'https://example.com/image.png',
                    expiresAt: '2026-05-02T11:00:00.000Z',
                    mimeType: 'image/png',
                    width: 1920,
                    height: 1080,
                },
            }],
        }],
    };
}

function buildResolvedState(assetUrl = 'https://example.com/image.png'): DisplayResolvedState {
    const snapshot = buildSnapshot();
    return {
        status: 'PLAYING',
        schedule: snapshot.schedules[0]!,
        playlist: snapshot.playlists[0]!,
        currentItem: {
            ...snapshot.playlists[0]!.items[0]!,
            asset: {
                ...snapshot.playlists[0]!.items[0]!.asset,
                signedUrl: assetUrl,
            },
        },
        nextTransitionAt: '2026-05-02T10:00:30.000Z',
        slotStartedAt: '2026-05-02T10:00:00.000Z',
        slotEndsAt: '2026-05-02T11:00:00.000Z',
        loopOffsetSeconds: 0,
        itemOffsetSeconds: 0,
        isFallbackToDefault: false,
        reason: null,
    };
}

function buildResolvedStateWithThreeItems(): DisplayResolvedState {
    const snapshot = buildSnapshot();
    const items = [
        snapshot.playlists[0]!.items[0]!,
        {
            ...snapshot.playlists[0]!.items[0]!,
            id: 'item-2',
            playlistItemId: 'playlist-item-2',
            mediaItemId: 'media-2',
            mediaTitle: 'Video',
            mediaKind: 'video' as const,
            orderIndex: 1,
            asset: {
                ...snapshot.playlists[0]!.items[0]!.asset,
                assetId: 'asset-2',
                mediaFileId: 'asset-2',
                cacheKey: 'asset-2',
                signedUrl: 'https://example.com/video.mp4',
                mimeType: 'video/mp4',
            },
        },
        {
            ...snapshot.playlists[0]!.items[0]!,
            id: 'item-3',
            playlistItemId: 'playlist-item-3',
            mediaItemId: 'media-3',
            mediaTitle: 'Image suivante',
            orderIndex: 2,
            asset: {
                ...snapshot.playlists[0]!.items[0]!.asset,
                assetId: 'asset-3',
                mediaFileId: 'asset-3',
                cacheKey: 'asset-3',
                signedUrl: 'https://example.com/next.png',
            },
        },
    ];
    const playlist = {
        ...snapshot.playlists[0]!,
        totalDurationSeconds: 90,
        items,
    };

    return {
        status: 'PLAYING',
        schedule: snapshot.schedules[0]!,
        playlist,
        currentItem: items[1]!,
        nextTransitionAt: '2026-05-02T10:01:00.000Z',
        slotStartedAt: '2026-05-02T10:00:00.000Z',
        slotEndsAt: '2026-05-02T11:00:00.000Z',
        loopOffsetSeconds: 35,
        itemOffsetSeconds: 5,
        isFallbackToDefault: false,
        reason: null,
    };
}

describe('DisplayPlaybackSurface', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mocks.resolveDisplayState.mockReset();
        mocks.getCachedAssetObjectUrl.mockReset();
        mocks.displayTemplateShell.mockReset();
        Object.defineProperty(URL, 'revokeObjectURL', {
            writable: true,
            value: vi.fn(),
        });
    });

    it('renders the cached asset object URL when available', async () => {
        mocks.resolveDisplayState.mockReturnValue(buildResolvedState());
        mocks.getCachedAssetObjectUrl.mockResolvedValue('blob:cached');

        await act(async () => {
            render(
                <DisplayPlaybackSurface
                    snapshot={buildSnapshot()}
                    syncStatus="PLAYING"
                    serverOffsetMs={500}
                />,
            );
        });

        await waitFor(() => {
            expect(screen.getByTestId('display-template-shell')).toHaveTextContent('PLAYING:blob:cached:PLAYING');
        });
        expect(mocks.resolveDisplayState).toHaveBeenCalledWith(expect.any(Object), expect.any(Number));
    });

    it('falls back to the signed URL when no cached asset is available', async () => {
        mocks.resolveDisplayState.mockReturnValue(buildResolvedState('https://example.com/direct.png'));
        mocks.getCachedAssetObjectUrl.mockResolvedValue(null);

        await act(async () => {
            render(
                <DisplayPlaybackSurface
                    snapshot={buildSnapshot()}
                    syncStatus="DEGRADED"
                    serverOffsetMs={0}
                />,
            );
        });

        await waitFor(() => {
            expect(screen.getByTestId('display-template-shell')).toHaveTextContent(
                'DEGRADED:https://example.com/direct.png:PLAYING',
            );
        });
    });

    it('revokes the previous object URL when the active asset changes', async () => {
        mocks.resolveDisplayState
            .mockReturnValueOnce(buildResolvedState('https://example.com/a.png'))
            .mockReturnValueOnce(buildResolvedState('https://example.com/b.png'));
        mocks.getCachedAssetObjectUrl
            .mockResolvedValueOnce('blob:first')
            .mockResolvedValueOnce('blob:second');

        const {rerender, unmount} = render(
            <DisplayPlaybackSurface
                snapshot={buildSnapshot()}
                syncStatus="PLAYING"
                serverOffsetMs={0}
            />,
        );

        await waitFor(() => {
            expect(screen.getByTestId('display-template-shell')).toHaveTextContent('blob:first');
        });

        rerender(
            <DisplayPlaybackSurface
                snapshot={{...buildSnapshot(), revision: 'rev-2'}}
                syncStatus="PLAYING"
                serverOffsetMs={0}
            />,
        );

        await waitFor(() => {
            expect(screen.getByTestId('display-template-shell')).toHaveTextContent('blob:second');
        });

        unmount();

        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second');
    });

    it('loads the previous, current and next playlist assets for carousel playback', async () => {
        mocks.resolveDisplayState.mockReturnValue(buildResolvedStateWithThreeItems());
        mocks.getCachedAssetObjectUrl
            .mockResolvedValueOnce('blob:previous')
            .mockResolvedValueOnce('blob:current')
            .mockResolvedValueOnce('blob:next');

        await act(async () => {
            render(
                <DisplayPlaybackSurface
                    snapshot={buildSnapshot()}
                    syncStatus="PLAYING"
                    serverOffsetMs={0}
                />,
            );
        });

        await waitFor(() => {
            expect(mocks.displayTemplateShell).toHaveBeenLastCalledWith(expect.objectContaining({
                assetSrc: 'blob:current',
                playlistAssetSrcByCacheKey: {
                    'asset-1': 'blob:previous',
                    'asset-2': 'blob:current',
                    'asset-3': 'blob:next',
                },
            }));
        });
        expect(mocks.getCachedAssetObjectUrl).toHaveBeenCalledTimes(3);
    });
});
