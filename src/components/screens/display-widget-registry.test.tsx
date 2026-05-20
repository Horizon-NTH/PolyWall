import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DisplayWidget } from '@/components/screens/display-widget-registry';
import { buildDisplayWidgetInstance } from '@/test/fixtures/builders';

describe('DisplayWidget', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-09T10:15:30.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('routes supported widget keys to their component', () => {
        render(<DisplayWidget widget={buildDisplayWidgetInstance({
            technicalKey: 'clock',
            configurationJson: {timezone: 'UTC', format: 'HH:mm'},
        })} />);

        expect(screen.getByText('10:15')).toBeInTheDocument();
    });

    it('renders placeholders for supported dynamic widgets without an implementation yet', () => {
        render(<DisplayWidget widget={buildDisplayWidgetInstance({technicalKey: 'weather'})} />);

        expect(screen.getByText('Météo')).toBeInTheDocument();
        expect(screen.getByText('Source dynamique à connecter')).toBeInTheDocument();
    });

    it('routes RSS widgets to the RSS component', () => {
        render(<DisplayWidget widget={buildDisplayWidgetInstance({
            technicalKey: 'rss',
            configurationJson: {source: '', maxItems: 5},
        })} deviceId="device-1" />);

        expect(screen.getByText('URL du flux à configurer.')).toBeInTheDocument();
    });

    it('renders a fallback for unknown widgets', () => {
        render(<DisplayWidget widget={buildDisplayWidgetInstance({technicalKey: 'custom-widget'})} />);

        expect(screen.getByText('Widget')).toBeInTheDocument();
        expect(screen.getByText('Widget inconnu: custom-widget')).toBeInTheDocument();
    });
});
