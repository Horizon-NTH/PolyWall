import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScheduleActionsCard } from '@/components/schedules/schedule-actions-card';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const deleteScheduleMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
        refresh: refreshMock,
    }),
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

vi.mock('@/components/schedules/schedule-delete-dialog', () => ({
    ScheduleDeleteDialog: ({onConfirm}: { onConfirm: () => void }) => (
        <button type="button" onClick={onConfirm}>Confirmer suppression</button>
    ),
}));

describe('ScheduleActionsCard', () => {
    beforeEach(() => {
        pushMock.mockReset();
        refreshMock.mockReset();
        deleteScheduleMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
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
            expect(toastSuccessMock).toHaveBeenCalledWith('Programmation supprimée.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/schedules?channelId=channel-1');
            expect(refreshMock).toHaveBeenCalledTimes(1);
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
            expect(toastErrorMock).toHaveBeenCalledWith('Suppression impossible');
        });
        expect(pushMock).not.toHaveBeenCalled();
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
