import { getNumberConfig, getStringConfig } from '@/lib/config/json-config';
import { type TransitWidgetConfig } from '@/lib/transit/transit-types';

function parseStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
}

export function parseTransitWidgetConfig(configurationJson: Record<string, unknown>): TransitWidgetConfig {
    return {
        providerId: getStringConfig(configurationJson, 'providerId'),
        stopIds: parseStringArray(configurationJson.stopIds),
        routeIds: parseStringArray(configurationJson.routeIds),
        destinations: parseStringArray(configurationJson.destinations),
        maxDeparturesPerLine: Math.min(
            Math.max(Math.trunc(getNumberConfig(configurationJson, 'maxDeparturesPerLine', 2)), 1),
            5,
        ),
        layoutDirection: getStringConfig(configurationJson, 'layoutDirection', 'row') === 'column' ? 'column' : 'row',
    };
}
