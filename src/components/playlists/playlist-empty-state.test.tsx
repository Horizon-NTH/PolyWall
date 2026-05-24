import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PlaylistEmptyState } from '@/components/playlists/playlist-empty-state';

describe('PlaylistEmptyState', () => {
    it('renders default content and create link', () => {
        render(<PlaylistEmptyState />);

        expect(screen.getByText('Aucune playlist')).toBeInTheDocument();
        expect(
            screen.getByText('Créez une playlist pour organiser et diffuser vos médias.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Créer une playlist'})).toHaveAttribute(
            'href',
            '/dashboard/playlists/new',
        );
    });

    it('supports custom create href', () => {
        render(<PlaylistEmptyState createHref="/dashboard/playlists/new?source=test" />);

        expect(screen.getByRole('link', {name: 'Créer une playlist'})).toHaveAttribute(
            'href',
            '/dashboard/playlists/new?source=test',
        );
    });
});
