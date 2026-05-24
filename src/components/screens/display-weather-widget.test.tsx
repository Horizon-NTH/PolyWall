import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WeatherWidget } from '@/components/screens/display-weather-widget';
import { buildDisplayWidgetInstance } from '@/test/fixtures/builders';
import { type WeatherResult } from '@/lib/weather/weather-types';

function buildWeatherWidget(configurationJson = {city: 'Dijon', displayMode: 'current', forecastDays: 3}) {
    return buildDisplayWidgetInstance({
        id: 'weather-widget-1',
        technicalKey: 'weather',
        refreshPeriodSeconds: 300,
        configurationJson,
    });
}

async function flushInitialFetch() {
    await act(async () => {
        vi.advanceTimersByTime(0);
        await Promise.resolve();
    });
}

const weatherResult: WeatherResult = {
    locationName: 'Dijon',
    country: 'France',
    timezone: 'Europe/Paris',
    fetchedAt: '2026-05-24T10:00:00.000Z',
    current: {
        temperature: 22,
        apparentTemperature: 21,
        humidity: 55,
        windSpeed: 12,
        weatherCode: 1,
        label: 'Partiellement nuageux',
        icon: 'partly-cloudy-day',
    },
    daily: [{
        date: '2026-05-24',
        minTemperature: 12,
        maxTemperature: 24,
        weatherCode: 1,
        label: 'Partiellement nuageux',
        icon: 'partly-cloudy-day',
    }],
};

describe('WeatherWidget', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('shows a pairing placeholder without a device id', () => {
        render(<WeatherWidget widget={buildWeatherWidget()} />);

        expect(screen.getByText('Météo')).toBeInTheDocument();
        expect(screen.getByText('Données disponibles uniquement sur un écran appairé.')).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('loads and displays current weather', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => weatherResult,
        } as Response);

        render(<WeatherWidget widget={buildWeatherWidget()} deviceId="device-1" />);
        await flushInitialFetch();

        expect(screen.getByText('22°')).toBeInTheDocument();
        expect(screen.getByText('Dijon')).toBeInTheDocument();
        expect(screen.getByText('Partiellement nuageux')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            '/api/display/widgets/weather?deviceId=device-1&widgetId=weather-widget-1',
            expect.objectContaining({cache: 'no-store', signal: expect.any(AbortSignal)}),
        );
    });

    it('shows forecast days in forecast mode', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => weatherResult,
        } as Response);

        render(
            <WeatherWidget
                widget={buildWeatherWidget({city: 'Dijon', displayMode: 'forecast', forecastDays: 1})}
                deviceId="device-1"
            />,
        );
        await flushInitialFetch();

        expect(screen.getByText('24°')).toBeInTheDocument();
        expect(screen.getByText('12°')).toBeInTheDocument();
    });

    it('shows an error fallback when the request fails', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({ok: false} as Response);

        render(<WeatherWidget widget={buildWeatherWidget()} deviceId="device-1" />);
        await flushInitialFetch();

        expect(screen.getByText('Météo indisponible.')).toBeInTheDocument();
    });
});
