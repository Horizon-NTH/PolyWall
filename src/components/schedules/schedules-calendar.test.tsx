import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScheduleType } from '@/generated/prisma/enums';
import { SchedulesCalendar } from '@/components/schedules/schedules-calendar';

const createCalendarEventsForRangeMock = vi.fn(() => []);

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/hooks/use-current-return-to', () => ({
    useCurrentReturnTo: () => '/dashboard/schedules',
}));

vi.mock('@/lib/schedules/schedule-view-model', () => ({
    createCalendarEventsForRange: (...args: unknown[]) => createCalendarEventsForRangeMock(...args),
}));

vi.mock('@schedule-x/calendar', () => ({
    viewWeek: 'week',
}));

vi.mock('@schedule-x/react', () => ({
    useCalendarApp: (config: Record<string, unknown>) => config,
    ScheduleXCalendar: ({calendarApp}: { calendarApp: Record<string, unknown> }) => (
        <div>
            <button
                type="button"
                onClick={() => {
                    const callbacks = calendarApp.callbacks as {
                        onRangeUpdate: (range: { start: { year: number; month: number; day: number }; end: { year: number; month: number; day: number } }) => void;
                        onEventClick: (event: { scheduleId: string }, uiEvent?: { clientX: number; clientY: number }) => void;
                        fetchEvents: (range: { start: { year: number; month: number; day: number }; end: { year: number; month: number; day: number } }) => Promise<unknown[]>;
                    };

                    callbacks.onRangeUpdate({
                        start: {year: 2026, month: 4, day: 20},
                        end: {year: 2026, month: 4, day: 26},
                    });
                }}
            >
                Simuler range
            </button>
            <button
                type="button"
                onClick={() => {
                    const callbacks = calendarApp.callbacks as {
                        onEventClick: (event: { scheduleId: string }, uiEvent?: { clientX: number; clientY: number }) => void;
                    };
                    callbacks.onEventClick({scheduleId: 'schedule-1'}, {clientX: 100, clientY: 120});
                }}
            >
                Simuler clic event
            </button>
            <button
                type="button"
                onClick={async () => {
                    const callbacks = calendarApp.callbacks as {
                        fetchEvents: (range: { start: { year: number; month: number; day: number }; end: { year: number; month: number; day: number } }) => Promise<unknown[]>;
                    };
                    await callbacks.fetchEvents({
                        start: {year: 2026, month: 4, day: 20},
                        end: {year: 2026, month: 4, day: 26},
                    });
                }}
            >
                Simuler fetch
            </button>
        </div>
    ),
}));

describe('SchedulesCalendar', () => {
    it('updates visible range and opens schedule details from event click', async () => {
        render(
            <SchedulesCalendar
                schedules={[{
                    id: 'schedule-1',
                    type: ScheduleType.EVENT,
                    active: true,
                    playlistId: 'playlist-1',
                    playlistName: 'Actus',
                    channelId: 'channel-1',
                    channelName: 'Hall',
                    startDate: '2026-04-20T00:00:00.000Z',
                    endDate: '2026-04-20T00:00:00.000Z',
                    daysLabel: 'Lun',
                    dateLabel: '20 avr. 2026',
                    timeLabel: '09:00 - 10:00',
                    lifecycleStatus: 'ongoing',
                    updatedAt: '2026-04-01T10:00:00.000Z',
                    createdAt: '2026-04-01T09:00:00.000Z',
                    slots: [],
                }]}
            />,
        );

        expect(screen.getByText('Semaine de diffusion')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Simuler range'}));
        expect(await screen.findByText(/Semaine du/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Simuler clic event'}));

        expect(await screen.findByText('Actus')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toHaveTextContent('Événementielle');
        expect(screen.getByRole('link', {name: 'Voir la programmation'})).toHaveAttribute(
            'href',
            '/dashboard/schedules/schedule-1?returnTo=%2Fdashboard%2Fschedules',
        );
    });

    it('delegates event fetching to createCalendarEventsForRange', async () => {
        createCalendarEventsForRangeMock.mockReset();
        createCalendarEventsForRangeMock.mockReturnValueOnce([]);

        render(<SchedulesCalendar schedules={[]} />);

        fireEvent.click(screen.getByRole('button', {name: 'Simuler fetch'}));

        await waitFor(() => {
            expect(createCalendarEventsForRangeMock).toHaveBeenCalledWith(expect.objectContaining({
                schedules: [],
                startDate: '2026-04-20',
                endDate: '2026-04-26',
                timezone: 'Europe/Paris',
                createZonedDateTime: expect.any(Function),
            }));
        });
    });
});
