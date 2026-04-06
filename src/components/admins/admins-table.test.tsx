import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AdminsTable } from '@/components/admins/admins-table';
import { UserRole } from '@/generated/prisma/enums';

const refreshMock = vi.fn();
const toggleAdminActiveMock = vi.fn();
const deleteAdminMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
    usePathname: () => '/dashboard/administrators',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
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

describe('AdminsTable', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        toggleAdminActiveMock.mockReset();
        deleteAdminMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    const data = [
        {
            id: 'admin-1',
            fullName: 'Jean Dupont',
            email: 'jean@example.com',
            description: 'Admin principal',
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: 'org-1',
            organizationName: 'Org One',
            active: true,
            createdAt: '2024-01-01T10:00:00.000Z',
        },
    ];

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
            expect(toastSuccessMock).toHaveBeenCalledWith('Administrateur désactivé.');
            expect(refreshMock).toHaveBeenCalled();
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
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
