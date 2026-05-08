import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChannelLivePreviewCard } from '@/components/channels/channel-live-preview-card';
import { DayOfWeek, ScheduleType, ZoneType } from '@/generated/prisma/enums';
import { type DisplayRuntimeSnapshot } from '@/lib/display-runtime/types';

const mocks = vi.hoisted(() => ({
    displayPlaybackSurface: vi.fn(),
    computeServerOffsetMs: vi.fn(),
}));

vi.mock('@/components/screens/display-playback-surface', () => ({
    DisplayPlaybackSurface: (props: {
        syncStatus: string;
        serverOffsetMs: number;
        snapshot: DisplayRuntimeSnapshot;
    }) => {
        mocks.displayPlaybackSurface(props);
        return <div data-testid="display-playback-surface">{props.snapshot.channel.name}</div>;
    },
}));

vi.mock('@/lib/screens/display-clock', () => ({
    computeServerOffsetMs: (...args: unknown[]) => mocks.computeServerOffsetMs(...args),
}));

function buildSnapshot(): DisplayRuntimeSnapshot {
    return {
        revision: 'rev-preview',
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
            name: 'Cafétéria',
            timezone: 'Europe/Paris',
            template: {
                id: 'template-1',
                name: 'Player',
                templateKey: 'player',
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
                    signedUrl: 'https://example.com/media.png',
                    expiresAt: '2026-05-02T11:00:00.000Z',
                    mimeType: 'image/png',
                    width: 1280,
                    height: 720,
                },
            }],
        }],
    };
}

describe('ChannelLivePreviewCard', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mocks.displayPlaybackSurface.mockReset();
        mocks.computeServerOffsetMs.mockReset();
        mocks.computeServerOffsetMs.mockReturnValue(1234);
    });

    it('renders the live preview when the fetch succeeds', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({snapshot: buildSnapshot()}), {status: 200}),
        );

        await act(async () => {
            render(<ChannelLivePreviewCard channelId="channel-1" />);
        });

        expect(await screen.findByTestId('display-playback-surface')).toHaveTextContent('Cafétéria');
        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(mocks.displayPlaybackSurface).toHaveBeenCalledWith(
            expect.objectContaining({
                syncStatus: 'PLAYING',
                serverOffsetMs: 1234,
            }),
        );
    });

    it('shows an error alert when the initial fetch fails', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({error: 'Preview failed'}), {status: 500}),
        );

        await act(async () => {
            render(<ChannelLivePreviewCard channelId="channel-1" />);
        });

        expect(await screen.findByText('Aperçu indisponible')).toBeInTheDocument();
        expect(screen.getByText('Preview failed')).toBeInTheDocument();
    });

    it('falls back to degraded mode when a refresh fails after a snapshot was loaded', async () => {
        const fetchMock = vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce(new Response(JSON.stringify({snapshot: buildSnapshot()}), {status: 200}))
            .mockRejectedValueOnce(new Error('offline'));

        await act(async () => {
            render(<ChannelLivePreviewCard channelId="channel-1" />);
        });

        await screen.findByTestId('display-playback-surface');

        await act(async () => {
            window.dispatchEvent(new Event('online'));
        });

        await waitFor(() => {
            expect(screen.getByText('Dégradé')).toBeInTheDocument();
        });
        expect(screen.queryByText('Aperçu indisponible')).not.toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('shows an error state when switching channel before a new snapshot loads', async () => {
        const fetchMock = vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce(new Response(JSON.stringify({snapshot: buildSnapshot()}), {status: 200}))
            .mockResolvedValueOnce(new Response(JSON.stringify({error: 'Channel 2 failed'}), {status: 500}));

        const {rerender} = render(<ChannelLivePreviewCard channelId="channel-1" />);
        await screen.findByTestId('display-playback-surface');

        rerender(<ChannelLivePreviewCard channelId="channel-2" />);

        expect(await screen.findByText('Aperçu indisponible')).toBeInTheDocument();
        expect(screen.getByText('Channel 2 failed')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
