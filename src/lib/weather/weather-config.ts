import { getNumberConfig, getStringConfig } from '@/lib/config/json-config';

export type WeatherDisplayMode = 'current' | 'forecast' | 'compact';

export type WeatherWidgetConfig = {
    city: string;
    displayMode: WeatherDisplayMode;
    forecastDays: number;
};

const DISPLAY_MODES: WeatherDisplayMode[] = ['current', 'forecast', 'compact'];

export function parseWeatherWidgetConfig(configurationJson: Record<string, unknown>): WeatherWidgetConfig {
    const displayMode = getStringConfig(configurationJson, 'displayMode', 'compact');

    return {
        city: getStringConfig(configurationJson, 'city', 'Paris').trim(),
        displayMode: DISPLAY_MODES.includes(displayMode as WeatherDisplayMode)
            ? displayMode as WeatherDisplayMode
            : 'compact',
        forecastDays: Math.min(Math.max(Math.trunc(getNumberConfig(configurationJson, 'forecastDays', 3)), 1), 7),
    };
}

export function isValidWeatherCity(city: string) {
    const value = city.trim();
    return value.length >= 2 && value.length <= 100;
}
