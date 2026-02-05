import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { UsersTable } from '@/components/users/users-table';
import { UserRole } from '@/generated/prisma/enums';

const refreshMock = vi.fn();
const toggleUserActiveMock = vi.fn();
const deleteUserMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
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

describe('UsersTable', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        toggleUserActiveMock.mockReset();
        deleteUserMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    const data = [
        {
            id: 'user-1',
            fullName: 'Jean Dupont',
            email: 'jean@example.com',
            description: 'Gestionnaire',
            role: UserRole.CONTENT_MANAGER,
            active: true,
            createdAt: '2024-01-01T10:00:00.000Z',
        },
    ];

    it('renders user data and links', () => {
        render(<UsersTable data={data} />);

        expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
        expect(screen.getByText('jean@example.com')).toBeInTheDocument();
        expect(screen.getByText('Gestionnaire de contenu')).toBeInTheDocument();
        expect(screen.getByText('Actif')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Jean Dupont'})).toHaveAttribute(
            'href',
            '/dashboard/users/user-1',
        );
    });

    it('toggles user status from the row actions menu', async () => {
        toggleUserActiveMock.mockResolvedValueOnce({ok: true});

        render(<UsersTable data={data} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(toggleUserActiveMock).toHaveBeenCalledWith('user-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Utilisateur désactivé.');
            expect(refreshMock).toHaveBeenCalled();
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
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
