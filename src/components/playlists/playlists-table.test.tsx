import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { PlaylistsTable } from '@/components/playlists/playlists-table';

const refreshMock = vi.fn();
const deletePlaylistMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
    usePathname: () => '/dashboard/playlists',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
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

describe('PlaylistsTable', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        deletePlaylistMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    const data = [
        {
            id: 'playlist-1',
            name: 'Default',
            description: 'Playlist principale',
            mediaCount: 3,
            activeMediaCount: 2,
            totalDurationSeconds: 120,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
        },
    ];

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
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deletePlaylistMock).toHaveBeenCalledWith('playlist-1');
            expect(toastErrorMock).toHaveBeenCalledWith('Erreur serveur');
        });
        expect(refreshMock).not.toHaveBeenCalled();
    });
});
