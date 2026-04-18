'use client';

import * as React from 'react';
import { CalendarIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatDate } from '@/lib/utils';

type DatePickerProps = {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    clearButton?: boolean;
    'aria-invalid'?: boolean;
};

function parseDateString(value?: string) {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDateString(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(value?: string) {
    const date = parseDateString(value);
    if (!date) return null;

    return formatDate(date, 'long');
}

export function DatePicker({
                               value,
                               onChange,
                               placeholder = 'Sélectionnez une date',
                               disabled = false,
                               clearButton,
                               'aria-invalid': ariaInvalid,
                           }: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const selectedDate = React.useMemo(() => parseDateString(value), [value]);
    const hasValue = Boolean(value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="relative">
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        aria-invalid={ariaInvalid}
                        className={cn(
                            'w-full justify-start px-3 font-normal',
                            hasValue ? 'pr-16' : 'pr-10',
                            !hasValue && 'text-muted-foreground',
                        )}
                    >
                        <span className="truncate">{formatDisplayDate(value) ?? placeholder}</span>
                        <CalendarIcon data-icon="inline-end" className="ml-auto" />
                    </Button>
                </PopoverTrigger>
                {clearButton && hasValue ? (
                    <Button
                        variant="ghost"
                        disabled={disabled}
                        aria-label="Vider la date"
                        size="icon-xs"
                        className="absolute top-1/2 right-8 -translate-y-1/2"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onChange('');
                            setOpen(false);
                        }}
                    >
                        <XIcon />
                    </Button>
                ) : null}
            </div>
            <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                        if (!date) return;
                        onChange(formatDateString(date));
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
