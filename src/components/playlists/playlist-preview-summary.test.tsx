import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlaylistPreviewSummary } from '@/components/playlists/playlist-preview-summary';

vi.mock('next/image', () => ({
    __esModule: true,
    default: ({
        fill: _fill = undefined,
        unoptimized: _unoptimized = undefined,
        ...props
    }: React.ComponentProps<'img'> & {fill?: boolean; unoptimized?: boolean}) => {
        void _fill;
        void _unoptimized;
        return <img {...props} alt={props.alt ?? ''} />;
    },
}));

describe('PlaylistPreviewSummary', () => {
    it('renders thumbnails, overflow count, and a title link', () => {
        render(
            <PlaylistPreviewSummary
                name="Playlist accueil"
                mediaCount={5}
                totalDurationLabel="1:40"
                titleLink="/dashboard/playlists/playlist-1"
                previewItems={[
                    {thumbUrl: 'https://example.com/a.png'},
                    {thumbUrl: null},
                    {thumbUrl: 'https://example.com/c.png'},
                ]}
            />,
        );

        expect(screen.getByRole('link', {name: 'Playlist accueil'})).toHaveAttribute(
            'href',
            '/dashboard/playlists/playlist-1',
        );
        expect(document.querySelectorAll('img')).toHaveLength(2);
        expect(screen.getByText('Aperçu')).toBeInTheDocument();
        expect(screen.getByText('+2')).toBeInTheDocument();
        expect(screen.getByText('5 médias · 1:40')).toBeInTheDocument();
    });

    it('renders the empty state and singular media label', () => {
        render(
            <PlaylistPreviewSummary
                name="Playlist vide"
                mediaCount={1}
                totalDurationLabel="0:30"
                previewItems={[]}
                size="sm"
            />,
        );

        expect(screen.getByText('Vide')).toBeInTheDocument();
        expect(screen.getByText('1 média · 0:30')).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: 'Playlist vide'})).not.toBeInTheDocument();
    });
});
