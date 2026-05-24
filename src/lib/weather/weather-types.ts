import { type WeatherIconKey } from '@/lib/weather/weather-codes';

export type WeatherCurrent = {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    label: string;
    icon: WeatherIconKey;
};

export type WeatherDailyForecast = {
    date: string;
    minTemperature: number;
    maxTemperature: number;
    weatherCode: number;
    label: string;
    icon: WeatherIconKey;
};

export type WeatherResult = {
    locationName: string;
    country: string | null;
    timezone: string | null;
    fetchedAt: string;
    current: WeatherCurrent;
    daily: WeatherDailyForecast[];
};
