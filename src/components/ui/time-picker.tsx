'use client';

import * as React from 'react';
import { CheckIcon, ChevronDownIcon, Clock3Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, minutesToTimeString, timeStringToMinutes } from '@/lib/utils';

type TimePickerProps = {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    minValue?: string;
    maxValue?: string;
    presets?: Array<{
        label: string;
        value: string;
    }>;
    'aria-invalid'?: boolean;
};

const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_VIEWPORT_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;
const WHEEL_EDGE_PADDING = (WHEEL_VIEWPORT_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;

function parseTime(value?: string) {
    if (!value) return null;
    const totalMinutes = timeStringToMinutes(value);
    return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
    };
}

function formatTimeValue(value?: string) {
    if (!value) return null;
    return minutesToTimeString(timeStringToMinutes(value));
}

function draftToTimeString(draft: { hours: number; minutes: number }) {
    if (draft.hours === 24 && draft.minutes === 0) {
        return '24:00';
    }

    return minutesToTimeString((draft.hours * 60) + draft.minutes);
}

function getInitialDraft(value?: string) {
    const parsed = parseTime(value);
    if (parsed) return parsed;

    const now = new Date();
    return {
        hours: now.getHours(),
        minutes: now.getMinutes(),
    };
}

function getBoundedMinutes(value: string | undefined, fallback: number) {
    if (!value) return fallback;
    return timeStringToMinutes(value);
}

function getAllowedHours(minMinutes: number, maxMinutes: number) {
    const startHour = Math.floor(minMinutes / 60);
    const endHour = Math.floor(maxMinutes / 60);
    return Array.from({length: (endHour - startHour) + 1}, (_, index) => startHour + index);
}

function getAllowedMinutes(hour: number, minMinutes: number, maxMinutes: number) {
    const minMinute = hour === Math.floor(minMinutes / 60) ? minMinutes % 60 : 0;
    const maxMinute = hour === Math.floor(maxMinutes / 60) ? maxMinutes % 60 : 59;
    return Array.from({length: (maxMinute - minMinute) + 1}, (_, index) => minMinute + index);
}

function clampDraftToRange(
    draft: { hours: number; minutes: number },
    minMinutes: number,
    maxMinutes: number,
) {
    const total = Math.max(minMinutes, Math.min((draft.hours * 60) + draft.minutes, maxMinutes));
    if (total === (24 * 60)) {
        return {
            hours: 24,
            minutes: 0,
        };
    }

    return {
        hours: Math.floor(total / 60),
        minutes: total % 60,
    };
}

type WheelColumnProps = {
    active: boolean;
    label: string;
    values: number[];
    selectedValue: number;
    onSelect: (value: number) => void;
};

