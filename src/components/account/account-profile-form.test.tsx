import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccountProfileForm } from '@/components/account/account-profile-form';
import { routerMock } from '@/test/mocks/next-navigation';

const updateProfileMock = vi.fn();

vi.mock('@/actions/account-actions', () => ({
    updateProfile: (...args: unknown[]) => updateProfileMock(...args),
}));

describe('AccountProfileForm', () => {
    beforeEach(() => {
        updateProfileMock.mockReset();
    });

    it('shows validation error for invalid name', async () => {
        render(
            <AccountProfileForm
                user={{name: 'A', email: 'user@example.com'}}
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom complet'), {
            target: {value: 'A'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(
                screen.getByText('Le nom complet doit contenir au moins 2 caractères'),
            ).toBeInTheDocument();
        });
    });

    it('shows server error when update fails', async () => {
        updateProfileMock.mockResolvedValueOnce({
            ok: false,
            field: 'root',
            message: 'Erreur serveur',
        });

        render(
            <AccountProfileForm
                user={{name: 'Jean Dupont', email: 'user@example.com'}}
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom complet'), {
            target: {value: 'Jean Dupont'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(screen.getByText('Erreur serveur')).toBeInTheDocument();
        });
    });

    it('shows success message on update', async () => {
        updateProfileMock.mockResolvedValueOnce({ok: true});

        render(
            <AccountProfileForm
                user={{name: 'Jean Dupont', email: 'user@example.com'}}
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom complet'), {
            target: {value: 'Jean Dupont'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(screen.getByText('Profil mis à jour.')).toBeInTheDocument();
            expect(routerMock.refresh).toHaveBeenCalled();
        });
    });
});
