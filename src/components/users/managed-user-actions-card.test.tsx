import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ManagedUserActionsCard } from '@/components/users/managed-user-actions-card';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

describe('ManagedUserActionsCard', () => {
    it('toggles and refreshes on success', async () => {
        const onToggle = vi.fn().mockResolvedValueOnce({ok: true});
        const onDelete = vi.fn().mockResolvedValueOnce({ok: true});

        render(
            <ManagedUserActionsCard
                entityLabel="Jean Dupont"
                isActive
                onToggle={onToggle}
                onDelete={onDelete}
                onDeletedRedirect="/dashboard/users"
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(onToggle).toHaveBeenCalled();
            expect(toastMock.success).toHaveBeenCalledWith('Compte désactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
        });
    });

    it('shows an error toast when deletion fails', async () => {
        const onToggle = vi.fn().mockResolvedValueOnce({ok: true});
        const onDelete = vi.fn().mockResolvedValueOnce({ok: false, message: 'Erreur serveur'});

        render(
            <ManagedUserActionsCard
                entityLabel="Jean Dupont"
                isActive
                onToggle={onToggle}
                onDelete={onDelete}
                onDeletedRedirect="/dashboard/users"
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(onDelete).toHaveBeenCalled();
            expect(toastMock.error).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(routerMock.replace).not.toHaveBeenCalled();
    });
});
