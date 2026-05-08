import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaFileStatus, MediaFileVariant, ScheduleType, ScreenStatus, ZoneType } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
    prisma: {
        channel: {
            findFirst: vi.fn(),
        },
        screen: {
            findFirst: vi.fn(),
        },
    },
    presignStorageObjectGetUrl: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mocks.prisma,
}));

vi.mock('@/lib/storage/presigned-url', () => ({
    presignStorageObjectGetUrl: (...args: unknown[]) => mocks.presignStorageObjectGetUrl(...args),
}));

vi.mock('@/env', () => ({
    env: {
        DOWNLOAD_URL_TTL_SECONDS: 300,
    },
}));

function buildChannelSource() {
    return {
        id: 'channel-1',
        name: 'Hall principal',
        timezone: 'Europe/Paris',
        updatedAt: new Date('2026-05-02T10:00:00.000Z'),
        displayTemplate: {
            id: 'template-1',
            name: 'Template',
            templateKey: 'template',
            resolutionX: 1920,
            resolutionY: 1080,
            updatedAt: new Date('2026-05-02T10:00:00.000Z'),
            zones: [{
                id: 'zone-1',
                name: 'Main',
                zoneType: ZoneType.PLAYLIST,
                orderIndex: 0,
                positionX: 0,
                positionY: 0,
                width: 1920,
                height: 1080,
                updatedAt: new Date('2026-05-02T10:00:00.000Z'),
                widgetInstance: null,
            }],
        },
        schedules: [{
            id: 'schedule-1',
            type: ScheduleType.DEFAULT,
            active: true,
            startDate: null,
            endDate: null,
            updatedAt: new Date('2026-05-02T09:00:00.000Z'),
            playlistId: 'playlist-1',
            playlist: {
                id: 'playlist-1',
                name: 'Playlist PDF',
                updatedAt: new Date('2026-05-02T08:00:00.000Z'),
                items: [{
                    id: 'playlist-item-1',
                    orderIndex: 0,
                    updatedAt: new Date('2026-05-02T08:10:00.000Z'),
                    mediaItem: {
                        id: 'media-1',
                        title: 'Brochure',
                        active: true,
                        durationSeconds: 5,
                        updatedAt: new Date('2026-05-02T08:20:00.000Z'),
                        files: [
                            {
                                id: 'file-original',
                                status: MediaFileStatus.READY,
                                variant: MediaFileVariant.ORIGINAL,
                                variantIndex: 0,
                                sourceMediaFileId: null,
                                mimeType: 'application/pdf',
                                storageBucket: 'bucket',
                                objectKey: 'file-original.pdf',
                                metaJson: {
                                    width: 1080,
                                    height: 1920,
                                },
                                updatedAt: new Date('2026-05-02T08:30:00.000Z'),
                            },
                            {
                                id: 'render-2',
                                status: MediaFileStatus.READY,
                                variant: MediaFileVariant.RENDER,
                                variantIndex: 2,
                                sourceMediaFileId: 'file-original',
                                mimeType: 'image/jpeg',
                                storageBucket: 'bucket',
                                objectKey: 'render-2.jpg',
                                metaJson: {},
                                updatedAt: new Date('2026-05-02T08:31:00.000Z'),
                            },
                            {
                                id: 'render-1',
                                status: MediaFileStatus.READY,
                                variant: MediaFileVariant.RENDER,
                                variantIndex: 1,
                                sourceMediaFileId: 'file-original',
                                mimeType: 'image/jpeg',
                                storageBucket: 'bucket',
                                objectKey: 'render-1.jpg',
                                metaJson: {},
                                updatedAt: new Date('2026-05-02T08:32:00.000Z'),
                            },
                        ],
                    },
                }],
            },
            timeSlots: [{
                dayOfWeek: 'MONDAY',
                startTime: new Date('1970-01-01T00:00:00.000Z'),
                endTime: new Date('1970-01-01T23:59:59.999Z'),
            }],
        }],
    };
}

describe('display-runtime-snapshot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.presignStorageObjectGetUrl.mockResolvedValue('https://signed.example.com/media');
    });

    it('builds a channel preview snapshot with expanded playlist assets', async () => {
        mocks.prisma.channel.findFirst.mockResolvedValue(buildChannelSource());

        const {getDisplayRuntimeSnapshotByChannelId} = await import('@/lib/screens/display-runtime-snapshot');
        const snapshot = await getDisplayRuntimeSnapshotByChannelId('channel-1', 'org-1');

        expect(snapshot?.screen.screenId).toBe('channel-preview:channel-1');
        expect(snapshot?.channel.timezone).toBe('Europe/Paris');
        expect(snapshot?.playlists[0]?.items.map((item) => item.frameIndex)).toEqual([1, 2]);
        expect(snapshot?.playlists[0]?.totalDurationSeconds).toBe(10);
        expect(snapshot?.playlists[0]?.items[0]?.asset.signedUrl).toBe('https://signed.example.com/media');
    });

    it('returns no snapshot for non-active screens', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValue({
            id: 'screen-1',
            status: ScreenStatus.REVOKED,
            channelId: null,
            interactive: false,
            interactiveUrl: null,
            inactivityTimeoutSeconds: null,
            channel: null,
        });

        const {getDisplayRuntimeSnapshotByDeviceId} = await import('@/lib/screens/display-runtime-snapshot');
        const result = await getDisplayRuntimeSnapshotByDeviceId('device-1');

        expect(result).toEqual({
            screenStatus: ScreenStatus.REVOKED,
            snapshot: null,
        });
    });

    it('returns a state payload with a revision for active screens', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValue({
            id: 'screen-1',
            status: ScreenStatus.ACTIVE,
            channelId: 'channel-1',
            interactive: true,
            interactiveUrl: 'https://example.com/interactive',
            inactivityTimeoutSeconds: 60,
            channel: buildChannelSource(),
        });

        const {getDisplayStateByDeviceId} = await import('@/lib/screens/display-runtime-snapshot');
        const state = await getDisplayStateByDeviceId('device-1');

        expect(state?.status).toBe(ScreenStatus.ACTIVE);
        expect(state?.channelId).toBe('channel-1');
        expect(state?.interactive).toBe(true);
        expect(state?.revision).toEqual(expect.any(String));
        expect(state?.serverNow).toEqual(expect.any(String));
    });
});
