import type * as React from 'react';

import { ZoneType } from '@/generated/prisma/enums';
import { getNumberConfig, getRequiredStringConfig } from '@/lib/config/json-config';

export const ZONE_SHADOW_OPTIONS = ['none', 'sm', 'md', 'lg'] as const;
export type ZoneShadow = typeof ZONE_SHADOW_OPTIONS[number];
const ZONE_APPEARANCE_STYLE_KEYS = new Set([
    'backgroundColor',
    'borderColor',
    'borderRadius',
    'padding',
    'borderWidth',
    'shadow',
    'opacity',
]);

export function getDefaultZonePadding(zoneType: ZoneType) {
    if (zoneType === ZoneType.STATIC) return 16;
    if (zoneType === ZoneType.WIDGET) return 12;
    return 0;
}

function getSafeNumberConfig(config: Record<string, unknown>, key: string, fallback: number) {
    const value = getNumberConfig(config, key, fallback);
    return Number.isFinite(value) ? value : fallback;
}

export function getZoneOpacity(config: Record<string, unknown>) {
    const opacity = getSafeNumberConfig(config, 'opacity', 1);
    return Math.min(1, Math.max(0, opacity));
}

export function getZoneShadow(config: Record<string, unknown>): ZoneShadow {
    const shadow = getRequiredStringConfig(config, 'shadow', 'none');
    return ZONE_SHADOW_OPTIONS.includes(shadow as ZoneShadow) ? shadow as ZoneShadow : 'none';
}

export function getZoneBoxShadow(config: Record<string, unknown>) {
    switch (getZoneShadow(config)) {
        case 'sm':
            return '0 8px 18px rgb(0 0 0 / 0.20)';
        case 'md':
            return '0 16px 36px rgb(0 0 0 / 0.28)';
        case 'lg':
            return '0 28px 70px rgb(0 0 0 / 0.36)';
        default:
            return undefined;
    }
}

export function getZoneAppearanceStyle(
    config: Record<string, unknown>,
    zoneType: ZoneType,
): React.CSSProperties {
    const borderWidth = Math.max(0, getSafeNumberConfig(config, 'borderWidth', 0));
    const borderColor = getRequiredStringConfig(config, 'borderColor', 'rgb(255 255 255 / 0.20)');
    const borderRadius = Math.max(0, getSafeNumberConfig(config, 'borderRadius', 0));

    return {
        backgroundColor: getRequiredStringConfig(config, 'backgroundColor', 'transparent'),
        borderColor,
        borderRadius,
        borderStyle: borderWidth > 0 ? 'solid' : undefined,
        borderWidth,
        boxShadow: getZoneBoxShadow(config),
        opacity: getZoneOpacity(config),
        padding: Math.max(0, getSafeNumberConfig(config, 'padding', getDefaultZonePadding(zoneType))),
    };
}

export function getZonePreviewAppearanceStyle(
    config: Record<string, unknown>,
    zoneType: ZoneType,
): React.CSSProperties {
    const style = getZoneAppearanceStyle(config, zoneType);

    return {
        ...style,
        backgroundColor: typeof config.backgroundColor === 'string' && config.backgroundColor.trim().length > 0
            ? style.backgroundColor
            : undefined,
        borderColor: typeof config.borderColor === 'string' && config.borderColor.trim().length > 0
            ? style.borderColor
            : undefined,
        borderWidth: typeof config.borderWidth === 'number' ? style.borderWidth : undefined,
        padding: typeof config.padding === 'number' ? style.padding : undefined,
    };
}

export function removeZoneAppearanceStyleConfig(config: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(config).filter(([key]) => !ZONE_APPEARANCE_STYLE_KEYS.has(key)),
    );
}
