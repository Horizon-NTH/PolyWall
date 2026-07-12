import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UserForm } from '@/components/users/user-form';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const createUserMock = vi.fn();
const updateUserMock = vi.fn();

vi.mock('@/actions/user-actions', () => ({
    createUser: (...args: unknown[]) => createUserMock(...args),
    updateUser: (...args: unknown[]) => updateUserMock(...args),
}));

describe('UserForm', () => {
    const fillUserCreateForm = () => {
        fireEvent.change(screen.getByLabelText('Nom complet'), {
            target: {value: 'Jean Dupont'},
        });
        fireEvent.change(screen.getByLabelText('Email'), {
            target: {value: 'jean@example.com'},
        });
        fireEvent.change(screen.getByLabelText('Description'), {
            target: {value: 'Gestionnaire principal'},
        });
        fireEvent.change(screen.getByLabelText('Mot de passe initial'), {
            target: {value: 'Password123!'},
        });
        fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
            target: {value: 'Password123!'},
        });
    };

    const submitCreate = () => {
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));
    };

    beforeEach(() => {
        createUserMock.mockReset();
        updateUserMock.mockReset();
    });

    it('creates a user and redirects on success', async () => {
        createUserMock.mockResolvedValueOnce({ok: true, userId: 'user-1'});

        render(
            <UserForm
                mode="create"
                cancelHref="/dashboard/users"
            />,
        );

        fillUserCreateForm();
        submitCreate();

        await waitFor(() => {
            expect(createUserMock).toHaveBeenCalledWith({
                fullName: 'Jean Dupont',
                email: 'jean@example.com',
                description: 'Gestionnaire principal',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                active: true,
            });
            expect(toastMock.success).toHaveBeenCalledWith('Utilisateur créé.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/users/user-1?returnTo=%2Fdashboard%2Fusers');
        });
    });

    it('updates a user and redirects on success', async () => {
        updateUserMock.mockResolvedValueOnce({ok: true, userId: 'user-2'});

        render(
            <UserForm
                mode="edit"
                userId="user-2"
                cancelHref="/dashboard/users/user-2"
                defaultValues={{
                    fullName: 'Jean Dupont',
                    email: 'jean@example.com',
                    description: 'Gestionnaire principal',
                    active: false,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateUserMock).toHaveBeenCalledWith('user-2', {
                fullName: 'Jean Dupont',
                email: 'jean@example.com',
                description: 'Gestionnaire principal',
                active: false,
            });
            expect(toastMock.success).toHaveBeenCalledWith('Utilisateur mis à jour.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/users/user-2');
        });
    });
});
