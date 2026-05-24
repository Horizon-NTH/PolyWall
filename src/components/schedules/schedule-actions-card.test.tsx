import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScheduleActionsCard } from '@/components/schedules/schedule-actions-card';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const deleteScheduleMock = vi.fn();

vi.mock('@/actions/schedule-actions', () => ({
    deleteSchedule: (...args: unknown[]) => deleteScheduleMock(...args),
}));

vi.mock('@/components/schedules/schedule-delete-dialog', () => ({
    ScheduleDeleteDialog: ({onConfirm}: { onConfirm: () => void }) => (
        <button type="button" onClick={onConfirm}>Confirmer suppression</button>
    ),
}));

describe('ScheduleActionsCard', () => {
    beforeEach(() => {
        deleteScheduleMock.mockReset();
    });

    it('deletes schedule and redirects on success', async () => {
        deleteScheduleMock.mockResolvedValueOnce({ok: true, scheduleId: 'schedule-1'});

        render(
            <ScheduleActionsCard
                scheduleId="schedule-1"
                scheduleLabel="Programmation matin"
                returnHref="/dashboard/schedules?channelId=channel-1"
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Confirmer suppression'}));

        await waitFor(() => {
            expect(deleteScheduleMock).toHaveBeenCalledWith('schedule-1');
            expect(toastMock.success).toHaveBeenCalledWith('Programmation supprimée.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/schedules?channelId=channel-1');
            expect(routerMock.refresh).toHaveBeenCalledTimes(1);
        });
    });

    it('shows an error toast when deletion fails', async () => {
        deleteScheduleMock.mockResolvedValueOnce({ok: false, message: 'Suppression impossible'});

        render(
            <ScheduleActionsCard
                scheduleId="schedule-1"
                scheduleLabel="Programmation matin"
                returnHref="/dashboard/schedules"
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Confirmer suppression'}));

        await waitFor(() => {
            expect(toastMock.error).toHaveBeenCalledWith('Suppression impossible');
        });
        expect(routerMock.push).not.toHaveBeenCalled();
        expect(routerMock.refresh).not.toHaveBeenCalled();
    });
});
