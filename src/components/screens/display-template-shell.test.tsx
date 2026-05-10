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
    it('renders the layout even when there is no playlist zone', () => {
        render(
            <DisplayTemplateShell
                snapshot={buildSnapshot(ZoneType.WIDGET)}
                resolvedState={buildPlayingResolvedState()}
                syncStatus="PLAYING"
                assetSrc="https://example.com/image.png"
            />,
        );

        expect(screen.getByText('Aucun widget')).toBeInTheDocument();
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

    it('renders playlist and static zones in a multi-zone template', () => {
        const snapshot = buildSnapshot();
        snapshot.channel.template.zones = [
            {
                ...snapshot.channel.template.zones[0]!,
                width: 1400,
            },
            {
                id: 'zone-static',
                name: 'Message',
                zoneType: ZoneType.STATIC,
                orderIndex: 1,
                positionX: 1400,
                positionY: 0,
                width: 520,
                height: 1080,
                configurationJson: {
                    text: 'Bienvenue',
                    backgroundColor: '#111827',
                    borderRadius: 32,
                    padding: 24,
                    borderWidth: 2,
                    borderColor: '#ffffff55',
                    opacity: 0.9,
                },
                widgetInstance: null,
            },
        ];

        render(
            <DisplayTemplateShell
                snapshot={snapshot}
                resolvedState={buildPlayingResolvedState()}
                syncStatus="PLAYING"
                assetSrc="https://example.com/image.png"
            />,
        );

        expect(screen.getByAltText('Affiche principale')).toBeInTheDocument();
        expect(screen.getByText('Bienvenue').parentElement).toHaveStyle({
            backgroundColor: '#111827',
            borderRadius: '32px',
            padding: '24px',
            borderWidth: '2px',
            borderColor: '#ffffff55',
            opacity: '0.9',
        });
    });

    it('renders a static image from the resolved media asset', () => {
        const snapshot = buildSnapshot();
        snapshot.channel.template.zones = [{
            id: 'zone-logo',
            name: 'Logo',
            zoneType: ZoneType.STATIC,
            orderIndex: 1,
            positionX: 0,
            positionY: 0,
            width: 320,
            height: 180,
            configurationJson: {
                contentType: 'image',
                mediaItemId: 'media-logo',
                fit: 'contain',
            },
            staticMediaAsset: {
                assetId: 'asset-logo',
                mediaFileId: 'asset-logo',
                cacheKey: 'asset-logo',
                signedUrl: 'https://example.com/logo.png',
                expiresAt: '2026-05-02T11:00:00.000Z',
                mimeType: 'image/png',
                width: 320,
                height: 180,
            },
            widgetInstance: null,
        }];

        render(
            <DisplayTemplateShell
                snapshot={snapshot}
                resolvedState={buildPlayingResolvedState()}
                syncStatus="PLAYING"
                assetSrc="https://example.com/image.png"
                staticAssetSrcByCacheKey={{'asset-logo': 'blob:http://localhost/logo'}}
            />,
        );

        expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'blob:http://localhost/logo');
    });
});
