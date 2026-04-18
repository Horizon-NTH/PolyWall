'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { type CalendarEvent, viewWeek } from '@schedule-x/calendar';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';

import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { type ScheduleViewModel, createCalendarEventsForRange } from '@/lib/schedules/schedule-view-model';

type SchedulesCalendarProps = {
    schedules: ScheduleViewModel[];
    returnTo?: string;
};

type CalendarAppInternals = {
    $app?: {
        calendarState?: {
            range?: {
                value: {
                    start: {
                        constructor: {
                            from: (value: string) => CalendarEvent['start'];
                        };
                    };
                } | null;
            };
        };
    };
};

const timezone = 'Europe/Paris';

export function SchedulesCalendar({schedules, returnTo}: SchedulesCalendarProps) {
    const router = useRouter();
    const currentReturnTo = returnTo ?? useCurrentReturnTo();
    const currentReturnToRef = useRef(currentReturnTo);

    useEffect(() => {
        currentReturnToRef.current = currentReturnTo;
    }, [currentReturnTo]);

    const calendarApp = useCalendarApp({
        locale: 'fr-FR',
        isDark: false,
        views: [viewWeek],
        defaultView: 'week',
        firstDayOfWeek: 1,
        dayBoundaries: {
            start: '07:00',
            end: '23:00',
        },
        calendars: {
            recurring: {
                colorName: 'recurring',
                lightColors: {
                    main: '#0f766e',
                    container: '#ccfbf1',
                    onContainer: '#134e4a',
                },
            },
            event: {
                colorName: 'event',
                lightColors: {
                    main: '#1d4ed8',
                    container: '#dbeafe',
                    onContainer: '#1e3a8a',
                },
            },
        },
        weekOptions: {
            gridHeight: 820,
            nDays: 7,
            eventWidth: 100,
            timeAxisFormatOptions: {hour: '2-digit', minute: '2-digit'},
            eventOverlap: true,
            gridStep: 60,
        },
        events: [],
        callbacks: {
            onEventClick: (event: CalendarEvent & { scheduleId?: string }) => {
                if (event.scheduleId) {
                    router.push(appendReturnTo(`/dashboard/schedules/${event.scheduleId}`, currentReturnToRef.current));
                }
            },
        },
    });

    useEffect(() => {
        const appInternals = (calendarApp as CalendarAppInternals | null)?.$app;
        const range = appInternals?.calendarState?.range?.value;

        if (!calendarApp || !range) {
            return;
        }

        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const startKey = start.toISOString().slice(0, 10);
        const endKey = end.toISOString().slice(0, 10);
        const createZonedDateTime = range.start.constructor.from.bind(range.start.constructor);

        calendarApp.events.set(createCalendarEventsForRange({
            schedules,
            startDate: startKey,
            endDate: endKey,
            timezone,
            createZonedDateTime,
        }));
    }, [calendarApp, router, schedules]);

    return (
        <div className="overflow-hidden rounded-md border">
            <ScheduleXCalendar calendarApp={calendarApp} />
        </div>
    );
}
