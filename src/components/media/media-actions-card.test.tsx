import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { MediaActionsCard } from '@/components/media/media-actions-card';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const toggleMediaItemActiveMock = vi.fn();
const deleteMediaItemMock = vi.fn();

vi.mock('@/actions/media-actions', () => ({
    toggleMediaItemActive: (...args: unknown[]) => toggleMediaItemActiveMock(...args),
    deleteMediaItem: (...args: unknown[]) => deleteMediaItemMock(...args),
}));

describe('MediaActionsCard', () => {
    beforeEach(() => {
        toggleMediaItemActiveMock.mockReset();
        deleteMediaItemMock.mockReset();
    });

    it('toggles media state and refreshes page on success', async () => {
        toggleMediaItemActiveMock.mockResolvedValueOnce({ok: true});

        render(
            <MediaActionsCard
                mediaItemId="media-1"
                mediaTitle="Affiche Hall"
                isActive={true}
                playlistUsage={{count: 0, playlistNames: []}}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(toggleMediaItemActiveMock).toHaveBeenCalledWith('media-1');
            expect(toastMock.success).toHaveBeenCalledWith('Média désactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
        });
    });

    it('shows error toast when toggle fails', async () => {
        toggleMediaItemActiveMock.mockResolvedValueOnce({ok: false, message: 'Accès refusé.'});

        render(
            <MediaActionsCard
                mediaItemId="media-1"
                mediaTitle="Affiche Hall"
                isActive={false}
                playlistUsage={{count: 0, playlistNames: []}}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Activer'}));

        await waitFor(() => {
            expect(toastMock.error).toHaveBeenCalledWith('Accès refusé.');
            expect(routerMock.refresh).not.toHaveBeenCalled();
        });
    });

    it('deletes media and redirects to media list', async () => {
        deleteMediaItemMock.mockResolvedValueOnce({ok: true});

        render(
            <MediaActionsCard
                mediaItemId="media-1"
                mediaTitle="Affiche Hall"
                isActive={true}
                playlistUsage={{count: 0, playlistNames: []}}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteMediaItemMock).toHaveBeenCalledWith('media-1');
            expect(toastMock.success).toHaveBeenCalledWith('Média supprimé.');
            expect(routerMock.replace).toHaveBeenCalledWith('/dashboard/media');
        });
    });

    it('shows blocked deletion details when media is still used', async () => {
        render(
            <MediaActionsCard
                mediaItemId="media-1"
                mediaTitle="Affiche Hall"
                isActive={true}
                playlistUsage={{count: 2, playlistNames: ['Actus', 'Événements']}}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');

        expect(within(dialog).getByText(/Suppression bloquée/)).toBeInTheDocument();
        expect(within(dialog).getByText('Actus')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', {name: 'Supprimer'})).not.toBeInTheDocument();
    });
});
