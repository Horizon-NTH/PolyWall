import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { UsersTable } from '@/components/users/users-table';
import { routerMock, setMockPathname } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';
import { buildUserRow } from '@/test/fixtures/builders';

const toggleUserActiveMock = vi.fn();
const deleteUserMock = vi.fn();

vi.mock('@/actions/user-actions', () => ({
    toggleUserActive: (...args: unknown[]) => toggleUserActiveMock(...args),
    deleteUser: (...args: unknown[]) => deleteUserMock(...args),
}));

describe('UsersTable', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/users');
        toggleUserActiveMock.mockReset();
        deleteUserMock.mockReset();
    });

    const data = [buildUserRow()];

    it('renders user data and links', () => {
        render(<UsersTable data={data} />);

        expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
        expect(screen.getByText('jean@example.com')).toBeInTheDocument();
        expect(screen.getByText('Gestionnaire de contenu')).toBeInTheDocument();
        expect(screen.getByText('Actif')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Jean Dupont'})).toHaveAttribute(
            'href',
            '/dashboard/users/user-1?returnTo=%2Fdashboard%2Fusers',
        );
    });

    it('toggles user status from the row actions menu', async () => {
        toggleUserActiveMock.mockResolvedValueOnce({ok: true});

        render(<UsersTable data={data} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(toggleUserActiveMock).toHaveBeenCalledWith('user-1');
            expect(toastMock.success).toHaveBeenCalledWith('Utilisateur désactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
        });
    });

    it('shows an error toast when deletion fails', async () => {
        deleteUserMock.mockResolvedValueOnce({ok: false, message: 'Erreur serveur'});

        render(<UsersTable data={data} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Supprimer'}));

        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteUserMock).toHaveBeenCalledWith('user-1');
            expect(toastMock.error).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(routerMock.refresh).not.toHaveBeenCalled();
    });
});
