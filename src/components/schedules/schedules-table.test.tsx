import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SchedulesTable } from '@/components/schedules/schedules-table';
import { TooltipProvider } from '@/components/ui/tooltip';
import { routerMock, setMockPathname } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';
import { buildScheduleViewModel } from '@/test/fixtures/builders';

const deleteScheduleMock = vi.fn();

vi.mock('@/actions/schedule-actions', () => ({
    deleteSchedule: (...args: unknown[]) => deleteScheduleMock(...args),
}));

describe('SchedulesTable', () => {
    const data = [buildScheduleViewModel()];

    beforeEach(() => {
        setMockPathname('/dashboard/schedules');
        deleteScheduleMock.mockReset();
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
            expect(toastMock.error).toHaveBeenCalledWith('Erreur API');
        });
        expect(routerMock.refresh).not.toHaveBeenCalled();
    });
});
