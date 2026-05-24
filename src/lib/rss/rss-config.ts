import { getNumberConfig, getStringConfig } from '@/lib/config/json-config';

export type RssWidgetConfig = {
    source: string;
    maxItems: number;
};

export function parseRssWidgetConfig(configurationJson: Record<string, unknown>): RssWidgetConfig {
    return {
        source: getStringConfig(configurationJson, 'source').trim(),
        maxItems: Math.min(Math.max(Math.trunc(getNumberConfig(configurationJson, 'maxItems', 5)), 1), 20),
    };
}

export function isValidRssSource(source: string) {
    try {
        const url = new URL(source);
        return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
    } catch {
        return false;
    }
}
