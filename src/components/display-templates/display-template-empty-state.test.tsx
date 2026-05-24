import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DisplayTemplateEmptyState } from '@/components/display-templates/display-template-empty-state';

describe('DisplayTemplateEmptyState', () => {
    it('renders default content and create link', () => {
        render(<DisplayTemplateEmptyState />);

        expect(screen.getByText('Aucun modèle d\'affichage')).toBeInTheDocument();
        expect(
            screen.getByText('Créez un modèle pour structurer les zones médias, widgets et contenus statiques.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'Créer un modèle'})).toHaveAttribute(
            'href',
            '/dashboard/display-templates/new',
        );
    });

    it('hides create link in read-only mode', () => {
        render(<DisplayTemplateEmptyState canCreate={false} />);

        expect(screen.getByText('Aucun modèle d\'affichage')).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: 'Créer un modèle'})).not.toBeInTheDocument();
    });
});
