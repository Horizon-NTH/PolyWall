import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { MediaActionsCard } from '@/components/media/media-actions-card';

const refreshMock = vi.fn();
const replaceMock = vi.fn();
const toggleMediaItemActiveMock = vi.fn();
const deleteMediaItemMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: refreshMock,
        replace: replaceMock,
    }),
}));

vi.mock('@/actions/media-actions', () => ({
    toggleMediaItemActive: (...args: unknown[]) => toggleMediaItemActiveMock(...args),
    deleteMediaItem: (...args: unknown[]) => deleteMediaItemMock(...args),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('MediaActionsCard', () => {
    beforeEach(() => {
        refreshMock.mockReset();
        replaceMock.mockReset();
        toggleMediaItemActiveMock.mockReset();
        deleteMediaItemMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('toggles media state and refreshes page on success', async () => {
        toggleMediaItemActiveMock.mockResolvedValueOnce({ok: true});

        render(<MediaActionsCard mediaItemId="media-1" mediaTitle="Affiche Hall" isActive={true} />);

        fireEvent.click(screen.getByRole('button', {name: 'Désactiver'}));

        await waitFor(() => {
            expect(toggleMediaItemActiveMock).toHaveBeenCalledWith('media-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Média désactivé.');
            expect(refreshMock).toHaveBeenCalled();
        });
    });

    it('shows error toast when toggle fails', async () => {
        toggleMediaItemActiveMock.mockResolvedValueOnce({ok: false, message: 'Accès refusé.'});

        render(<MediaActionsCard mediaItemId="media-1" mediaTitle="Affiche Hall" isActive={false} />);

        fireEvent.click(screen.getByRole('button', {name: 'Activer'}));

        await waitFor(() => {
            expect(toastErrorMock).toHaveBeenCalledWith('Accès refusé.');
            expect(refreshMock).not.toHaveBeenCalled();
        });
    });

    it('deletes media and redirects to media list', async () => {
        deleteMediaItemMock.mockResolvedValueOnce({ok: true});

        render(<MediaActionsCard mediaItemId="media-1" mediaTitle="Affiche Hall" isActive={true} />);

        fireEvent.click(screen.getByRole('button', {name: 'Supprimer'}));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));

        await waitFor(() => {
            expect(deleteMediaItemMock).toHaveBeenCalledWith('media-1');
            expect(toastSuccessMock).toHaveBeenCalledWith('Média supprimé.');
            expect(replaceMock).toHaveBeenCalledWith('/dashboard/media');
        });
    });
});
