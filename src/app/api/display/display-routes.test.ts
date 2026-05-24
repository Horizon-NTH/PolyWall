import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    prisma: {
        screenPairingToken: {
            findUnique: vi.fn(),
            updateMany: vi.fn(),
        },
        screen: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    },
    consumeDisplayApiLimit: vi.fn(),
    getDisplayStateByDeviceId: vi.fn(),
    getDisplayRuntimeSnapshotByDeviceId: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mocks.prisma,
}));

vi.mock('@/lib/rate-limit/display', () => ({
    consumeDisplayApiLimit: mocks.consumeDisplayApiLimit,
    DisplayRateLimitExceeded: class DisplayRateLimitExceeded extends Error {
        msBeforeNext = 1000;
    },
}));

vi.mock('@/lib/screens/display-runtime-snapshot', () => ({
    getDisplayStateByDeviceId: mocks.getDisplayStateByDeviceId,
    getDisplayRuntimeSnapshotByDeviceId: mocks.getDisplayRuntimeSnapshotByDeviceId,
}));

describe('display API routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.consumeDisplayApiLimit.mockResolvedValue(undefined);
    });

    it('POST /api/display/pair returns pending for new screen', async () => {
        mocks.prisma.screenPairingToken.findUnique.mockResolvedValueOnce({
            id: 'pair-1',
            organizationId: 'org-1',
            expiresAt: new Date(Date.now() + 60_000),
            invalidatedAt: null,
        });
        mocks.prisma.screenPairingToken.updateMany.mockResolvedValueOnce({count: 1});
        mocks.prisma.screen.findFirst.mockResolvedValueOnce(null);
        mocks.prisma.screen.create.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'PENDING',
            channelId: null,
            interactive: false,
            interactiveUrl: null,
            inactivityTimeoutSeconds: null,
        });
        mocks.prisma.screen.update.mockResolvedValueOnce({id: 'screen-1'});

        const mod = await import('@/app/api/display/pair/route');
        const response = await mod.POST(
            new Request('http://localhost/api/display/pair', {
                method: 'POST',
                body: JSON.stringify({
                    otpCode: '123456',
                    deviceId: '550e8400-e29b-41d4-a716-446655440000',
                }),
            }),
        );

        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json).toEqual({status: 'PENDING', screenId: 'screen-1'});
    });

    it('POST /api/display/pair rejects expired token', async () => {
        mocks.prisma.screenPairingToken.findUnique.mockResolvedValueOnce({
            id: 'pair-1',
            organizationId: 'org-1',
            expiresAt: new Date(Date.now() - 60_000),
            invalidatedAt: null,
        });

        const mod = await import('@/app/api/display/pair/route');
        const response = await mod.POST(
            new Request('http://localhost/api/display/pair', {
                method: 'POST',
                body: JSON.stringify({
                    otpCode: '123456',
                    deviceId: '550e8400-e29b-41d4-a716-446655440000',
                }),
            }),
        );

        expect(response.status).toBe(410);
    });

    it('GET /api/display/state returns active screen configuration', async () => {
        mocks.getDisplayStateByDeviceId.mockResolvedValueOnce({
            screenId: 'screen-1',
            status: 'ACTIVE',
            channelId: 'channel-1',
            interactive: true,
            interactiveUrl: 'https://example.com',
            inactivityTimeoutSeconds: 60,
            revision: 'rev-1',
            serverNow: '2026-04-23T10:00:00.000Z',
        });
        mocks.prisma.screen.update.mockResolvedValueOnce({id: 'screen-1'});

        const mod = await import('@/app/api/display/state/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/state?deviceId=550e8400-e29b-41d4-a716-446655440000'),
        );

        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.status).toBe('ACTIVE');
        expect(json.channelId).toBe('channel-1');
        expect(json.revision).toBe('rev-1');
        expect(json.serverNow).toBe('2026-04-23T10:00:00.000Z');
    });

    it('GET /api/display/state returns 403 for revoked screen', async () => {
        mocks.getDisplayStateByDeviceId.mockResolvedValueOnce({
            screenId: 'screen-1',
            status: 'REVOKED',
            channelId: null,
            interactive: false,
            interactiveUrl: null,
            inactivityTimeoutSeconds: null,
            revision: null,
            serverNow: '2026-04-23T10:00:00.000Z',
        });
        mocks.prisma.screen.update.mockResolvedValueOnce({id: 'screen-1'});

        const mod = await import('@/app/api/display/state/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/state?deviceId=550e8400-e29b-41d4-a716-446655440000'),
        );

        expect(response.status).toBe(403);
    });

    it('GET /api/display/runtime returns a runtime snapshot for active screens', async () => {
        mocks.getDisplayRuntimeSnapshotByDeviceId.mockResolvedValueOnce({
            screenStatus: 'ACTIVE',
            snapshot: {
                revision: 'rev-2',
                serverNow: '2026-04-23T10:00:00.000Z',
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
                            zoneType: 'PLAYLIST',
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
            },
        });
        mocks.prisma.screen.update.mockResolvedValueOnce({id: 'screen-1'});

        const mod = await import('@/app/api/display/runtime/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/runtime?deviceId=550e8400-e29b-41d4-a716-446655440000'),
        );

        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.revision).toBe('rev-2');
        expect(json.channel.timezone).toBe('Europe/Paris');
    });
});
