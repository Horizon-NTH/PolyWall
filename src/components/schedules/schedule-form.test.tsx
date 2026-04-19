import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';
import { ScheduleForm } from '@/components/schedules/schedule-form';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const createScheduleMock = vi.fn();
const updateScheduleMock = vi.fn();
const upsertDefaultScheduleMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
        replace: replaceMock,
        refresh: vi.fn(),
    }),
    usePathname: () => '/dashboard/schedules/new',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/hooks/use-current-return-to', () => ({
    useCurrentReturnTo: () => '/dashboard/schedules',
}));

vi.mock('@/components/ui/checkbox', () => ({
    Checkbox: ({id, checked, onCheckedChange}: {
        id?: string;
        checked?: boolean;
        onCheckedChange?: (value: boolean) => void;
    }) => (
        <input
            id={id}
            type="checkbox"
            checked={Boolean(checked)}
            onChange={(event) => onCheckedChange?.(event.target.checked)}
        />
    ),
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({children, value, onValueChange}: {
        children: ReactNode;
        value?: string;
        onValueChange?: (value: string) => void;
    }) => (
        <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectValue: ({placeholder}: { placeholder?: string }) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({value, children}: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

vi.mock('radix-ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('radix-ui')>();
    return {
        ...actual,
        Select: {
            Item: ({value}: { value: string; children: ReactNode }) => <option value={value}>{value}</option>,
            ItemText: () => null,
            ItemIndicator: () => null,
        },
    };
});

vi.mock('@/components/playlists/playlist-preview-summary', () => ({
    PlaylistPreviewSummary: ({name}: { name: string }) => <span>{name}</span>,
}));

vi.mock('@/components/ui/time-picker', () => ({
    TimePicker: ({value, onChange}: { value?: string; onChange: (value: string) => void }) => (
        <input
            data-testid="time-picker"
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
}));

vi.mock('@/components/ui/date-picker', () => ({
    DatePicker: ({value, onChange}: { value?: string; onChange: (value: string) => void }) => (
        <input
            data-testid="date-picker"
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
}));

vi.mock('@/actions/schedule-actions', () => ({
    createSchedule: (...args: unknown[]) => createScheduleMock(...args),
    updateSchedule: (...args: unknown[]) => updateScheduleMock(...args),
    upsertDefaultSchedule: (...args: unknown[]) => upsertDefaultScheduleMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: vi.fn(),
    },
}));

describe('ScheduleForm', () => {
    const channels = [{id: 'channel-1', name: 'Hall'}];
    const playlists = [{
        id: 'playlist-1',
        name: 'Matin',
        mediaCount: 3,
        totalDurationSeconds: 180,
        previewItems: [{title: 'A', thumbUrl: null}],
    }];

    beforeEach(() => {
        pushMock.mockReset();
        replaceMock.mockReset();
        createScheduleMock.mockReset();
        updateScheduleMock.mockReset();
        upsertDefaultScheduleMock.mockReset();
        toastSuccessMock.mockReset();
    });

    it('creates a recurring schedule and redirects to details page', async () => {
        createScheduleMock.mockResolvedValueOnce({ok: true, scheduleId: 'schedule-1'});

        render(
            <ScheduleForm
                mode="create"
                channels={channels}
                playlists={playlists}
                cancelHref="/dashboard/schedules"
            />,
        );

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[1], {target: {value: 'channel-1'}});
        fireEvent.change(selects[2], {target: {value: 'playlist-1'}});

        fireEvent.change(screen.getAllByTestId('time-picker')[0], {target: {value: '09:00'}});
        fireEvent.click(screen.getByLabelText(/Lundi|Monday/i));
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(createScheduleMock).toHaveBeenCalledWith(expect.objectContaining({
                type: ScheduleType.RECURRING,
                channelId: 'channel-1',
                playlistId: 'playlist-1',
                startTime: '09:00',
                endMode: 'playlist',
                daysOfWeek: [DayOfWeek.MONDAY],
            }));
            expect(toastSuccessMock).toHaveBeenCalledWith('Programmation créée.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/schedules/schedule-1');
        });
    });

    it('shows conflict details when API returns schedule conflicts', async () => {
        createScheduleMock.mockResolvedValueOnce({
            ok: false,
            field: 'root',
            message: '1 conflit détecté.',
            conflicts: [{
                scheduleId: 'draft-1',
                conflictingScheduleId: 'schedule-existing',
                conflictingTitle: 'Programmation existante',
                conflictingType: ScheduleType.RECURRING,
                overlappingDaysLabel: 'Lun',
                overlappingTimeLabel: '09:00 - 10:00',
                overlappingDateLabel: null,
                message: 'Conflit',
            }],
        });

        render(
            <ScheduleForm
                mode="create"
                channels={channels}
                playlists={playlists}
                cancelHref="/dashboard/schedules"
            />,
        );

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[1], {target: {value: 'channel-1'}});
        fireEvent.change(selects[2], {target: {value: 'playlist-1'}});
        fireEvent.change(screen.getAllByTestId('time-picker')[0], {target: {value: '09:00'}});
        fireEvent.click(screen.getByLabelText(/Lundi|Monday/i));

        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        expect(await screen.findByText('Conflit détecté')).toBeInTheDocument();
        expect(screen.getByText('Programmation existante')).toBeInTheDocument();
        expect(pushMock).not.toHaveBeenCalled();
    });
});
