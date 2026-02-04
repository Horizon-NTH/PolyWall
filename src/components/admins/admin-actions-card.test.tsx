import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AdminActionsCard } from '@/components/admins/admin-actions-card';

const refreshMock = vi.fn();
const replaceMock = vi.fn();
const toggleAdminActiveMock = vi.fn();
const deleteAdminMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
        replace: replaceMock,
    }),
}));

vi.mock('@/actions/admin-actions', () => ({
    toggleAdminActive: (...args: unknown[]) => toggleAdminActiveMock(...args),
    deleteAdmin: (...args: unknown[]) => deleteAdminMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('AdminActionsCard', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        replaceMock.mockReset();
        toggleAdminActiveMock.mockReset();
        deleteAdminMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('toggles the admin status and refreshes', async () => {
        toggleAdminActiveMock.mockResolvedValueOnce({ok: true});

        render(
            <AdminActionsCard
                adminId="admin-1"
                adminName="Jean Dupont"
                isActive
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(toggleAdminActiveMock).toHaveBeenCalledWith('admin-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Administrateur désactivé.');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('deletes the admin and redirects on success', async () => {
        deleteAdminMock.mockResolvedValueOnce({ok: true});

        render(
            <AdminActionsCard
                adminId="admin-1"
                adminName="Jean Dupont"
                isActive
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteAdminMock).toHaveBeenCalledWith('admin-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Administrateur supprimé.');
            expect(replaceMock).toHaveBeenCalledWith('/dashboard/administrators');
        });
    });

    it('shows an error toast when deletion fails', async () => {
        deleteAdminMock.mockResolvedValueOnce({ok: false, message: 'Erreur serveur'});

        render(
            <AdminActionsCard
                adminId="admin-1"
                adminName="Jean Dupont"
                isActive
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteAdminMock).toHaveBeenCalledWith('admin-1');
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(replaceMock).not.toHaveBeenCalled();
    });
});
