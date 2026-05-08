const WIDGET_CATALOG = {
    clock: {
        label: 'Horloge',
        description: 'Affiche l\'heure',
        defaultRefreshPeriodSeconds: 30,
        defaultConfiguration: {timezone: 'Europe/Paris', format: 'HH:mm'},
    },
    weather: {
        label: 'Météo',
        description: 'Affiche la météo (dev/mock)',
        defaultRefreshPeriodSeconds: 300,
        defaultConfiguration: {source: 'Dijon', maxItems: 1},
    },
    rss: {
        label: 'Flux RSS',
        description: 'Affiche un flux RSS (dev/mock)',
        defaultRefreshPeriodSeconds: 300,
        defaultConfiguration: {source: '', maxItems: 5},
    },
    'tram-times': {
        label: 'Transports',
        description: 'Affiche des prochains passages (dev/mock)',
        defaultRefreshPeriodSeconds: 300,
        defaultConfiguration: {source: '', maxItems: 3},
    },
} as const satisfies Record<string, {
    label: string;
    description: string;
    defaultRefreshPeriodSeconds: number;
    defaultConfiguration: Record<string, unknown>;
}>;

export type SupportedWidgetKey = keyof typeof WIDGET_CATALOG;

export const SUPPORTED_WIDGET_KEYS = Object.keys(WIDGET_CATALOG) as SupportedWidgetKey[];

export const SUPPORTED_WIDGET_TYPE_DEFINITIONS = SUPPORTED_WIDGET_KEYS.map((technicalKey) => ({
    technicalKey,
    name: WIDGET_CATALOG[technicalKey].label,
    description: WIDGET_CATALOG[technicalKey].description,
}));

export function isSupportedWidgetKey(value: string): value is SupportedWidgetKey {
    return value in WIDGET_CATALOG;
}

export function getWidgetLabel(technicalKey: string) {
    return isSupportedWidgetKey(technicalKey)
        ? WIDGET_CATALOG[technicalKey].label
        : 'Widget';
}

export function getDefaultWidgetRefreshPeriodSeconds(technicalKey: string) {
    return isSupportedWidgetKey(technicalKey)
        ? WIDGET_CATALOG[technicalKey].defaultRefreshPeriodSeconds
        : 300;
}

export function getDefaultWidgetConfiguration(technicalKey: string): Record<string, unknown> {
    return isSupportedWidgetKey(technicalKey)
        ? {...WIDGET_CATALOG[technicalKey].defaultConfiguration}
        : {};
}
