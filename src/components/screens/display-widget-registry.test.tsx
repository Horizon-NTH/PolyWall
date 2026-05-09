import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DisplayWidget } from '@/components/screens/display-widget-registry';
import { type DisplayWidgetInstance } from '@/lib/display-runtime/types';

function buildWidget(params: Partial<DisplayWidgetInstance> = {}): DisplayWidgetInstance {
    return {
        id: 'widget-1',
        technicalKey: 'clock',
        active: true,
        refreshPeriodSeconds: 30,
        configurationJson: {timezone: 'UTC', format: 'HH:mm'},
        ...params,
    };
}

describe('DisplayWidget', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-09T10:15:30.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders a clock widget using its timezone and format', () => {
        render(<DisplayWidget widget={buildWidget()} />);

        expect(screen.getByText('10:15')).toBeInTheDocument();
    });

    it('updates the clock every second', () => {
        render(
            <DisplayWidget
                widget={buildWidget({
                    configurationJson: {timezone: 'UTC', format: 'HH:mm:ss'},
                })}
            />,
        );

        expect(screen.getByText('10:15:30')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByText('10:15:31')).toBeInTheDocument();
    });

    it('renders placeholders for supported dynamic widgets', () => {
        render(<DisplayWidget widget={buildWidget({technicalKey: 'weather'})} />);

        expect(screen.getByText('Météo')).toBeInTheDocument();
        expect(screen.getByText('Source dynamique à connecter')).toBeInTheDocument();
    });

    it('renders a fallback for unknown widgets', () => {
        render(<DisplayWidget widget={buildWidget({technicalKey: 'custom-widget'})} />);

        expect(screen.getByText('Widget')).toBeInTheDocument();
        expect(screen.getByText('Widget inconnu: custom-widget')).toBeInTheDocument();
    });
});
