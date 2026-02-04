import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AdminForm } from '@/components/admins/admin-form';
import { UserRole } from '@/generated/prisma/enums';

const pushMock = vi.fn();
const createAdminMock = vi.fn();
const updateAdminMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/admin-actions', () => ({
    createAdmin: (...args: unknown[]) => createAdminMock(...args),
    updateAdmin: (...args: unknown[]) => updateAdminMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
    },
}));

describe('AdminForm', () => {
    const fillAdminCreateForm = () => {
        fireEvent.change(screen.getByLabelText('Nom complet'), {
            target: {value: 'Jean Dupont'},
        });
        fireEvent.change(screen.getByLabelText('Email'), {
            target: {value: 'jean@example.com'},
        });
        fireEvent.change(screen.getByLabelText('Description'), {
            target: {value: 'Admin principal'},
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
        createAdminMock.mockReset();
        updateAdminMock.mockReset();
        toastSuccessMock.mockReset();
    });

    const organizations = [
        {id: 'org-1', name: 'Org One'},
    ];

    it('shows validation error when organization is missing for org admins', async () => {
        render(
            <AdminForm
                mode="create"
                organizations={organizations}
                cancelHref="/dashboard/administrators"
            />,
        );

        fillAdminCreateForm();
        submitCreate();

        await waitFor(() => {
            expect(
                screen.getByText('Une organisation est requise pour un admin d\'organisation.'),
            ).toBeInTheDocument();
        });
        expect(createAdminMock).not.toHaveBeenCalled();
    });

    it('creates an admin and redirects on success', async () => {
        createAdminMock.mockResolvedValueOnce({ok: true, adminId: 'admin-1'});

        render(
            <AdminForm
                mode="create"
                organizations={organizations}
                cancelHref="/dashboard/administrators"
                defaultValues={{organizationId: 'org-1'}}
            />,
        );

        fillAdminCreateForm();
        submitCreate();
        
        await waitFor(() => {
            expect(createAdminMock).toHaveBeenCalledWith({
                fullName: 'Jean Dupont',
                email: 'jean@example.com',
                description: 'Admin principal',
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: 'org-1',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                active: true,
            });
            expect(toastSuccessMock).toHaveBeenCalledWith('Administrateur créé.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/administrators');
        });
    });

    it('updates an admin and redirects on success', async () => {
        updateAdminMock.mockResolvedValueOnce({ok: true, adminId: 'admin-2'});

        render(
            <AdminForm
                mode="edit"
                adminId="admin-2"
                organizations={organizations}
                cancelHref="/dashboard/administrators"
                defaultValues={{
                    fullName: 'Jean Dupont',
                    email: 'jean@example.com',
                    description: 'Admin principal',
                    role: UserRole.ORGANIZATION_ADMIN,
                    organizationId: 'org-1',
                    active: false,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateAdminMock).toHaveBeenCalledWith('admin-2', {
                fullName: 'Jean Dupont',
                email: 'jean@example.com',
                description: 'Admin principal',
                role: UserRole.ORGANIZATION_ADMIN,
                organizationId: 'org-1',
                active: false,
            });
            expect(toastSuccessMock).toHaveBeenCalledWith('Administrateur mis à jour.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/administrators/admin-2');
        });
    });
});
