'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { type CalendarEvent, viewWeek } from '@schedule-x/calendar';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import { Temporal } from 'temporal-polyfill';

import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { createCalendarEventsForRange, type ScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
} from '@/components/ui/popover';
import { SCHEDULE_TYPE_LABELS } from '@/lib/schedules/schedule-utils';

type SchedulesCalendarProps = {
    schedules: ScheduleViewModel[];
    returnTo?: string;
};

type CalendarRangeDate = {
    year: number;
    month: number;
    day: number;
};

type CalendarRange = {
    start: CalendarRangeDate;
    end: CalendarRangeDate;
};

const timezone = 'Europe/Paris';
const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
});

function toDateKey(value: CalendarRangeDate) {
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function formatRangeLabel(range: CalendarRange | null) {
    if (!range) {
        return 'Semaine de diffusion';
    }

    const start = new Date(range.start.year, range.start.month - 1, range.start.day);
    const end = new Date(range.end.year, range.end.month - 1, range.end.day);
    return `Semaine du ${dayMonthFormatter.format(start)} au ${dayMonthFormatter.format(end)}`;
}

export function SchedulesCalendar({schedules, returnTo}: SchedulesCalendarProps) {
    const currentReturnTo = returnTo ?? useCurrentReturnTo();
    const schedulesRef = useRef(schedules);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [visibleRange, setVisibleRange] = useState<CalendarRange | null>(null);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [anchorPosition, setAnchorPosition] = useState<{ x: number; y: number } | null>(null);
    const rangeLabel = useMemo(() => formatRangeLabel(visibleRange), [visibleRange]);
    const schedulesById = useMemo(
        () => new Map(schedules.map((schedule) => [schedule.id, schedule])),
        [schedules],
    );
    const selectedSchedule = selectedScheduleId ? schedulesById.get(selectedScheduleId) ?? null : null;

    useEffect(() => {
        schedulesRef.current = schedules;
    }, [schedules]);

    const calendarApp = useCalendarApp({
        locale: 'fr-FR',
        theme: 'shadcn',
        isDark: false,
        views: [viewWeek],
        defaultView: 'week',
        firstDayOfWeek: 1,
        timezone,
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
            gridHeight: 600,
            nDays: 7,
            eventWidth: 100,
            timeAxisFormatOptions: {hour: '2-digit', minute: '2-digit'},
            eventOverlap: true,
            gridStep: 60,
        },
        events: [],
        callbacks: {
            onEventClick: (event: CalendarEvent & { scheduleId?: string }, uiEvent) => {
                if (event.scheduleId) {
                    const bounds = containerRef.current?.getBoundingClientRect();
                    let nextPosition = {x: 96, y: 128};

                    const hasMouseCoordinates = uiEvent
                        && typeof (uiEvent as { clientX?: unknown }).clientX === 'number'
                        && typeof (uiEvent as { clientY?: unknown }).clientY === 'number';
                    if (bounds && hasMouseCoordinates) {
                        const mouseEvent = uiEvent as unknown as { clientX: number; clientY: number };
                        nextPosition = {
                            x: Math.max(24, Math.min(bounds.width - 24, mouseEvent.clientX - bounds.left)),
                            y: Math.max(24, Math.min(bounds.height - 24, mouseEvent.clientY - bounds.top)),
                        };
                    }

                    setSelectedScheduleId(event.scheduleId);
                    setAnchorPosition(nextPosition);
                    setDetailsOpen(true);
                }
            },
            onRangeUpdate: (range) => {
                setVisibleRange({
                    start: {
                        year: range.start.year,
                        month: range.start.month,
                        day: range.start.day,
                    },
                    end: {
                        year: range.end.year,
                        month: range.end.month,
                        day: range.end.day,
                    },
                });
            },
            fetchEvents: async (range) => {
                const startDate = toDateKey(range.start);
                const endDate = toDateKey(range.end);

                return createCalendarEventsForRange({
                    schedules: schedulesRef.current,
                    startDate,
                    endDate,
                    timezone,
                    createZonedDateTime: (value: string) => Temporal.ZonedDateTime.from(value) as CalendarEvent['start'],
                });
            },
        },
    });

    return (
        <div className="overflow-hidden rounded-xl border bg-linear-to-br from-background via-background to-muted/20">
            <div className="border-b bg-muted/30 px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Planning hebdomadaire
                        </p>
                        <p className="text-sm font-semibold">{rangeLabel}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">
                            Récurrente
                        </Badge>
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                            Événementielle
                        </Badge>
                    </div>
                </div>
            </div>
            <div ref={containerRef} className="schedule-calendar relative">
                <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
                    {anchorPosition ? (
                        <PopoverAnchor asChild>
                            <span
                                aria-hidden
                                className="pointer-events-none absolute z-30 size-0"
                                style={{left: `${anchorPosition.x}px`, top: `${anchorPosition.y}px`}}
                            />
                        </PopoverAnchor>
                    ) : null}
                    {selectedSchedule ? (
                        <PopoverContent
                            align="start"
                            sideOffset={10}
                            className="w-80"
                            onOpenAutoFocus={(event) => event.preventDefault()}
                        >
                            <PopoverHeader>
                                <PopoverTitle>{selectedSchedule.playlistName}</PopoverTitle>
                                <PopoverDescription>{SCHEDULE_TYPE_LABELS[selectedSchedule.type]}</PopoverDescription>
                            </PopoverHeader>
                            <div className="mt-3 space-y-2 text-sm">
                                <p><span className="text-muted-foreground">Fenêtre:</span> {selectedSchedule.dateLabel}
                                </p>
                                <p><span
                                    className="text-muted-foreground">Jours:</span> {selectedSchedule.type === 'EVENT' ? 'Ponctuelle' : selectedSchedule.daysLabel}
                                </p>
                                <p><span className="text-muted-foreground">Horaire:</span> {selectedSchedule.timeLabel}
                                </p>
                                <p><span className="text-muted-foreground">Canal:</span> {selectedSchedule.channelName}
                                </p>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button size="sm" asChild>
                                    <Link
                                        href={appendReturnTo(`/dashboard/schedules/${selectedSchedule.id}`, currentReturnTo)}
                                        onClick={() => setDetailsOpen(false)}
                                    >
                                        Voir la programmation
                                    </Link>
                                </Button>
                            </div>
                        </PopoverContent>
                    ) : null}
                </Popover>
                <ScheduleXCalendar calendarApp={calendarApp} />
            </div>
            <style jsx global>{`
                .schedule-calendar .sx__calendar {
                    border: 0;
                    border-radius: 0;
                    background: transparent;
                    --sx-calendar-week-grid-padding-left: 76px;
                }

                .schedule-calendar .sx__calendar-header {
                    border-bottom: 1px solid hsl(var(--border));
                    background: hsl(var(--background));
                }

                .schedule-calendar .sx__week-grid,
                .schedule-calendar .sx__week-header {
                    background: color-mix(in oklab, hsl(var(--muted)) 24%, transparent);
                }

                .schedule-calendar .sx__week-grid__date--is-today .sx__week-grid__date-number {
                    box-shadow: 0 0 0 2px color-mix(in oklab, hsl(var(--primary)) 30%, transparent);
                }

                .schedule-calendar .sx__time-grid-event {
                    border-radius: 10px;
                    border: 1px solid color-mix(in oklab, currentColor 25%, transparent);
                    box-shadow: 0 6px 12px -10px color-mix(in oklab, hsl(var(--foreground)) 30%, transparent);
                }

                .schedule-calendar .sx__week-grid__time-axis {
                    width: calc(100% - 76px);
                }

                .schedule-calendar .sx__week-grid__hour-text {
                    left: -56px;
                    color: hsl(var(--muted-foreground));
                    font-size: 0.72rem;
                    font-weight: 500;
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}
