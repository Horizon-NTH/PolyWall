import { lookup } from 'node:dns/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({
    default: {
        lookup: lookupMock,
    },
    lookup: lookupMock,
}));

const feedXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Actualités test</title>
    <item>
      <title>Premier article</title>
      <link>https://example.com/news/1</link>
      <description><![CDATA[<p>Résumé <strong>HTML</strong></p>]]></description>
      <pubDate>Tue, 19 May 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Deuxième article</title>
      <link>https://example.com/news/2</link>
    </item>
  </channel>
</rss>`;

describe('rss service', () => {
    beforeEach(() => {
        vi.mocked(lookup).mockResolvedValue([{address: '93.184.216.34', family: 4}] as never);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(feedXml, {status: 200})));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('fetches, parses and sanitizes feed items', async () => {
        const {getRssFeed} = await import('@/lib/rss/rss-service');

        const result = await getRssFeed({source: 'https://example.com/feed.xml', maxItems: 1});

        expect(result.title).toBe('Actualités test');
        expect(result.items).toEqual([
            expect.objectContaining({
                title: 'Premier article',
                link: 'https://example.com/news/1',
                summary: 'Résumé HTML',
            }),
        ]);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('blocks private resolved addresses before fetching', async () => {
        vi.mocked(lookup).mockResolvedValueOnce([{address: '127.0.0.1', family: 4}] as never);
        const {getRssFeed} = await import('@/lib/rss/rss-service');

        await expect(getRssFeed({source: 'https://example.com/feed.xml', maxItems: 5}))
            .rejects
            .toThrow('Private RSS hostname is not allowed');
        expect(fetch).not.toHaveBeenCalled();
    });
});
