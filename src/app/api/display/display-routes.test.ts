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
        mocks.prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'ACTIVE',
            channelId: 'channel-1',
            interactive: true,
            interactiveUrl: 'https://example.com',
            inactivityTimeoutSeconds: 60,
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
    });

    it('GET /api/display/state returns 403 for revoked screen', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'REVOKED',
            channelId: null,
            interactive: false,
            interactiveUrl: null,
            inactivityTimeoutSeconds: null,
        });
        mocks.prisma.screen.update.mockResolvedValueOnce({id: 'screen-1'});

        const mod = await import('@/app/api/display/state/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/state?deviceId=550e8400-e29b-41d4-a716-446655440000'),
        );

        expect(response.status).toBe(403);
    });
});
