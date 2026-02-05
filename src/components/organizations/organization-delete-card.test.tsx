import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrganizationDeleteCard } from '@/components/organizations/organization-delete-card';

const pushMock = vi.fn();
const deleteOrganizationMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}));

vi.mock('@/actions/organization-actions', () => ({
    deleteOrganization: (...args: unknown[]) => deleteOrganizationMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('OrganizationDeleteCard', () => {
    beforeEach(() => {
        pushMock.mockReset();
        deleteOrganizationMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('disables deletion when linked data exists', () => {
        render(
            <OrganizationDeleteCard
                organizationId="org-1"
                organizationName="Org One"
                counts={{
                    users: 1,
                    screens: 0,
                    channels: 0,
                    playlists: 0,
                    displayTemplates: 0,
                    widgetInstances: 0,
                }}
            />,
        );

        expect(screen.getByRole('button', { name: 'Supprimer' })).toBeDisabled();
        expect(
            screen.getByText(/Cette organisation contient encore des données/i),
        ).toBeInTheDocument();
    });

    it('shows an error toast when deletion fails', async () => {
        deleteOrganizationMock.mockResolvedValueOnce({
            ok: false,
            message: 'Erreur serveur',
        });

        render(
            <OrganizationDeleteCard
                organizationId="org-1"
                organizationName="Org One"
                counts={{
                    users: 0,
                    screens: 0,
                    channels: 0,
                    playlists: 0,
                    displayTemplates: 0,
                    widgetInstances: 0,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

        await waitFor(() => {
            expect(deleteOrganizationMock).toHaveBeenCalledWith('org-1');
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(pushMock).not.toHaveBeenCalled();
    });

    it('deletes and redirects on success', async () => {
        deleteOrganizationMock.mockResolvedValueOnce({ ok: true });

        render(
            <OrganizationDeleteCard
                organizationId="org-1"
                organizationName="Org One"
                counts={{
                    users: 0,
                    screens: 0,
                    channels: 0,
                    playlists: 0,
                    displayTemplates: 0,
                    widgetInstances: 0,
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

        await waitFor(() => {
            expect(deleteOrganizationMock).toHaveBeenCalledWith('org-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Organisation supprimée.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/organizations');
        });
    });
});
