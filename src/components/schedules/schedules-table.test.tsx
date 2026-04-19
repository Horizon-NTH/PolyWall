import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScheduleType } from '@/generated/prisma/enums';
import { SchedulesTable } from '@/components/schedules/schedules-table';
import { TooltipProvider } from '@/components/ui/tooltip';

const refreshMock = vi.fn();
const deleteScheduleMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({refresh: refreshMock}),
    usePathname: () => '/dashboard/schedules',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/schedule-actions', () => ({
    deleteSchedule: (...args: unknown[]) => deleteScheduleMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('SchedulesTable', () => {
    const data = [{
        id: 'schedule-1',
        type: ScheduleType.RECURRING,
        active: true,
        playlistId: 'playlist-1',
        playlistName: 'Actus',
        channelId: 'channel-1',
        channelName: 'Hall',
        startDate: null,
        endDate: null,
        daysLabel: 'Lun, Mar',
        dateLabel: 'Toujours active',
        timeLabel: '09:00 - 10:00',
        lifecycleStatus: 'ongoing' as const,
        updatedAt: '2026-04-01T10:00:00.000Z',
        createdAt: '2026-04-01T09:00:00.000Z',
        slots: [],
    }];

    beforeEach(() => {
        refreshMock.mockReset();
        deleteScheduleMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    function renderTable(canManage: boolean) {
        return render(
            <TooltipProvider>
                <SchedulesTable data={data} canManage={canManage} />
            </TooltipProvider>,
        );
    }

    it('shows management actions only when canManage is true', async () => {
        renderTable(false);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        expect(await screen.findByRole('menuitem', {name: 'Voir la fiche'})).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', {name: 'Supprimer'})).not.toBeInTheDocument();
    });

    it('shows error toast when deletion fails', async () => {
        deleteScheduleMock.mockResolvedValueOnce({ok: false, message: 'Erreur API'});

        renderTable(true);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Supprimer'}));
        fireEvent.click((await screen.findAllByRole('button', {name: 'Supprimer'})).at(-1)!);

        await waitFor(() => {
            expect(deleteScheduleMock).toHaveBeenCalledWith('schedule-1');
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur API');
        });
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
