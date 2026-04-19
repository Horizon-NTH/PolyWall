import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { MediaDeleteDialog } from '@/components/media/media-delete-dialog';

describe('MediaDeleteDialog', () => {
    it('allows deletion when media is unused', () => {
        const onConfirm = vi.fn();

        render(
            <MediaDeleteDialog
                open={true}
                playlistUsage={{count: 0, playlistNames: []}}
                onConfirm={onConfirm}
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText(/Le média, son original et ses variantes seront supprimés/)).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('blocks deletion when media is still used in playlists', () => {
        const onConfirm = vi.fn();

        render(
            <MediaDeleteDialog
                open={true}
                playlistUsage={{count: 2, playlistNames: ['Actus', 'Événements']}}
                onConfirm={onConfirm}
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText(/Suppression bloquée/)).toBeInTheDocument();
        expect(within(dialog).getByText('Actus')).toBeInTheDocument();
        expect(within(dialog).getByText('Événements')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', {name: 'Supprimer'})).not.toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Fermer'}));
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
