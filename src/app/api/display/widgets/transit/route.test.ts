import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    prisma: {
        screen: {
            findFirst: vi.fn(),
        },
    },
    consumeDisplayApiLimit: vi.fn(),
    getTransitDepartures: vi.fn(),
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

vi.mock('@/lib/transit/gtfs-service', () => ({
    getTransitDepartures: mocks.getTransitDepartures,
}));

describe('GET /api/display/widgets/transit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.consumeDisplayApiLimit.mockResolvedValue(undefined);
    });

    it('returns departures for an active screen widget', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'ACTIVE',
            channel: {
                displayTemplate: {
                    zones: [{
                        widgetInstance: {
                            id: 'widget-1',
                            configurationJson: {
                                providerId: 'pan:test-network',
                                stopIds: ['stop-1'],
                                routeIds: ['route-1'],
                                destinations: ['Gare'],
                                maxDeparturesPerLine: 2,
                            },
                        },
                    }],
                },
            },
        });
        mocks.getTransitDepartures.mockResolvedValueOnce({
            departures: [],
        });

        const mod = await import('@/app/api/display/widgets/transit/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/widgets/transit?deviceId=device-1&widgetId=widget-1'),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({departures: []});
        expect(mocks.getTransitDepartures).toHaveBeenCalledWith({
            providerId: 'pan:test-network',
            stopIds: ['stop-1'],
            routeIds: ['route-1'],
            destinations: ['Gare'],
            maxDeparturesPerLine: 2,
            layoutDirection: 'row',
        });
    });

    it('rejects invalid query params', async () => {
        const mod = await import('@/app/api/display/widgets/transit/route');
        const response = await mod.GET(new Request('http://localhost/api/display/widgets/transit?deviceId=device-1'));

        expect(response.status).toBe(400);
        expect(mocks.prisma.screen.findFirst).not.toHaveBeenCalled();
    });

    it('returns 403 for inactive screens', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'PENDING',
            channel: null,
        });

        const mod = await import('@/app/api/display/widgets/transit/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/widgets/transit?deviceId=device-1&widgetId=widget-1'),
        );

        expect(response.status).toBe(403);
    });

    it('returns 404 when the widget is not attached to the active screen template', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'ACTIVE',
            channel: {
                displayTemplate: {
                    zones: [],
                },
            },
        });

        const mod = await import('@/app/api/display/widgets/transit/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/widgets/transit?deviceId=device-1&widgetId=widget-1'),
        );

        expect(response.status).toBe(404);
    });
});
