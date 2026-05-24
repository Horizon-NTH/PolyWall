import 'server-only';

import { lookup } from 'node:dns/promises';

import ipaddr from 'ipaddr.js';
import Parser from 'rss-parser';

import { type RssWidgetConfig } from '@/lib/rss/rss-config';
import { type RssFeedResult } from '@/lib/rss/rss-types';

const MAX_FEED_BYTES = 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 5 * 60 * 1000;

const parser = new Parser();
const feedCache = new Map<string, { expiresAt: number; result: RssFeedResult }>();

function assertSupportedFeedUrl(url: URL) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported RSS URL protocol');
    }

    if (url.username || url.password) {
        throw new Error('RSS URL credentials are not allowed');
    }
}

function isPublicIpAddress(address: string) {
    if (!ipaddr.isValid(address)) return false;

    const parsed = ipaddr.parse(address);
    return parsed.range() === 'unicast';
}

async function assertPublicHostname(url: URL) {
    assertSupportedFeedUrl(url);

    if (ipaddr.isValid(url.hostname)) {
        if (!isPublicIpAddress(url.hostname)) {
            throw new Error('Private RSS URL is not allowed');
        }
        return;
    }

    const addresses = await lookup(url.hostname, {all: true, verbatim: true});
    if (addresses.length === 0) throw new Error('RSS hostname cannot be resolved');

    if (addresses.some(({address}) => !isPublicIpAddress(address))) {
        throw new Error('Private RSS hostname is not allowed');
    }
}

function normalizeFeedUrl(source: string) {
    const url = new URL(source);
    assertSupportedFeedUrl(url);
    return url;
}

async function readLimitedResponse(response: Response) {
    if (!response.body) return '';

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesRead = 0;

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        if (!value) continue;

        bytesRead += value.byteLength;
        if (bytesRead > MAX_FEED_BYTES) {
            await reader.cancel();
            throw new Error('RSS feed is too large');
        }
        chunks.push(value);
    }

    return new TextDecoder().decode(Buffer.concat(chunks));
}

async function fetchFeedXml(url: URL, redirectCount = 0): Promise<string> {
    await assertPublicHostname(url);

    const response = await fetch(url, {
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
            accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
            'user-agent': 'PolyWall RSS Widget',
        },
    });

    if (response.status >= 300 && response.status < 400) {
        if (redirectCount >= MAX_REDIRECTS) throw new Error('Too many RSS redirects');

        const location = response.headers.get('location');
        if (!location) throw new Error('RSS redirect missing location');

        return fetchFeedXml(new URL(location, url), redirectCount + 1);
    }

    if (!response.ok) {
        throw new Error(`RSS feed request failed with status ${response.status}`);
    }

    return readLimitedResponse(response);
}

function stripHtml(value: string) {
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getItemSummary(item: Parser.Item) {
    const summary = item.contentSnippet || item.summary || item.content || '';
    const cleaned = stripHtml(summary);
    return cleaned.length > 280 ? `${cleaned.slice(0, 277).trim()}...` : cleaned || null;
}

export async function getRssFeed(config: RssWidgetConfig): Promise<RssFeedResult> {
    const sourceUrl = normalizeFeedUrl(config.source);
    const cacheKey = `${sourceUrl.toString()}::${config.maxItems}`;
    const cached = feedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const xml = await fetchFeedXml(sourceUrl);
    const feed = await parser.parseString(xml);
    const result: RssFeedResult = {
        title: feed.title?.trim() || null,
        fetchedAt: new Date().toISOString(),
        items: feed.items.slice(0, config.maxItems).map((item) => ({
            title: item.title?.trim() || 'Sans titre',
            link: item.link?.trim() || null,
            date: item.isoDate || item.pubDate || null,
            summary: getItemSummary(item),
        })),
    };

    feedCache.set(cacheKey, {expiresAt: Date.now() + CACHE_TTL_MS, result});
    return result;
}
