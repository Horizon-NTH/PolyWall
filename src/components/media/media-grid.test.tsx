import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { MediaGrid } from '@/components/media/media-grid';

const refreshMock = vi.fn();
const toggleMediaItemActiveMock = vi.fn();
const deleteMediaItemMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
    }),
    usePathname: () => '/dashboard/administrators',
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/media-actions', () => ({
    toggleMediaItemActive: (...args: unknown[]) => toggleMediaItemActiveMock(...args),
    deleteMediaItem: (...args: unknown[]) => deleteMediaItemMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: vi.fn(),
    },
}));

describe('MediaGrid', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        toggleMediaItemActiveMock.mockReset();
        deleteMediaItemMock.mockReset();
        toastSuccessMock.mockReset();
    });

    const data = [
        {
            id: 'media-1',
            title: 'Affiche Hall',
            description: 'Visuel principal',
            active: true,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
            kind: 'image' as const,
            status: 'READY' as const,
            thumbUrl: null,
            sizeBytes: 1024,
        },
        {
            id: 'media-2',
            title: 'Vidéo Event',
            description: 'Clip promo',
            active: false,
            createdAt: '2026-01-02T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
            kind: 'video' as const,
            status: 'PROCESSING' as const,
            thumbUrl: null,
            sizeBytes: 2048,
        },
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
            expect(toastSuccessMock).toHaveBeenCalledWith('Média désactivé.');
            expect(refreshMock).toHaveBeenCalled();
        });
    });
});
