import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { ManagedUserForm, ManagedUserFormValues } from '@/components/users/managed-user-form';
import { Resolver } from 'react-hook-form';
import { toastMock } from '@/test/mocks/sonner';

const schema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    description: z.string().min(2),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    active: z.boolean(),
});

describe('ManagedUserForm', () => {
    const fillCreateForm = () => {
        fireEvent.change(screen.getByLabelText('Nom complet'), {
            target: {value: 'Jean Dupont'},
        });
        fireEvent.change(screen.getByLabelText('Email'), {
            target: {value: 'jean@example.com'},
        });
        fireEvent.change(screen.getByLabelText('Description'), {
            target: {value: 'Gestionnaire'},
        });
        fireEvent.change(screen.getByLabelText('Mot de passe initial'), {
            target: {value: 'Password123!'},
        });
        fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), {
            target: {value: 'Password123!'},
        });
    };

    it('submits and calls onSuccess', async () => {
        const onSubmit = vi.fn().mockResolvedValueOnce({ok: true});
        const onSuccess = vi.fn();

        render(
            <ManagedUserForm
                mode="create"
                resolver={zodResolver(schema) as Resolver<ManagedUserFormValues>}
                cancelHref="/dashboard/users"
                onSubmit={onSubmit}
                onSuccess={onSuccess}
                title="Nouvel utilisateur"
                description="Desc"
                successMessage="Utilisateur créé."
            />,
        );

        fillCreateForm();
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
            expect(toastMock.success).toHaveBeenCalledWith('Utilisateur créé.');
            expect(onSuccess).toHaveBeenCalled();
        });
    });

    it('shows root error when submission fails', async () => {
        const onSubmit = vi.fn().mockResolvedValueOnce({ok: false, field: 'root', message: 'Erreur'});
        const onSuccess = vi.fn();

        render(
            <ManagedUserForm
                mode="create"
                resolver={zodResolver(schema) as Resolver<ManagedUserFormValues>}
                cancelHref="/dashboard/users"
                onSubmit={onSubmit}
                onSuccess={onSuccess}
                title="Nouvel utilisateur"
                description="Desc"
                successMessage="Utilisateur créé."
            />,
        );

        fillCreateForm();
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
            expect(screen.getByText('Erreur')).toBeInTheDocument();
        });
    });
});
