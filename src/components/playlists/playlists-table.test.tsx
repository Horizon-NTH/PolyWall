import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { PlaylistsTable } from '@/components/playlists/playlists-table';
import { routerMock, setMockPathname } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';
import { buildPlaylistRow } from '@/test/fixtures/builders';

const deletePlaylistMock = vi.fn();

vi.mock('@/actions/playlist-actions', () => ({
    deletePlaylist: (...args: unknown[]) => deletePlaylistMock(...args),
}));

describe('PlaylistsTable', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/playlists');
        deletePlaylistMock.mockReset();
    });

    const data = [buildPlaylistRow()];

    it('renders playlist data and links', () => {
        render(<PlaylistsTable data={data} />);

        expect(screen.getByText('Default')).toBeInTheDocument();
        expect(screen.getByText('Playlist principale')).toBeInTheDocument();
        expect(screen.getByText('1 média inactif')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Default'})).toHaveAttribute(
            'href',
            '/dashboard/playlists/playlist-1?returnTo=%2Fdashboard%2Fplaylists',
        );
    });

    it('shows empty state when there are no playlists', () => {
        render(<PlaylistsTable data={[]} />);

        expect(screen.getByText('Aucune playlist')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Créer une playlist'})).toHaveAttribute('href', '/dashboard/playlists/new');
    });

    it('shows an error toast when deletion fails', async () => {
        deletePlaylistMock.mockResolvedValueOnce({ok: false, message: 'Erreur serveur'});

        render(<PlaylistsTable data={data} />);

        fireEvent.pointerDown(screen.getByRole('button', {name: 'Ouvrir le menu'}));
        fireEvent.click(await screen.findByRole('menuitem', {name: 'Supprimer'}));

        const dialog = await screen.findByRole('alertdialog');
        expect(within(dialog).getByText('Récurrente')).toBeInTheDocument();
        expect(within(dialog).getByText('Toujours active')).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deletePlaylistMock).toHaveBeenCalledWith('playlist-1');
            expect(toastMock.error).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(routerMock.refresh).not.toHaveBeenCalled();
    });
});
