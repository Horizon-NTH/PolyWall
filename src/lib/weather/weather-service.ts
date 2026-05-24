import 'server-only';

import { type WeatherWidgetConfig } from '@/lib/weather/weather-config';
import { getWeatherCodeInfo } from '@/lib/weather/weather-codes';
import { type WeatherResult } from '@/lib/weather/weather-types';

const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000;

const weatherCache = new Map<string, { expiresAt: number; result: WeatherResult }>();

type GeocodingResponse = {
    results?: Array<{
        name?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    }>;
};

type ForecastResponse = {
    timezone?: string;
    current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
        is_day?: number;
    };
    daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
    };
};

async function fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
            accept: 'application/json',
            'user-agent': 'PolyWall Weather Widget',
        },
    });

    if (!response.ok) {
        throw new Error(`Weather request failed with status ${response.status}`);
    }

    return await response.json() as Promise<T>;
}

async function geocodeCity(city: string) {
    const url = new URL(OPEN_METEO_GEOCODING_URL);
    url.searchParams.set('name', city);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'fr');
    url.searchParams.set('format', 'json');

    const result = await fetchJson<GeocodingResponse>(url);
    const location = result.results?.[0];
    if (!location?.name || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('Weather location not found');
    }

    return {
        name: location.name,
        country: location.country ?? null,
        latitude: location.latitude,
        longitude: location.longitude,
    };
}

function toNumber(value: unknown, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function buildDailyForecast(daily: ForecastResponse['daily'] = {}) {
    const dates = daily.time ?? [];
    const codes = daily.weather_code ?? [];
    const maxTemperatures = daily.temperature_2m_max ?? [];
    const minTemperatures = daily.temperature_2m_min ?? [];

    return dates.map((date, index) => {
        const weatherCode = Math.trunc(toNumber(codes[index]));
        const codeInfo = getWeatherCodeInfo(weatherCode);

        return {
            date,
            minTemperature: Math.round(toNumber(minTemperatures[index])),
            maxTemperature: Math.round(toNumber(maxTemperatures[index])),
            weatherCode,
            label: codeInfo.label,
            icon: codeInfo.icon,
        };
    });
}

async function fetchWeather(config: WeatherWidgetConfig): Promise<WeatherResult> {
    const location = await geocodeCity(config.city);
    const url = new URL(OPEN_METEO_FORECAST_URL);
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set('current', [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'wind_speed_10m',
        'weather_code',
        'is_day',
    ].join(','));
    url.searchParams.set('daily', [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
    ].join(','));
    url.searchParams.set('forecast_days', String(config.forecastDays));
    url.searchParams.set('timezone', 'auto');

    const forecast = await fetchJson<ForecastResponse>(url);
    const current = forecast.current;
    if (!current) throw new Error('Weather forecast is missing current data');

    const weatherCode = Math.trunc(toNumber(current.weather_code));
    const codeInfo = getWeatherCodeInfo(weatherCode, current.is_day !== 0);

    return {
        locationName: location.name,
        country: location.country,
        timezone: forecast.timezone ?? null,
        fetchedAt: new Date().toISOString(),
        current: {
            temperature: Math.round(toNumber(current.temperature_2m)),
            apparentTemperature: Math.round(toNumber(current.apparent_temperature)),
            humidity: Math.round(toNumber(current.relative_humidity_2m)),
            windSpeed: Math.round(toNumber(current.wind_speed_10m)),
            weatherCode,
            label: codeInfo.label,
            icon: codeInfo.icon,
        },
        daily: buildDailyForecast(forecast.daily),
    };
}

export async function getWeather(config: WeatherWidgetConfig): Promise<WeatherResult> {
    const cacheKey = `${config.city.toLowerCase()}::${config.displayMode}::${config.forecastDays}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const result = await fetchWeather(config);
    weatherCache.set(cacheKey, {expiresAt: Date.now() + CACHE_TTL_MS, result});
    return result;
}
