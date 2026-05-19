import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClockWidget } from '@/components/screens/display-clock-widget';
import { buildDisplayWidgetInstance } from '@/test/fixtures/builders';

function buildClockWidget(configurationJson = {timezone: 'UTC', format: 'HH:mm'}) {
    return buildDisplayWidgetInstance({
        technicalKey: 'clock',
        configurationJson,
    });
}

describe('ClockWidget', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-09T10:15:30.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the current time using its timezone and format', () => {
        render(<ClockWidget widget={buildClockWidget()} />);

        const clock = screen.getByText('10:15');
        expect(clock).toBeInTheDocument();
        expect(clock).toHaveStyle({fontSize: 'min(80cqh, calc(90cqw / 3.3))'});
        expect(clock).toHaveClass('whitespace-nowrap');
    });

    it('updates every second when the format includes seconds', () => {
        render(
            <ClockWidget
                widget={buildClockWidget({timezone: 'UTC', format: 'HH:mm:ss'})}
            />,
        );

        expect(screen.getByText('10:15:30')).toBeInTheDocument();
        expect(screen.getByText('10:15:30')).toHaveStyle({fontSize: 'min(80cqh, calc(90cqw / 5.2))'});

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByText('10:15:31')).toBeInTheDocument();
    });

    it('uses dark text on a light zone background', () => {
        const {container} = render(
            <ClockWidget
                widget={buildClockWidget()}
                zoneConfiguration={{backgroundColor: '#ffffff'}}
            />,
        );

        expect(container.firstChild).toHaveClass('text-slate-950');
    });

    it('uses light text by default', () => {
        const {container} = render(<ClockWidget widget={buildClockWidget()} />);

        expect(container.firstChild).toHaveClass('text-white');
    });
});
