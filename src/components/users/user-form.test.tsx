import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UserForm } from '@/components/users/user-form';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const createUserMock = vi.fn();
const updateUserMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
        refresh: refreshMock,
    }),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/user-actions', () => ({
    createUser: (...args: unknown[]) => createUserMock(...args),
    updateUser: (...args: unknown[]) => updateUserMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
    },
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
        pushMock.mockReset();
        refreshMock.mockReset();
        createUserMock.mockReset();
        updateUserMock.mockReset();
        toastSuccessMock.mockReset();
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
            expect(toastSuccessMock).toHaveBeenCalledWith('Utilisateur créé.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/users');
        });
    });

    it('updates a user and redirects on success', async () => {
        updateUserMock.mockResolvedValueOnce({ok: true, userId: 'user-2'});

        render(
            <UserForm
                mode="edit"
                userId="user-2"
                cancelHref="/dashboard/users"
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
            expect(toastSuccessMock).toHaveBeenCalledWith('Utilisateur mis à jour.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/users/user-2');
        });
    });
});