function WheelColumn({active, label, values, selectedValue, onSelect}: WheelColumnProps) {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const buttonRefs = React.useRef(new Map<number, HTMLButtonElement>());
    const frameRef = React.useRef<number | null>(null);
    const snapTimeoutRef = React.useRef<number | null>(null);
    const selectedValueRef = React.useRef(selectedValue);

    React.useEffect(() => {
        selectedValueRef.current = selectedValue;
    }, [selectedValue]);

    const getViewport = React.useCallback(() => {
        return rootRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement | null;
    }, []);

    const centerValue = React.useCallback((value: number, behavior: ScrollBehavior = 'auto') => {
        const viewport = getViewport();
        const button = buttonRefs.current.get(value);
        if (!viewport || !button) return;

        const top = button.offsetTop - ((viewport.clientHeight - button.offsetHeight) / 2);
        viewport.scrollTo({top, behavior});
    }, [getViewport]);

    React.useEffect(() => {
        if (!active) return;
        centerValue(selectedValue);
    }, [active, centerValue, selectedValue]);

    React.useEffect(() => () => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
        }
        if (snapTimeoutRef.current !== null) {
            window.clearTimeout(snapTimeoutRef.current);
        }
    }, []);

    React.useEffect(() => {
        const viewport = getViewport();
        if (!viewport) return;

        const getNearestValue = (currentViewport: HTMLDivElement) => {
            const viewportRect = currentViewport.getBoundingClientRect();
            const viewportCenter = viewportRect.top + (viewportRect.height / 2);
            let nearestValue = selectedValueRef.current;
            let nearestDistance = Number.POSITIVE_INFINITY;

            values.forEach((value) => {
                const button = buttonRefs.current.get(value);
                if (!button) return;

                const buttonRect = button.getBoundingClientRect();
                const buttonCenter = buttonRect.top + (buttonRect.height / 2);
                const distance = Math.abs(buttonCenter - viewportCenter);

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestValue = value;
                }
            });

            return nearestValue;
        };

        const commitNearestValue = (behavior: ScrollBehavior) => {
            const currentViewport = getViewport();
            if (!currentViewport) return;

            const nearestValue = getNearestValue(currentViewport);
            if (nearestValue !== selectedValueRef.current) {
                onSelect(nearestValue);
            }

            centerValue(nearestValue, behavior);
        };

        const handleScroll = () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
            if (snapTimeoutRef.current !== null) {
                window.clearTimeout(snapTimeoutRef.current);
            }

            frameRef.current = requestAnimationFrame(() => {
                const currentViewport = getViewport();
                if (!currentViewport) return;

                const nearestValue = getNearestValue(currentViewport);
                if (nearestValue !== selectedValueRef.current) {
                    onSelect(nearestValue);
                }
            });

            snapTimeoutRef.current = window.setTimeout(() => {
                commitNearestValue('smooth');
            }, 90);
        };

        viewport.addEventListener('scroll', handleScroll, {passive: true});

        return () => {
            viewport.removeEventListener('scroll', handleScroll);
            if (snapTimeoutRef.current !== null) {
                window.clearTimeout(snapTimeoutRef.current);
            }
        };
    }, [centerValue, getViewport, onSelect, values]);

    return (
        <div ref={rootRef} className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-muted-foreground px-2 text-xs uppercase">{label}</p>
            <div className="bg-muted/30 relative overflow-hidden rounded-xl border">
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-linear-to-b from-background via-background/80 to-transparent" />
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-linear-to-t from-background via-background/80 to-transparent" />
                <div
                    className="pointer-events-none absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-border/80 bg-background/95 shadow-sm"
                    style={{height: `${WHEEL_ITEM_HEIGHT}px`}}
                />
                <ScrollArea className="overscroll-contain" style={{height: `${WHEEL_VIEWPORT_HEIGHT}px`}}>
                    <div
                        className="flex snap-y snap-mandatory flex-col"
                        style={{paddingBlock: `${WHEEL_EDGE_PADDING}px`}}
                    >
                        {values.map((value) => {
                            const selected = value === selectedValue;
                            const displayValue = String(value).padStart(2, '0');

                            return (
                                <button
                                    key={value}
                                    ref={(node) => {
                                        if (node) {
                                            buttonRefs.current.set(value, node);
                                        } else {
                                            buttonRefs.current.delete(value);
                                        }
                                    }}
                                    type="button"
                                    className={cn(
                                        'text-foreground relative z-20 mx-2 flex snap-center items-center justify-center rounded-lg px-3 text-sm tabular-nums transition-all duration-150',
                                        selected
                                            ? 'scale-100 font-semibold opacity-100'
                                            : 'text-muted-foreground scale-[0.94] opacity-55 hover:text-foreground hover:opacity-80',
                                    )}
                                    style={{height: `${WHEEL_ITEM_HEIGHT}px`}}
                                    onClick={() => {
                                        onSelect(value);
                                        centerValue(value, 'smooth');
                                    }}
                                >
                                    <span>{displayValue}</span>
                                    {selected ? <CheckIcon className="absolute right-3 size-3.5" /> : null}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

export function TimePicker({
                               value,
                               onChange,
                               placeholder = 'Sélectionnez une heure',
                               disabled = false,
                               minValue,
                               maxValue,
                               presets = [],
                               'aria-invalid': ariaInvalid,
                           }: TimePickerProps) {
    const minMinutes = getBoundedMinutes(minValue, 0);
    const maxMinutes = getBoundedMinutes(maxValue, (23 * 60) + 59);
    const [open, setOpen] = React.useState(false);
    const [{
        hours,
        minutes,
    }, setDraft] = React.useState(() => clampDraftToRange(getInitialDraft(value), minMinutes, maxMinutes));
    const hourValues = React.useMemo(() => getAllowedHours(minMinutes, maxMinutes), [maxMinutes, minMinutes]);
    const minuteValues = React.useMemo(
        () => getAllowedMinutes(hours, minMinutes, maxMinutes),
        [hours, maxMinutes, minMinutes],
    );

    React.useEffect(() => {
        if (open) {
            setDraft(clampDraftToRange(getInitialDraft(value), minMinutes, maxMinutes));
        }
    }, [maxMinutes, minMinutes, open, value]);

    React.useEffect(() => {
        setDraft((current) => clampDraftToRange(current, minMinutes, maxMinutes));
    }, [maxMinutes, minMinutes]);

    const displayValue = formatTimeValue(value);
    const currentValueLabel = draftToTimeString({hours, minutes});

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-invalid={ariaInvalid}
                    className={cn(
                        'w-full justify-between font-normal',
                        !displayValue && 'text-muted-foreground',
                    )}
                >
                    <span className="truncate">{displayValue ?? placeholder}</span>
                    <span className="flex items-center gap-2">
                        <Clock3Icon data-icon="inline-end" />
                        <ChevronDownIcon />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-88 p-3">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex flex-col">
                            <p className="text-sm font-medium">Choisir une heure</p>
                            <p className="text-muted-foreground text-xs">
                                Sélection actuelle: {currentValueLabel}
                            </p>
                        </div>
                    </div>

                    {presets.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {presets.map((preset) => (
                                <Button
                                    key={preset.value}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={timeStringToMinutes(preset.value) < minMinutes || timeStringToMinutes(preset.value) > maxMinutes}
                                    onClick={() => {
                                        onChange(preset.value);
                                        setOpen(false);
                                    }}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    ) : null}

                    <div className="flex gap-3">
                        <WheelColumn
                            active={open}
                            label="Heures"
                            values={hourValues}
                            selectedValue={hours}
                            onSelect={(nextHours) => {
                                setDraft((current) => {
                                    const nextMinutes = getAllowedMinutes(nextHours, minMinutes, maxMinutes);
                                    const fallbackMinutes = nextMinutes.includes(current.minutes) ? current.minutes : nextMinutes[0]!;
                                    return {...current, hours: nextHours, minutes: fallbackMinutes};
                                });
                            }}
                        />
                        <WheelColumn
                            active={open}
                            label="Minutes"
                            values={minuteValues}
                            selectedValue={minutes}
                            onSelect={(nextMinutes) => {
                                setDraft((current) => ({...current, minutes: nextMinutes}));
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setDraft(clampDraftToRange(getInitialDraft(value), minMinutes, maxMinutes));
                                setOpen(false);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                onChange(draftToTimeString({hours, minutes}));
                                setOpen(false);
                            }}
                        >
                            Appliquer
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
