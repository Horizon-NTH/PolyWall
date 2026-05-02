import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DisplayTemplateShell } from '@/components/screens/display-template-shell';
import { DayOfWeek, ScheduleType, ZoneType } from '@/generated/prisma/enums';
import { type DisplayResolvedState, type DisplayRuntimeSnapshot } from '@/lib/display-runtime/types';

function buildSnapshot(zoneType: ZoneType = ZoneType.PLAYLIST): DisplayRuntimeSnapshot {
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
                    slotName: 'main',
                    zoneType,
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
                mediaTitle: 'Affiche principale',
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

function buildPlayingResolvedState(): DisplayResolvedState {
    return {
        status: 'PLAYING',
        schedule: buildSnapshot().schedules[0]!,
        playlist: buildSnapshot().playlists[0]!,
        currentItem: buildSnapshot().playlists[0]!.items[0]!,
        nextTransitionAt: '2026-05-02T10:00:30.000Z',
        slotStartedAt: '2026-05-02T10:00:00.000Z',
        slotEndsAt: '2026-05-02T11:00:00.000Z',
        loopOffsetSeconds: 0,
        itemOffsetSeconds: 0,
        isFallbackToDefault: false,
        reason: null,
    };
}

describe('DisplayTemplateShell', () => {
    it('shows a diagnostic when the template is incompatible', () => {
        render(
            <DisplayTemplateShell
                snapshot={buildSnapshot(ZoneType.WIDGET)}
                resolvedState={buildPlayingResolvedState()}
                syncStatus="PLAYING"
                assetSrc="https://example.com/image.png"
            />,
        );

        expect(screen.getByText('Modèle d’affichage incompatible')).toBeInTheDocument();
    });

    it('shows the resolved-state diagnostic when playback is unavailable', () => {
        render(
            <DisplayTemplateShell
                snapshot={buildSnapshot()}
                resolvedState={{
                    status: 'NO_ACTIVE_SCHEDULE',
                    schedule: null,
                    playlist: null,
                    currentItem: null,
                    nextTransitionAt: null,
                    slotStartedAt: null,
                    slotEndsAt: null,
                    loopOffsetSeconds: 0,
                    itemOffsetSeconds: 0,
                    isFallbackToDefault: false,
                    reason: 'Aucune programmation active pour ce canal.',
                }}
                syncStatus="PLAYING"
                assetSrc={null}
            />,
        );

        expect(screen.getByText('Diffusion indisponible')).toBeInTheDocument();
        expect(screen.getByText('Aucune programmation active pour ce canal.')).toBeInTheDocument();
    });

    it('renders the current media and syncing overlay during playback', () => {
        render(
            <DisplayTemplateShell
                snapshot={buildSnapshot()}
                resolvedState={buildPlayingResolvedState()}
                syncStatus="SYNCING"
                assetSrc="https://example.com/image.png"
            />,
        );

        expect(screen.getByAltText('Affiche principale')).toHaveAttribute('src', 'https://example.com/image.png');
        expect(screen.getByText('Synchronisation')).toBeInTheDocument();
    });
});
