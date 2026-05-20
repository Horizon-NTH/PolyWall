import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RssWidget } from '@/components/screens/display-rss-widget';
import { buildDisplayWidgetInstance } from '@/test/fixtures/builders';
import { type RssFeedResult } from '@/lib/rss/rss-types';

function buildRssWidget(configurationJson = {source: 'https://example.com/feed.xml', maxItems: 2}) {
    return buildDisplayWidgetInstance({
        id: 'rss-widget-1',
        technicalKey: 'rss',
        refreshPeriodSeconds: 300,
        configurationJson,
    });
}

async function flushInitialFetch() {
    await act(async () => {
        vi.advanceTimersByTime(0);
        await Promise.resolve();
    });
}

const rssResult: RssFeedResult = {
    title: 'Actualités test',
    fetchedAt: '2026-05-19T10:00:00.000Z',
    items: [
        {
            title: 'Premier article',
            link: 'https://example.com/news/1',
            date: '2026-05-19T10:00:00.000Z',
            summary: 'Résumé court.',
        },
    ],
};

describe('RssWidget', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-19T10:15:30.000Z'));
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('shows a pairing placeholder without a device id', () => {
        render(<RssWidget widget={buildRssWidget()} />);

        expect(screen.getByText('Flux RSS')).toBeInTheDocument();
        expect(screen.getByText('Données disponibles uniquement sur un écran appairé.')).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('shows a configuration placeholder without a source', () => {
        render(<RssWidget widget={buildRssWidget({source: '', maxItems: 2})} deviceId="device-1" />);

        expect(screen.getByText('URL du flux à configurer.')).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('loads and displays RSS items', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => rssResult,
        } as Response);

        render(<RssWidget widget={buildRssWidget()} deviceId="device-1" />);
        await flushInitialFetch();

        expect(screen.getByText('Premier article')).toBeInTheDocument();
        expect(screen.getByText('Résumé court.')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            '/api/display/widgets/rss?deviceId=device-1&widgetId=rss-widget-1',
            expect.objectContaining({cache: 'no-store', signal: expect.any(AbortSignal)}),
        );
    });

    it('adapts text colors to a light zone background', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => rssResult,
        } as Response);

        render(
            <RssWidget
                widget={buildRssWidget()}
                deviceId="device-1"
                zoneConfiguration={{backgroundColor: '#ffffff'}}
            />,
        );
        await flushInitialFetch();

        expect(screen.getByText('Premier article')).toHaveClass('text-slate-950');
    });

    it('shows an error fallback when the request fails', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({ok: false} as Response);

        render(<RssWidget widget={buildRssWidget()} deviceId="device-1" />);
        await flushInitialFetch();

        expect(screen.getByText('Flux RSS indisponible.')).toBeInTheDocument();
    });
});
