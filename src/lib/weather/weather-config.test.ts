import { describe, expect, it } from 'vitest';

import { isValidWeatherCity, parseWeatherWidgetConfig } from '@/lib/weather/weather-config';

describe('weather widget config', () => {
    it('normalizes configuration values', () => {
        expect(parseWeatherWidgetConfig({})).toEqual({
            city: 'Paris',
            displayMode: 'compact',
            forecastDays: 3,
        });
        expect(parseWeatherWidgetConfig({city: ' Lyon ', displayMode: 'forecast', forecastDays: 12})).toEqual({
            city: 'Lyon',
            displayMode: 'forecast',
            forecastDays: 7,
        });
        expect(parseWeatherWidgetConfig({displayMode: 'invalid', forecastDays: 0})).toEqual({
            city: 'Paris',
            displayMode: 'compact',
            forecastDays: 1,
        });
    });

    it('validates city names conservatively', () => {
        expect(isValidWeatherCity('Paris')).toBe(true);
        expect(isValidWeatherCity('A')).toBe(false);
        expect(isValidWeatherCity(' '.repeat(4))).toBe(false);
    });
});
