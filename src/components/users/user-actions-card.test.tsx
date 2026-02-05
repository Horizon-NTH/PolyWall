import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { UserActionsCard } from '@/components/users/user-actions-card';

const refreshMock = vi.fn();
const replaceMock = vi.fn();
const toggleUserActiveMock = vi.fn();
const deleteUserMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
        replace: replaceMock,
    }),
}));

vi.mock('@/actions/user-actions', () => ({
    toggleUserActive: (...args: unknown[]) => toggleUserActiveMock(...args),
    deleteUser: (...args: unknown[]) => deleteUserMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('UserActionsCard', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        replaceMock.mockReset();
        toggleUserActiveMock.mockReset();
        deleteUserMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('toggles the user status and refreshes', async () => {
        toggleUserActiveMock.mockResolvedValueOnce({ok: true});

        render(
            <UserActionsCard
                userId="user-1"
                userName="Jean Dupont"
                isActive
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(toggleUserActiveMock).toHaveBeenCalledWith('user-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Utilisateur désactivé.');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('shows an error toast when deletion fails', async () => {
        deleteUserMock.mockResolvedValueOnce({ok: false, message: 'Erreur serveur'});

        render(
            <UserActionsCard
                userId="user-1"
                userName="Jean Dupont"
                isActive
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteUserMock).toHaveBeenCalledWith('user-1');
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(replaceMock).not.toHaveBeenCalled();
    });
});
