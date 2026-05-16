import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { UserActionsCard } from '@/components/users/user-actions-card';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const toggleUserActiveMock = vi.fn();
const deleteUserMock = vi.fn();

vi.mock('@/actions/user-actions', () => ({
    toggleUserActive: (...args: unknown[]) => toggleUserActiveMock(...args),
    deleteUser: (...args: unknown[]) => deleteUserMock(...args),
}));

describe('UserActionsCard', () => {
    beforeEach(() => {
        toggleUserActiveMock.mockReset();
        deleteUserMock.mockReset();
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
            expect(toastMock.success).toHaveBeenCalledWith('Utilisateur désactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
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
            expect(toastMock.error).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(routerMock.replace).not.toHaveBeenCalled();
    });
});
