import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { PlaylistActionsCard } from '@/components/playlists/playlist-actions-card';

const replaceMock = vi.fn();
const deletePlaylistMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: replaceMock,
    }),
}));

vi.mock('@/actions/playlist-actions', () => ({
    deletePlaylist: (...args: unknown[]) => deletePlaylistMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('PlaylistActionsCard', () => {
    beforeEach(() => {
        replaceMock.mockReset();
        deletePlaylistMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('deletes playlist and redirects on success', async () => {
        deletePlaylistMock.mockResolvedValueOnce({ok: true});

        render(
            <PlaylistActionsCard
                playlistId="playlist-1"
                playlistName="Affichage principal"
                impactedSchedules={[{
                    id: 'schedule-1',
                    typeLabel: 'Récurrente',
                    dateLabel: 'Toujours active',
                    timeLabel: '08:00 - 10:00',
                }]}
            />,
        );

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        expect(within(dialog).getByText('Récurrente')).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deletePlaylistMock).toHaveBeenCalledWith('playlist-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Playlist supprimée.');
            expect(replaceMock).toHaveBeenCalledWith('/dashboard/playlists');
        });
    });

    it('shows error toast when delete fails', async () => {
        deletePlaylistMock.mockResolvedValueOnce({ok: false, message: 'Suppression impossible.'});

        render(<PlaylistActionsCard playlistId="playlist-1" playlistName="Affichage principal" impactedSchedules={[]} />);

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(toastErrorMock).toHaveBeenCalledWith('Suppression impossible.');
            expect(replaceMock).not.toHaveBeenCalled();
        });
    });
});
