import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PlaylistForm } from '@/components/playlists/playlist-form';
import { routerMock } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';

const createPlaylistMock = vi.fn();
const updatePlaylistMock = vi.fn();

vi.mock('@/actions/playlist-actions', () => ({
    createPlaylist: (...args: unknown[]) => createPlaylistMock(...args),
    updatePlaylist: (...args: unknown[]) => updatePlaylistMock(...args),
}));

describe('PlaylistForm', () => {
    beforeEach(() => {
        createPlaylistMock.mockReset();
        updatePlaylistMock.mockReset();
    });

    it('creates a playlist and redirects on success', async () => {
        createPlaylistMock.mockResolvedValueOnce({ok: true, playlistId: 'playlist-1'});

        render(
            <PlaylistForm
                mode="create"
                cancelHref="/dashboard/playlists"
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Default'}});
        fireEvent.change(screen.getByLabelText('Description'), {target: {value: 'Playlist principale'}});
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(createPlaylistMock).toHaveBeenCalledWith({
                name: 'Default',
                description: 'Playlist principale',
            });
            expect(toastMock.success).toHaveBeenCalledWith('Playlist créée.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/playlists/playlist-1?returnTo=%2Fdashboard%2Fplaylists');
        });
    });

    it('updates a playlist and redirects on success', async () => {
        updatePlaylistMock.mockResolvedValueOnce({ok: true, playlistId: 'playlist-2'});

        render(
            <PlaylistForm
                mode="edit"
                playlistId="playlist-2"
                cancelHref="/dashboard/playlists/playlist-2"
                defaultValues={{
                    name: 'Default',
                    description: 'Playlist principale',
                }}
            />,
        );

        fireEvent.change(screen.getByLabelText('Nom'), {target: {value: 'Actus'}});
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updatePlaylistMock).toHaveBeenCalledWith('playlist-2', {
                name: 'Actus',
                description: 'Playlist principale',
            });
            expect(toastMock.success).toHaveBeenCalledWith('Playlist mise à jour.');
            expect(routerMock.push).toHaveBeenCalledWith('/dashboard/playlists/playlist-2');
        });
    });
});
