import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { MediaGrid } from '@/components/media/media-grid';
import { buildMediaGridItem } from '@/test/fixtures/builders';
import { routerMock, setMockPathname } from '@/test/mocks/next-navigation';
import { toastMock } from '@/test/mocks/sonner';
import { MediaFileStatus } from '@/generated/prisma/enums';

const toggleMediaItemActiveMock = vi.fn();
const deleteMediaItemMock = vi.fn();

vi.mock('@/actions/media-actions', () => ({
    toggleMediaItemActive: (...args: unknown[]) => toggleMediaItemActiveMock(...args),
    deleteMediaItem: (...args: unknown[]) => deleteMediaItemMock(...args),
}));

describe('MediaGrid', () => {
    beforeEach(() => {
        setMockPathname('/dashboard/media');
        toggleMediaItemActiveMock.mockReset();
        deleteMediaItemMock.mockReset();
    });

    const data = [
        buildMediaGridItem(),
        buildMediaGridItem({
            id: 'media-2',
            title: 'Vidéo Event',
            description: 'Clip promo',
            active: false,
            kind: 'video',
            status: MediaFileStatus.PROCESSING,
            sizeBytes: 2048,
            playlistUsage: {
                count: 2,
                playlistNames: ['Actus', 'Événements'],
            },
        }),
    ];

    it('filters by search text', () => {
        render(<MediaGrid data={data} />);

        fireEvent.change(screen.getByPlaceholderText('Rechercher un média...'), {
            target: {value: 'Hall'},
        });

        expect(screen.getByText('Affiche Hall')).toBeInTheDocument();
        expect(screen.queryByText('Vidéo Event')).not.toBeInTheDocument();
    });

    it('toggles active status from card action', async () => {
        toggleMediaItemActiveMock.mockResolvedValueOnce({ok: true});

        render(<MediaGrid data={data} />);

        const mediaCard = screen.getByText('Affiche Hall').closest('[data-slot="card"]');
        expect(mediaCard).not.toBeNull();

        fireEvent.pointerDown(within(mediaCard as HTMLElement).getByRole('button', {name: 'Ouvrir le menu'}), {
            button: 0,
        });
        fireEvent.click(await screen.findByText('Désactiver'));

        await waitFor(() => {
            expect(toggleMediaItemActiveMock).toHaveBeenCalledWith('media-1');
            expect(toastMock.success).toHaveBeenCalledWith('Média désactivé.');
            expect(routerMock.refresh).toHaveBeenCalled();
        });
    });

    it('shows blocked deletion details when media is used in playlists', async () => {
        render(<MediaGrid data={data} />);

        const mediaCard = screen.getByText('Vidéo Event').closest('[data-slot="card"]');
        expect(mediaCard).not.toBeNull();

        fireEvent.pointerDown(within(mediaCard as HTMLElement).getByRole('button', {name: 'Ouvrir le menu'}), {
            button: 0,
        });
        fireEvent.click(await screen.findByText('Supprimer'));

        const dialog = await screen.findByRole('alertdialog');
        expect(within(dialog).getByText(/Suppression bloquée/)).toBeInTheDocument();
        expect(within(dialog).getByText('Actus')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', {name: 'Supprimer'})).not.toBeInTheDocument();
    });
});
