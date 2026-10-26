import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    prisma: {
        screen: {
            findFirst: vi.fn(),
        },
    },
    consumeDisplayApiLimit: vi.fn(),
    getWeather: vi.fn(),
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

vi.mock('@/lib/weather/weather-service', () => ({
    getWeather: mocks.getWeather,
}));

describe('GET /api/display/widgets/weather', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.consumeDisplayApiLimit.mockResolvedValue(undefined);
    });

    it('returns weather for an active screen widget', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'ACTIVE',
            channel: {
                displayTemplate: {
                    zones: [{
                        widgetInstance: {
                            id: 'widget-1',
                            configurationJson: {
                                city: 'Paris',
                                displayMode: 'forecast',
                                forecastDays: 2,
                            },
                        },
                    }],
                },
            },
        });
        mocks.getWeather.mockResolvedValueOnce({locationName: 'Paris'});

        const mod = await import('@/app/api/display/widgets/weather/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/widgets/weather?deviceId=device-1&widgetId=widget-1'),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({locationName: 'Paris'});
        expect(mocks.getWeather).toHaveBeenCalledWith({
            city: 'Paris',
            displayMode: 'forecast',
            forecastDays: 2,
        });
    });

    it('rejects invalid query params', async () => {
        const mod = await import('@/app/api/display/widgets/weather/route');
        const response = await mod.GET(new Request('http://localhost/api/display/widgets/weather?deviceId=device-1'));

        expect(response.status).toBe(400);
        expect(mocks.prisma.screen.findFirst).not.toHaveBeenCalled();
    });

    it('rejects invalid widget configuration', async () => {
        mocks.prisma.screen.findFirst.mockResolvedValueOnce({
            id: 'screen-1',
            status: 'ACTIVE',
            channel: {
                displayTemplate: {
                    zones: [{
                        widgetInstance: {
                            id: 'widget-1',
                            configurationJson: {city: 'A'},
                        },
                    }],
                },
            },
        });

        const mod = await import('@/app/api/display/widgets/weather/route');
        const response = await mod.GET(
            new Request('http://localhost/api/display/widgets/weather?deviceId=device-1&widgetId=widget-1'),
        );

        expect(response.status).toBe(400);
        expect(mocks.getWeather).not.toHaveBeenCalled();
    });
});
