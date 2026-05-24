import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AdminsTable } from '@/components/admins/admins-table';
import { routerMock, setMockPathname } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';
import { buildAdminRow } from '@/test/fixtures/builders';

const toggleAdminActiveMock = vi.fn();
const deleteAdminMock = vi.fn();

vi.mock('@/actions/admin-actions', () => ({
    toggleAdminActive: (...args: unknown[]) => toggleAdminActiveMock(...args),
    deleteAdmin: (...args: unknown[]) => deleteAdminMock(...args),
}));

describe('AdminsTable', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/administrators');
        toggleAdminActiveMock.mockReset();
        deleteAdminMock.mockReset();
    });

    const data = [buildAdminRow()];

    const organizations = [
        {id: 'org-1', name: 'Org One'},
    ];

    it('renders admin data and links', () => {
        render(<AdminsTable data={data} organizations={organizations} />);

        expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
        expect(screen.getByText('jean@example.com')).toBeInTheDocument();
        expect(screen.getByText('Admin organisation')).toBeInTheDocument();
        expect(screen.getByText('Org One')).toBeInTheDocument();
        expect(screen.getByText('Actif')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Jean Dupont'})).toHaveAttribute(
            'href',
            '/dashboard/administrators/admin-1?returnTo=%2Fdashboard%2Fadministrators',
        );
    });

    it('toggles admin status from the row actions menu', async () => {
        toggleAdminActiveMock.mockResolvedValueOnce({ok: true});

        render(<AdminsTable data={data} organizations={organizations} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(toggleAdminActiveMock).toHaveBeenCalledWith('admin-1');
            expect(toastMock.success).toHaveBeenCalledWith('Administrateur désactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
        });
    });

    it('shows an error toast when deletion fails', async () => {
        deleteAdminMock.mockResolvedValueOnce({ok: false, message: 'Erreur serveur'});

        render(<AdminsTable data={data} organizations={organizations} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Supprimer'}));

        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteAdminMock).toHaveBeenCalledWith('admin-1');
            expect(toastMock.error).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(routerMock.refresh).not.toHaveBeenCalled();
    });
});
