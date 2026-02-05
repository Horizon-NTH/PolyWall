import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ManagedUserActionsCard } from '@/components/users/managed-user-actions-card';

const refreshMock = vi.fn();
const replaceMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
        replace: replaceMock,
    }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('ManagedUserActionsCard', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        replaceMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('toggles and refreshes on success', async () => {
        const onToggle = vi.fn().mockResolvedValueOnce({ok: true});
        const onDelete = vi.fn().mockResolvedValueOnce({ok: true});

        render(
            <ManagedUserActionsCard
                entityLabel="Jean Dupont"
                isActive
                onToggle={onToggle}
                onDelete={onDelete}
                onDeletedRedirect="/dashboard/users"
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(onToggle).toHaveBeenCalled();
            expect(toastSuccessMock).toHaveBeenCalledWith('Compte désactivé.');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('shows an error toast when deletion fails', async () => {
        const onToggle = vi.fn().mockResolvedValueOnce({ok: true});
        const onDelete = vi.fn().mockResolvedValueOnce({ok: false, message: 'Erreur serveur'});

        render(
            <ManagedUserActionsCard
                entityLabel="Jean Dupont"
                isActive
                onToggle={onToggle}
                onDelete={onDelete}
                onDeletedRedirect="/dashboard/users"
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(onDelete).toHaveBeenCalled();
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(replaceMock).not.toHaveBeenCalled();
    });
});
