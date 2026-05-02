import { describe, expect, it } from 'vitest';

import { buildDisplaySequencePlan, getDisplaySequenceDurationSeconds } from '@/lib/display-runtime/media';
import { getCurrentSequenceItem, resolveDisplayState } from '@/lib/display-runtime/runtime';
import { DayOfWeek, ScheduleType, ZoneType } from '@/generated/prisma/enums';
import { type DisplayRuntimeSnapshot } from '@/lib/display-runtime/types';

function buildSnapshot(overrides?: Partial<DisplayRuntimeSnapshot>): DisplayRuntimeSnapshot {
    return {
        revision: 'rev-1',
        serverNow: '2026-04-20T08:00:00.000Z',
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
                name: 'Plein écran',
                templateKey: 'fullscreen',
                resolutionX: 1920,
                resolutionY: 1080,
                zones: [{
                    id: 'zone-1',
                    name: 'Main',
                    slotName: 'main',
                    zoneType: ZoneType.PLAYLIST,
                    orderIndex: 0,
                    positionX: 0,
                    positionY: 0,
                    width: 1920,
                    height: 1080,
                }],
            },
        },
        schedules: [],
        playlists: [],
        ...overrides,
    };
}

describe('display runtime', () => {
    it('expands PDF and presentation render files into independent frames', () => {
        const sequence = buildDisplaySequencePlan([
            {
                id: 'playlist-item-1',
                orderIndex: 0,
                mediaItem: {
                    id: 'media-1',
                    title: 'PDF',
                    active: true,
                    durationSeconds: 15,
                    files: [
                        {
                            id: 'file-original',
                            status: 'READY',
                            variant: 'ORIGINAL',
                            variantIndex: 0,
                            sourceMediaFileId: null,
                            mimeType: 'application/pdf',
                            metaJson: {pageCount: 3},
                        },
                        {
                            id: 'file-render-0',
                            status: 'READY',
                            variant: 'RENDER',
                            variantIndex: 0,
                            sourceMediaFileId: 'file-original',
                            mimeType: 'image/webp',
                            metaJson: null,
                        },
                        {
                            id: 'file-render-1',
                            status: 'READY',
                            variant: 'RENDER',
                            variantIndex: 1,
                            sourceMediaFileId: 'file-original',
                            mimeType: 'image/webp',
                            metaJson: null,
                        },
                    ],
                },
            },
        ]);

        expect(sequence).toHaveLength(2);
        expect(getDisplaySequenceDurationSeconds(sequence)).toBe(30);
        expect(sequence.map((item) => item.frameIndex)).toEqual([0, 1]);
    });

    it('prioritizes EVENT over RECURRING over DEFAULT', () => {
        const snapshot = buildSnapshot({
            schedules: [
                {
                    id: 'default-1',
                    type: ScheduleType.DEFAULT,
                    active: true,
                    playlistId: 'playlist-default',
                    playlistName: 'Default',
                    startDate: null,
                    endDate: null,
                    updatedAt: '2026-04-20T07:00:00.000Z',
                    slots: [{dayOfWeek: DayOfWeek.MONDAY, startMinutes: 0, endMinutes: 1440}],
                },
                {
                    id: 'recurring-1',
                    type: ScheduleType.RECURRING,
                    active: true,
                    playlistId: 'playlist-recurring',
                    playlistName: 'Recurring',
                    startDate: null,
                    endDate: null,
                    updatedAt: '2026-04-20T08:00:00.000Z',
                    slots: [{dayOfWeek: DayOfWeek.MONDAY, startMinutes: 540, endMinutes: 720}],
                },
                {
                    id: 'event-1',
                    type: ScheduleType.EVENT,
                    active: true,
                    playlistId: 'playlist-event',
                    playlistName: 'Event',
                    startDate: '2026-04-20',
                    endDate: '2026-04-20',
                    updatedAt: '2026-04-20T09:00:00.000Z',
                    slots: [{dayOfWeek: DayOfWeek.MONDAY, startMinutes: 540, endMinutes: 720}],
                },
            ],
            playlists: [
                {
                    playlistId: 'playlist-default',
                    playlistName: 'Default',
                    totalDurationSeconds: 30,
                    items: [{
                        id: 'item-default',
                        playlistItemId: 'pi-default',
                        mediaItemId: 'media-default',
                        mediaTitle: 'Default',
                        mediaKind: 'image',
                        durationSeconds: 30,
                        orderIndex: 0,
                        frameIndex: 0,
                        asset: {
                            assetId: 'asset-default',
                            mediaFileId: 'asset-default',
                            cacheKey: 'default',
                            signedUrl: 'https://example.com/default.png',
                            expiresAt: '2026-04-20T11:00:00.000Z',
                            mimeType: 'image/png',
                            width: null,
                            height: null,
                        },
                    }],
                },
                {
                    playlistId: 'playlist-recurring',
                    playlistName: 'Recurring',
                    totalDurationSeconds: 30,
                    items: [{
                        id: 'item-recurring',
                        playlistItemId: 'pi-recurring',
                        mediaItemId: 'media-recurring',
                        mediaTitle: 'Recurring',
                        mediaKind: 'image',
                        durationSeconds: 30,
                        orderIndex: 0,
                        frameIndex: 0,
                        asset: {
                            assetId: 'asset-recurring',
                            mediaFileId: 'asset-recurring',
                            cacheKey: 'recurring',
                            signedUrl: 'https://example.com/recurring.png',
                            expiresAt: '2026-04-20T11:00:00.000Z',
                            mimeType: 'image/png',
                            width: null,
                            height: null,
                        },
                    }],
                },
                {
                    playlistId: 'playlist-event',
                    playlistName: 'Event',
                    totalDurationSeconds: 30,
                    items: [{
                        id: 'item-event',
                        playlistItemId: 'pi-event',
                        mediaItemId: 'media-event',
                        mediaTitle: 'Event',
                        mediaKind: 'image',
                        durationSeconds: 30,
                        orderIndex: 0,
                        frameIndex: 0,
                        asset: {
                            assetId: 'asset-event',
                            mediaFileId: 'asset-event',
                            cacheKey: 'event',
                            signedUrl: 'https://example.com/event.png',
                            expiresAt: '2026-04-20T11:00:00.000Z',
                            mimeType: 'image/png',
                            width: null,
                            height: null,
                        },
                    }],
                },
            ],
        });

        const resolved = resolveDisplayState(snapshot, Date.parse('2026-04-20T08:30:00.000Z'));
        expect(resolved.status).toBe('PLAYING');
        if (resolved.status !== 'PLAYING') {
            throw new Error('Expected playing state');
        }
        expect(resolved.schedule.id).toBe('event-1');
        expect(resolved.playlist.playlistId).toBe('playlist-event');
    });

    it('uses updatedAt DESC then id ASC as deterministic tie-breaks', () => {
        const snapshot = buildSnapshot({
            schedules: [
                {
                    id: 'schedule-b',
                    type: ScheduleType.RECURRING,
                    active: true,
                    playlistId: 'playlist-b',
                    playlistName: 'B',
                    startDate: null,
                    endDate: null,
                    updatedAt: '2026-04-20T08:00:00.000Z',
                    slots: [{dayOfWeek: DayOfWeek.MONDAY, startMinutes: 540, endMinutes: 720}],
                },
                {
                    id: 'schedule-a',
                    type: ScheduleType.RECURRING,
                    active: true,
                    playlistId: 'playlist-a',
                    playlistName: 'A',
                    startDate: null,
                    endDate: null,
                    updatedAt: '2026-04-20T08:00:00.000Z',
                    slots: [{dayOfWeek: DayOfWeek.MONDAY, startMinutes: 540, endMinutes: 720}],
                },
            ],
            playlists: [
                {
                    playlistId: 'playlist-a',
                    playlistName: 'A',
                    totalDurationSeconds: 30,
                    items: [{
                        id: 'item-a',
                        playlistItemId: 'pi-a',
                        mediaItemId: 'media-a',
                        mediaTitle: 'A',
                        mediaKind: 'image',
                        durationSeconds: 30,
                        orderIndex: 0,
                        frameIndex: 0,
                        asset: {
                            assetId: 'asset-a',
                            mediaFileId: 'asset-a',
                            cacheKey: 'a',
                            signedUrl: 'https://example.com/a.png',
                            expiresAt: '2026-04-20T11:00:00.000Z',
                            mimeType: 'image/png',
                            width: null,
                            height: null,
                        },
                    }],
                },
                {
                    playlistId: 'playlist-b',
                    playlistName: 'B',
                    totalDurationSeconds: 30,
                    items: [{
                        id: 'item-b',
                        playlistItemId: 'pi-b',
                        mediaItemId: 'media-b',
                        mediaTitle: 'B',
                        mediaKind: 'image',
                        durationSeconds: 30,
                        orderIndex: 0,
                        frameIndex: 0,
                        asset: {
                            assetId: 'asset-b',
                            mediaFileId: 'asset-b',
                            cacheKey: 'b',
                            signedUrl: 'https://example.com/b.png',
                            expiresAt: '2026-04-20T11:00:00.000Z',
                            mimeType: 'image/png',
                            width: null,
                            height: null,
                        },
                    }],
                },
            ],
        });

        const resolved = resolveDisplayState(snapshot, Date.parse('2026-04-20T08:30:00.000Z'));
        expect(resolved.status).toBe('PLAYING');
        if (resolved.status !== 'PLAYING') {
            throw new Error('Expected playing state');
        }
        expect(resolved.schedule.id).toBe('schedule-a');
    });

    it('computes the current item from elapsed loop time', () => {
        const sequence = {
            playlistId: 'playlist-1',
            playlistName: 'Main',
            totalDurationSeconds: 90,
            items: [
                {
                    id: 'item-1',
                    playlistItemId: 'pi-1',
                    mediaItemId: 'media-1',
                    mediaTitle: 'First',
                    mediaKind: 'image' as const,
                    durationSeconds: 30,
                    orderIndex: 0,
                    frameIndex: 0,
                    asset: {
                        assetId: 'asset-1',
                        mediaFileId: 'asset-1',
                        cacheKey: 'asset-1',
                        signedUrl: 'https://example.com/1.png',
                        expiresAt: '2026-04-20T11:00:00.000Z',
                        mimeType: 'image/png',
                        width: null,
                        height: null,
                    },
                },
                {
                    id: 'item-2',
                    playlistItemId: 'pi-2',
                    mediaItemId: 'media-2',
                    mediaTitle: 'Second',
                    mediaKind: 'image' as const,
                    durationSeconds: 60,
                    orderIndex: 1,
                    frameIndex: 0,
                    asset: {
                        assetId: 'asset-2',
                        mediaFileId: 'asset-2',
                        cacheKey: 'asset-2',
                        signedUrl: 'https://example.com/2.png',
                        expiresAt: '2026-04-20T11:00:00.000Z',
                        mimeType: 'image/png',
                        width: null,
                        height: null,
                    },
                },
            ],
        };

        const resolvedItem = getCurrentSequenceItem(sequence, 35);
        expect(resolvedItem?.item.id).toBe('item-2');
        expect(resolvedItem?.itemOffsetSeconds).toBe(5);
    });
});
