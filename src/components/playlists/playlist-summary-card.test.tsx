import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PlaylistSummaryCard } from '@/components/playlists/playlist-summary-card';
import { formatDate } from '@/lib/utils';

describe('PlaylistSummaryCard', () => {
    it('renders playlist metrics and dates', () => {
        const createdAt = '2026-02-01T12:00:00.000Z';
        const updatedAt = '2026-02-03T12:00:00.000Z';

        render(
            <PlaylistSummaryCard
                description="Diffusion écran accueil"
                mediaCount={4}
                totalDurationSeconds={3723}
                inactiveMediaCount={2}
                createdAt={createdAt}
                updatedAt={updatedAt}
            />,
        );

        expect(screen.getByText('Informations')).toBeInTheDocument();
        expect(screen.getByText('Résumé de la playlist et de sa timeline.')).toBeInTheDocument();
        expect(screen.getByText('Diffusion écran accueil')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('1:02:03')).toBeInTheDocument();

        const inactiveCount = screen.getByText('2');
        expect(inactiveCount).toHaveClass('text-amber-700');
        expect(screen.getByText(formatDate(new Date(createdAt)))).toBeInTheDocument();
        expect(screen.getByText(formatDate(new Date(updatedAt)))).toBeInTheDocument();
    });

    it('uses success color when there are no inactive media', () => {
        render(
            <PlaylistSummaryCard
                description="Playlist info"
                mediaCount={1}
                totalDurationSeconds={60}
                inactiveMediaCount={0}
                createdAt="2026-02-01T12:00:00.000Z"
                updatedAt="2026-02-01T12:00:00.000Z"
            />,
        );

        expect(screen.getByText('0')).toHaveClass('text-emerald-600');
    });
});
