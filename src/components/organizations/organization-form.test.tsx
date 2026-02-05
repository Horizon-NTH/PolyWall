import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrganizationForm } from '@/components/organizations/organization-form';
import React from 'react';

const pushMock = vi.fn();
const createOrganizationMock = vi.fn();
const updateOrganizationMock = vi.fn();
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

vi.mock('@/actions/organization-actions', () => ({
    createOrganization: (...args: unknown[]) => createOrganizationMock(...args),
    updateOrganization: (...args: unknown[]) => updateOrganizationMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
    },
}));

describe('OrganizationForm', () => {
    beforeEach(() => {
        pushMock.mockReset();
        createOrganizationMock.mockReset();
        updateOrganizationMock.mockReset();
        toastSuccessMock.mockReset();
    });

    it('shows a root error when edit mode is missing organizationId', async () => {
        render(
            <OrganizationForm
                mode="edit"
                cancelHref="/dashboard/organizations"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {
            target: {value: 'Org Name'},
        });
        fireEvent.change(screen.getByLabelText('Description'), {
            target: {value: 'Description'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(
                screen.getByText('Organisation introuvable.'),
            ).toBeInTheDocument();
        });
        expect(updateOrganizationMock).not.toHaveBeenCalled();
    });

    it('shows server error messages', async () => {
        createOrganizationMock.mockResolvedValueOnce({
            ok: false,
            field: 'name',
            message: 'Le nom est déjà utilisé.',
        });

        render(
            <OrganizationForm
                mode="create"
                cancelHref="/dashboard/organizations"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {
            target: {value: 'Org Name'},
        });
        fireEvent.change(screen.getByLabelText('Description'), {
            target: {value: 'Description'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(
                screen.getByText('Le nom est déjà utilisé.'),
            ).toBeInTheDocument();
        });
    });

    it('creates an organization and redirects on success', async () => {
        createOrganizationMock.mockResolvedValueOnce({ok: true, organizationId: 'org-1'});

        render(
            <OrganizationForm
                mode="create"
                cancelHref="/dashboard/organizations"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {
            target: {value: 'Org Name'},
        });
        fireEvent.change(screen.getByLabelText('Description'), {
            target: {value: 'Description'},
        });
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(createOrganizationMock).toHaveBeenCalledWith({
                name: 'Org Name',
                description: 'Description',
            });
            expect(toastSuccessMock).toHaveBeenCalledWith('Organisation créée.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/organizations');
        });
    });

    it('updates an organization and redirects on success', async () => {
        updateOrganizationMock.mockResolvedValueOnce({ok: true, organizationId: 'org-2'});

        render(
            <OrganizationForm
                mode="edit"
                organizationId="org-2"
                cancelHref="/dashboard/organizations"
                defaultValues={{name: 'Org Name', description: 'Description'}}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateOrganizationMock).toHaveBeenCalledWith('org-2', {
                name: 'Org Name',
                description: 'Description',
            });
            expect(toastSuccessMock).toHaveBeenCalledWith('Organisation mise à jour.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/organizations/org-2');
        });
    });
});
