import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AdminActionsCard } from '@/components/admins/admin-actions-card';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const toggleAdminActiveMock = vi.fn();
const deleteAdminMock = vi.fn();

vi.mock('@/actions/admin-actions', () => ({
    toggleAdminActive: (...args: unknown[]) => toggleAdminActiveMock(...args),
    deleteAdmin: (...args: unknown[]) => deleteAdminMock(...args),
}));

describe('AdminActionsCard', () => {
    beforeEach(() => {
        toggleAdminActiveMock.mockReset();
        deleteAdminMock.mockReset();
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
            expect(toastMock.success).toHaveBeenCalledWith('Administrateur désactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
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
            expect(toastMock.success).toHaveBeenCalledWith('Administrateur supprimé.');
            expect(routerMock.replace).toHaveBeenCalledWith('/dashboard/administrators');
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
            expect(toastMock.error).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(routerMock.replace).not.toHaveBeenCalled();
    });
});
