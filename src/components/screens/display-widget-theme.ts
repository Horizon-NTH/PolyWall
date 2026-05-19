import { isLightColor } from '@/lib/display-runtime/color-contrast';

export type DisplayWidgetColorScheme = {
    textClassName: string;
    mutedTextClassName: string;
    separatorClassName: string;
    timeBadgeClassName: string;
};

const DARK_WIDGET_COLOR_SCHEME: DisplayWidgetColorScheme = {
    textClassName: 'text-white',
    mutedTextClassName: 'text-white/70',
    separatorClassName: 'bg-white/30',
    timeBadgeClassName: 'bg-black/35 text-white shadow-sm',
};

const LIGHT_WIDGET_COLOR_SCHEME: DisplayWidgetColorScheme = {
    textClassName: 'text-slate-950',
    mutedTextClassName: 'text-slate-950/65',
    separatorClassName: 'bg-slate-950/25',
    timeBadgeClassName: 'bg-slate-950/10 text-slate-950 shadow-sm',
};

function getBackgroundColor(zoneConfiguration?: Record<string, unknown>) {
    return typeof zoneConfiguration?.backgroundColor === 'string'
        ? zoneConfiguration.backgroundColor
        : '';
}

export function getDisplayWidgetColorScheme(zoneConfiguration?: Record<string, unknown>) {
    return isLightColor(getBackgroundColor(zoneConfiguration))
        ? LIGHT_WIDGET_COLOR_SCHEME
        : DARK_WIDGET_COLOR_SCHEME;
}
