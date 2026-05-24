import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function buildJsonResponse(value: unknown) {
    return new Response(JSON.stringify(value), {
        status: 200,
        headers: {'content-type': 'application/json'},
    });
}

describe('weather service', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('geocodes the city and fetches current weather', async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(buildJsonResponse({
                results: [{
                    name: 'Dijon',
                    country: 'France',
                    latitude: 47.32,
                    longitude: 5.04,
                }],
            }))
            .mockResolvedValueOnce(buildJsonResponse({
                timezone: 'Europe/Paris',
                current: {
                    temperature_2m: 21.4,
                    apparent_temperature: 20.8,
                    relative_humidity_2m: 58,
                    wind_speed_10m: 12.3,
                    weather_code: 1,
                    is_day: 1,
                },
                daily: {
                    time: ['2026-05-24'],
                    weather_code: [1],
                    temperature_2m_max: [23.2],
                    temperature_2m_min: [11.7],
                },
            }));

        const {getWeather} = await import('@/lib/weather/weather-service');
        const result = await getWeather({city: 'Dijon', displayMode: 'current', forecastDays: 1});

        expect(result.locationName).toBe('Dijon');
        expect(result.current).toEqual(expect.objectContaining({
            temperature: 21,
            apparentTemperature: 21,
            humidity: 58,
            windSpeed: 12,
            label: 'Partiellement nuageux',
            icon: 'partly-cloudy-day',
        }));
        expect(result.daily[0]).toEqual(expect.objectContaining({
            date: '2026-05-24',
            minTemperature: 12,
            maxTemperature: 23,
        }));
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('fails when the city cannot be resolved', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(buildJsonResponse({results: []}));

        const {getWeather} = await import('@/lib/weather/weather-service');

        await expect(getWeather({city: 'Unknown weather city', displayMode: 'current', forecastDays: 1}))
            .rejects
            .toThrow('Weather location not found');
    });
});
