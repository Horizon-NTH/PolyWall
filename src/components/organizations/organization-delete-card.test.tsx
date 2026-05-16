import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { OrganizationDeleteCard } from '@/components/organizations/organization-delete-card';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const deleteOrganizationMock = vi.fn();

vi.mock('@/actions/organization-actions', () => ({
    deleteOrganization: (...args: unknown[]) => deleteOrganizationMock(...args),
}));

describe('OrganizationDeleteCard', () => {
    beforeEach(() => {
        deleteOrganizationMock.mockReset();
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
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

        await waitFor(() => {
            expect(deleteOrganizationMock).toHaveBeenCalledWith('org-1');
            expect(toastMock.error).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(routerMock.push).not.toHaveBeenCalled();
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
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

        await waitFor(() => {
            expect(deleteOrganizationMock).toHaveBeenCalledWith('org-1');
            expect(toastMock.success).toHaveBeenCalledWith('Organisation supprimée.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/organizations');
        });
    });
});
