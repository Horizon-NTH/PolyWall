import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { PlaylistDeleteDialog } from '@/components/playlists/playlist-delete-dialog';

describe('PlaylistDeleteDialog', () => {
    it('renders impacted schedules and confirms deletion', () => {
        const onConfirm = vi.fn();

        render(
            <PlaylistDeleteDialog
                open={true}
                impactedSchedules={[
                    {
                        id: 'schedule-1',
                        typeLabel: 'Récurrente',
                        dateLabel: 'Toujours active',
                        timeLabel: '08:00 - 10:00',
                    },
                    {
                        id: 'schedule-2',
                        typeLabel: 'Événementielle',
                        dateLabel: '7 avr. 2026',
                        timeLabel: '09:00 - 17:00',
                    },
                ]}
                onConfirm={onConfirm}
                title="Supprimer Playlist Actus ?"
            />,
        );

        const dialog = screen.getByRole('alertdialog');
        expect(within(dialog).getByText('Supprimer Playlist Actus ?')).toBeInTheDocument();
        expect(within(dialog).getByText(/2 programmations seront aussi supprimées/)).toBeInTheDocument();
        expect(within(dialog).getByText('Récurrente')).toBeInTheDocument();
        expect(within(dialog).getByText('Événementielle')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Supprimer'}));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
