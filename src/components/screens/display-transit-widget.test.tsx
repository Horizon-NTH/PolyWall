import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TransitWidget } from '@/components/screens/display-transit-widget';
import {
    buildDisplayWidgetInstance,
    buildTransitDeparture,
    buildTransitDeparturesResult,
} from '@/test/fixtures/builders';

function buildTransitWidget() {
    return buildDisplayWidgetInstance({
        technicalKey: 'transit',
        configurationJson: {layoutDirection: 'row'},
    });
}

async function flushInitialFetch() {
    await act(async () => {
        vi.advanceTimersByTime(0);
        await Promise.resolve();
    });
}

describe('TransitWidget', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-09T10:15:30.000Z'));
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('shows a pairing placeholder without a device id', () => {
        render(<TransitWidget widget={buildTransitWidget()} />);

        expect(screen.getByText('Transports')).toBeInTheDocument();
        expect(screen.getByText('Données disponibles uniquement sur un écran appairé.')).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('loads and groups transport departures by stop, line and destination', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => buildTransitDeparturesResult(),
        } as Response);

        render(<TransitWidget widget={buildTransitWidget()} deviceId="device-1" />);
        await flushInitialFetch();

        expect(screen.queryByText('Réseau test')).not.toBeInTheDocument();
        expect(screen.getByText('DIJON Gare')).toBeInTheDocument();
        expect(screen.getByText('Université')).toBeInTheDocument();
        expect(screen.getByText('4 min')).toBeInTheDocument();
        expect(screen.getByText('11 min')).toBeInTheDocument();
        expect(screen.getAllByText('T 1')).toHaveLength(1);
        expect(fetch).toHaveBeenCalledWith(
            '/api/display/widgets/transit?deviceId=device-1&widgetId=widget-1',
            expect.objectContaining({cache: 'no-store', signal: expect.any(AbortSignal)}),
        );
    });

    it('adapts text colors to a light zone background', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => buildTransitDeparturesResult({
                departures: [buildTransitDeparture()],
            }),
        } as Response);

        render(
            <TransitWidget
                widget={buildTransitWidget()}
                deviceId="device-1"
                zoneConfiguration={{backgroundColor: '#ffffff'}}
            />,
        );
        await flushInitialFetch();

        expect(screen.getByText('DIJON Gare')).toHaveClass('text-slate-950');
        expect(screen.getByText('4 min')).toHaveClass('text-slate-950');
    });

    it('shows an empty state when there are no upcoming departures', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => buildTransitDeparturesResult({departures: []}),
        } as Response);

        render(<TransitWidget widget={buildTransitWidget()} deviceId="device-1" />);
        await flushInitialFetch();

        expect(screen.getByText('Aucun passage imminent.')).toBeInTheDocument();
    });

    it('shows an error fallback when the request fails', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({ok: false} as Response);

        render(<TransitWidget widget={buildTransitWidget()} deviceId="device-1" />);
        await flushInitialFetch();

        expect(screen.getByText('Horaires indisponibles.')).toBeInTheDocument();
    });
});
