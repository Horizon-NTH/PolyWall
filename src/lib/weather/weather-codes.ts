export type WeatherIconKey =
    | 'clear-day'
    | 'clear-night'
    | 'partly-cloudy-day'
    | 'partly-cloudy-night'
    | 'cloudy'
    | 'fog'
    | 'drizzle'
    | 'rain'
    | 'snow'
    | 'thunderstorms';

type WeatherCodeInfo = {
    label: string;
    icon: WeatherIconKey;
};

export function getWeatherCodeInfo(code: number, isDay = true): WeatherCodeInfo {
    if (code === 0) {
        return {label: 'Ciel dégagé', icon: isDay ? 'clear-day' : 'clear-night'};
    }

    if (code === 1 || code === 2) {
        return {label: 'Partiellement nuageux', icon: isDay ? 'partly-cloudy-day' : 'partly-cloudy-night'};
    }

    if (code === 3) return {label: 'Couvert', icon: 'cloudy'};
    if (code === 45 || code === 48) return {label: 'Brouillard', icon: 'fog'};

    if ([51, 53, 55, 56, 57].includes(code)) {
        return {label: 'Bruine', icon: 'drizzle'};
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return {label: 'Pluie', icon: 'rain'};
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
        return {label: 'Neige', icon: 'snow'};
    }

    if ([95, 96, 99].includes(code)) {
        return {label: 'Orage', icon: 'thunderstorms'};
    }

    return {label: 'Météo variable', icon: 'cloudy'};
}
