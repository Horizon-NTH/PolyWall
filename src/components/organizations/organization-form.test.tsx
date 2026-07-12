import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrganizationForm } from '@/components/organizations/organization-form';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const createOrganizationMock = vi.fn();
const updateOrganizationMock = vi.fn();

vi.mock('@/actions/organization-actions', () => ({
    createOrganization: (...args: unknown[]) => createOrganizationMock(...args),
    updateOrganization: (...args: unknown[]) => updateOrganizationMock(...args),
}));

describe('OrganizationForm', () => {
    beforeEach(() => {
        createOrganizationMock.mockReset();
        updateOrganizationMock.mockReset();
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
            expect(toastMock.success).toHaveBeenCalledWith('Organisation créée.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/organizations/org-1?returnTo=%2Fdashboard%2Forganizations');
        });
    });

    it('updates an organization and redirects on success', async () => {
        updateOrganizationMock.mockResolvedValueOnce({ok: true, organizationId: 'org-2'});

        render(
            <OrganizationForm
                mode="edit"
                organizationId="org-2"
                cancelHref="/dashboard/organizations/org-2"
                defaultValues={{name: 'Org Name', description: 'Description'}}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateOrganizationMock).toHaveBeenCalledWith('org-2', {
                name: 'Org Name',
                description: 'Description',
            });
            expect(toastMock.success).toHaveBeenCalledWith('Organisation mise à jour.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/organizations/org-2');
        });
    });
});
