import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MediaEmptyState } from '@/components/media/media-empty-state';

describe('MediaEmptyState', () => {
    it('renders default content and create link', () => {
        render(<MediaEmptyState />);

        expect(screen.getByText('Aucun média')).toBeInTheDocument();
        expect(
            screen.getByText('Commencez par importer un média pour alimenter votre bibliothèque.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Créer un média'})).toHaveAttribute(
            'href',
            '/dashboard/media/new',
        );
    });

    it('supports custom create href', () => {
        render(<MediaEmptyState createHref="/dashboard/media/new?source=test" />);

        expect(screen.getByRole('link', {name: 'Créer un média'})).toHaveAttribute(
            'href',
            '/dashboard/media/new?source=test',
        );
    });
});
