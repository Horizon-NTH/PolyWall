import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PlaylistForm } from '@/components/playlists/playlist-form';

const pushMock = vi.fn();
const createPlaylistMock = vi.fn();
const updatePlaylistMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
        refresh: vi.fn(),
    }),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/playlist-actions', () => ({
    createPlaylist: (...args: unknown[]) => createPlaylistMock(...args),
    updatePlaylist: (...args: unknown[]) => updatePlaylistMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: vi.fn(),
    },
}));

describe('PlaylistForm', () => {
    beforeEach(() => {
        pushMock.mockReset();
        createPlaylistMock.mockReset();
        updatePlaylistMock.mockReset();
        toastSuccessMock.mockReset();
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
            expect(toastSuccessMock).toHaveBeenCalledWith('Playlist créée.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/playlists/playlist-1');
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
            expect(toastSuccessMock).toHaveBeenCalledWith('Playlist mise à jour.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/playlists/playlist-2');
        });
    });
});
