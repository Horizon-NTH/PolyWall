import { describe, expect, it } from 'vitest';

import { isValidRssSource, parseRssWidgetConfig } from '@/lib/rss/rss-config';

describe('rss widget config', () => {
    it('normalizes defaults and bounds max items', () => {
        expect(parseRssWidgetConfig({})).toEqual({source: '', maxItems: 5});
        expect(parseRssWidgetConfig({source: ' https://example.com/feed.xml ', maxItems: 0})).toEqual({
            source: 'https://example.com/feed.xml',
            maxItems: 1,
        });
        expect(parseRssWidgetConfig({maxItems: 42}).maxItems).toBe(20);
    });

    it('accepts only plain http and https URLs', () => {
        expect(isValidRssSource('https://example.com/feed.xml')).toBe(true);
        expect(isValidRssSource('http://example.com/feed.xml')).toBe(true);
        expect(isValidRssSource('ftp://example.com/feed.xml')).toBe(false);
        expect(isValidRssSource('https://user:pass@example.com/feed.xml')).toBe(false);
        expect(isValidRssSource('not a url')).toBe(false);
    });
});
